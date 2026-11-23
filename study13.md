# study13 — 외부 서비스 연동

## ① 목표 한 줄

결제·메일·파일·OAuth를 서버 경계 안에서 안전하게 연결한다.

이 문서는 SvelteKit 하나만 다룬다. 실행 코드: `ts_version/project`·`js_version/project`, 기초 SSR 기존 예제는 `*/demo`다. TypeScript 전체 코드를 싣고 JavaScript는 같은 상대 위치의 `.js`·타입 없는 script로 제공한다. 프로젝트의 심화 기능은 뒤 단계를 위해 미리 존재하지만 해당 단계의 원리와 파일부터 순서대로 학습한다.

## ② 📖 이론

외부 서비스는 네트워크 실패·중복 요청·서명 확인이라는 새 경계를 만든다. 외부 결제 창에서 돌아왔다고 결제가 확정되는 것은 아니다. 주문서 원본을 확인하듯 공급자가 서명한 webhook을 검증하고 event id로 중복을 막아야 한다.

Stripe는 테스트 키만 허용하고 서버가 정한 price id를 사용한다. 결제 webhook은 파싱 전 원문을 constructEvent에 전달한다. 이 실습은 수신 영수증 저장까지만 수행하며 유료 권한 부여는 구현하지 않는다. Resend는 본인 계정의 이메일에 고정 안내문만 보내고 idempotency key를 사용한다. 발신 도메인 인증·API key는 공급자에서 준비한다.

업로드는 로그인 후 UTF-8 txt/md, 100KB 이하만 받는다. 파일명은 서버가 만들고 공개 static 폴더 밖에 저장한다. 다운로드도 소유자를 검사한다. OAuth는 state·PKCE·고정 callback·HttpOnly 단기 쿠키를 사용하며 GitHub provider id로 계정을 매핑한다. 확인되지 않은 이메일로 기존 계정을 자동 합치지 않는다.

## ③ 🛠️ 실기 — 전체 코드와 줄별 설명

1. `.env.example`에서 필요한 키 이름을 확인하고 테스트 계정 자격 증명만 로컬에 넣는다.
2. `/integrations`의 버튼은 로그인 계정을 사용한다. 설정이 없으면 503 NOT_CONFIGURED이며 성공을 꾸며내지 않는다.
3. Stripe CLI의 테스트 webhook을 `/api/integrations/webhook`으로 전달하고 같은 event가 한 번만 저장되는지 확인한다.
4. 작은 txt 파일을 올리고 반환 id로 `/api/files/:id`를 조회한다. 다른 계정은 읽을 수 없어야 한다.
5. GitHub OAuth callback을 `PUBLIC_ORIGIN/oauth/github`으로 등록한다. 토큰은 서버에서 교환하고 브라우저에는 앱 세션만 준다.

실행: 앱 루트에서 `npm ci` 후 `npm run dev`, 배포 산출물은 `npm run build` 후 `npm start`다. 환경 설정은 [study0](study0.md), 실행 결과와 범위는 [검증 기록](docs/verification.md)을 참고한다. 코드 블록은 실제 파일 원문이며 import된 의존 파일은 저장소에 함께 있다.



### `src/lib/server/course/integrations.ts` 전체 코드

[실제 파일](ts_version/project/src/lib/server/course/integrations.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
import Stripe from 'stripe';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
	RESEND_API_KEY,
	MAIL_FROM,
	STRIPE_SECRET_KEY,
	STRIPE_WEBHOOK_SECRET,
	STRIPE_PRICE_ID,
	PUBLIC_ORIGIN,
	UPLOAD_DIR
} from '$app/env/private';
import { ApiError, requireValue } from './errors.js';
import { storage } from './storage.js';
export async function mail(to: string, text: string, key: string, fetcher: typeof fetch = fetch) {
	requireValue(RESEND_API_KEY && MAIL_FROM, 503, 'NOT_CONFIGURED', '메일 설정이 필요합니다.');
	const response = await fetcher('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: 'Bearer ' + RESEND_API_KEY,
			'Content-Type': 'application/json',
			'Idempotency-Key': key
		},
		body: JSON.stringify({ from: MAIL_FROM, to: [to], subject: '소나무 게시판 알림', text }),
		signal: AbortSignal.timeout(10000)
	});
	requireValue(response.ok, 502, 'UPSTREAM_ERROR', '메일 공급자 요청이 실패했습니다.');
	return response.json();
}
export async function checkout(userId: number, key: string) {
	requireValue(
		STRIPE_SECRET_KEY && STRIPE_PRICE_ID,
		503,
		'NOT_CONFIGURED',
		'결제 설정이 필요합니다.'
	);
	requireValue(
		STRIPE_SECRET_KEY.startsWith('sk_test_'),
		503,
		'TEST_MODE_REQUIRED',
		'실습에서는 Stripe 테스트 키만 허용합니다.'
	);
	const stripe = new Stripe(STRIPE_SECRET_KEY);
	const session = await stripe.checkout.sessions.create(
		{
			mode: 'payment',
			line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
			metadata: { userId: String(userId) },
			success_url: PUBLIC_ORIGIN + '/integrations?checkout=returned',
			cancel_url: PUBLIC_ORIGIN + '/integrations'
		},
		{ idempotencyKey: userId + ':' + key }
	);
	return { url: session.url };
}
export async function webhook(request: Request) {
	requireValue(
		STRIPE_SECRET_KEY && STRIPE_WEBHOOK_SECRET,
		503,
		'NOT_CONFIGURED',
		'웹훅 설정이 필요합니다.'
	);
	let event: Stripe.Event;
	try {
		event = new Stripe(STRIPE_SECRET_KEY).webhooks.constructEvent(
			await request.text(),
			request.headers.get('stripe-signature') ?? '',
			STRIPE_WEBHOOK_SECRET
		);
	} catch {
		throw new ApiError(400, 'BAD_REQUEST', '웹훅 서명을 확인하세요.');
	}
	const db = await storage();
	if (!(await db.all('receipts')).some((r) => r.eventId === event.id)) {
		try {
			await db.insert('receipts', {
				eventId: event.id,
				payload: JSON.stringify({ type: event.type, object: event.data.object }),
				createdAt: new Date().toISOString()
			});
		} catch (error) {
			const dbError = error as { code?: string | number; message?: string };
			if (
				!['23505', 'ER_DUP_ENTRY'].includes(String(dbError.code)) &&
				dbError.code !== 11000 &&
				!String(dbError.message).includes('UNIQUE')
			)
				throw error;
		}
	}
	// Receipt persistence is deliberately the only effect; never grant a paid entitlement from a success URL.
	return { received: true };
}
export async function upload(file: File, userId: number) {
	requireValue(
		file.size > 0 && file.size <= 100000,
		413,
		'PAYLOAD_TOO_LARGE',
		'텍스트 파일은 1~100000바이트입니다.'
	);
	requireValue(
		/\.(txt|md)$/i.test(file.name),
		400,
		'VALIDATION_ERROR',
		'txt 또는 md만 허용합니다.'
	);
	const bytes = new Uint8Array(await file.arrayBuffer());
	let text: string;
	try {
		text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch {
		throw new ApiError(400, 'VALIDATION_ERROR', 'UTF-8 파일이 필요합니다.');
	}
	requireValue(!text.includes('\0'), 400, 'VALIDATION_ERROR', '바이너리 파일은 허용하지 않습니다.');
	const id = userId + '-' + randomUUID() + '.txt';
	await mkdir(resolve(UPLOAD_DIR), { recursive: true });
	await writeFile(join(resolve(UPLOAD_DIR), id), text, { flag: 'wx' });
	return { id, size: file.size };
}
export async function download(id: string, userId: number) {
	requireValue(
		new RegExp('^' + userId + '-[a-f0-9-]{36}\\.txt$').test(id),
		404,
		'NOT_FOUND',
		'파일을 찾을 수 없습니다.'
	);
	try {
		return await readFile(join(resolve(UPLOAD_DIR), id), 'utf-8');
	} catch {
		throw new ApiError(404, 'NOT_FOUND', '파일을 찾을 수 없습니다.');
	}
}
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `stripe`에서 필요한 함수·컴포넌트를 가져온다. |
| 2 | `node:fs/promises`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | `node:path`에서 필요한 함수·컴포넌트를 가져온다. |
| 4 | `node:crypto`에서 필요한 함수·컴포넌트를 가져온다. |
| 5 | 부작용 import로 스타일 또는 초기화를 적용한다. |
| 6 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 7 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 8 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 9 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 10 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 11 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 12 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 13 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 14 | `./errors.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 15 | `./storage.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 16 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 17 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 18 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 19 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 20 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 21 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 22 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 23 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 24 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 25 | 자료를 JSON 문자열로 직렬화해 저장·전송 경계에 맞춘다. |
| 26 | 취소 또는 제한 시간 신호를 전달해 끝나지 않는 외부 요청을 제한한다. |
| 27 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 28 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 29 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 30 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 31 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 32 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 33 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 34 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 35 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 36 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 37 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 38 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 39 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 40 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 41 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 42 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 43 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 44 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 45 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 46 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 47 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 48 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 49 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 50 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 51 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 52 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 53 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 54 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 55 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 56 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 57 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 58 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 59 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 60 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 61 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 62 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 63 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 64 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 65 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 66 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 67 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 68 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 69 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 70 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 71 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 72 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 73 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 74 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 75 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 76 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 77 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 78 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 79 | 자료를 JSON 문자열로 직렬화해 저장·전송 경계에 맞춘다. |
| 80 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 81 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 82 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 83 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 84 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 85 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 86 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 87 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 88 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 89 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 90 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 91 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 92 | 이어지는 코드의 제약 또는 의도를 설명하는 주석이다. |
| 93 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 94 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 95 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 96 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 97 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 98 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 99 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 100 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 101 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 102 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 103 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 104 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 105 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 106 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 107 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 108 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 109 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 110 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 111 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 112 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 113 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 114 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 115 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 116 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 117 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 118 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 119 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 120 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 121 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 122 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 123 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 124 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 125 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 126 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 127 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 128 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 129 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 130 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 131 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 132 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 133 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

### `src/routes/api/integrations/[kind]/+server.ts` 전체 코드

[실제 파일](ts_version/project/src/routes/api/integrations/[kind]/+server.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
import type { RequestHandler } from '@sveltejs/kit';
import { authorized } from '#lib/server/course/service.js';
import { ApiError, requireValue } from '#lib/server/course/errors.js';
import { apiError, jsonBody } from '#lib/server/course/http.js';
import { checkout, mail, upload, webhook } from '#lib/server/course/integrations.js';
export const POST: RequestHandler = async (event) => {
	try {
		if (event.params.kind === 'webhook') return Response.json(await webhook(event.request));
		const user = event.locals.member;
		authorized(user);
		if (event.params.kind === 'upload') {
			const length = Number(event.request.headers.get('content-length'));
			requireValue(
				length > 0 && length <= 120000,
				413,
				'PAYLOAD_TOO_LARGE',
				'업로드 요청은 120KB 이하입니다.'
			);
			const file = (await event.request.formData()).get('file');
			requireValue(file instanceof File, 400, 'VALIDATION_ERROR', 'file 필드가 필요합니다.');
			return Response.json({ data: await upload(file, user.id) }, { status: 201 });
		}
		const data = await jsonBody(event.request);
		requireValue(
			typeof data.key === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(data.key),
			400,
			'VALIDATION_ERROR',
			'8~80자의 중복 방지 key가 필요합니다.'
		);
		if (event.params.kind === 'checkout')
			return Response.json({ data: await checkout(user.id, data.key) });
		if (event.params.kind === 'mail')
			return Response.json({
				data: await mail(user.email, '게시판 연결 확인 메일입니다.', user.id + ':' + data.key)
			});
		throw new ApiError(404, 'NOT_FOUND', '연동 경로를 찾을 수 없습니다.');
	} catch (error) {
		return apiError(error, event);
	}
};
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `@sveltejs/kit`에서 필요한 타입만 가져와 실행 번들에 넣지 않는다. |
| 2 | `#lib/server/course/service.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | `#lib/server/course/errors.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 4 | `#lib/server/course/http.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 5 | `#lib/server/course/integrations.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 6 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 7 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 8 | JSON HTTP 응답을 만든다. status·headers와 본문 계약을 함께 확인한다. |
| 9 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 10 | 로그인한 사용자임을 서버에서 확인한 뒤 쓰기·개인 데이터 접근을 허용한다. |
| 11 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 12 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 13 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 14 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 15 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 16 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 17 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 18 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 19 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 20 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 21 | JSON HTTP 응답을 만든다. status·headers와 본문 계약을 함께 확인한다. |
| 22 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 23 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 24 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 25 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 26 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 27 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 28 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 29 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 30 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 31 | JSON HTTP 응답을 만든다. status·headers와 본문 계약을 함께 확인한다. |
| 32 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 33 | JSON HTTP 응답을 만든다. status·headers와 본문 계약을 함께 확인한다. |
| 34 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 35 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 36 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 37 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 38 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 39 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 40 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

### `src/routes/oauth/github/+server.ts` 전체 코드

[실제 파일](ts_version/project/src/routes/oauth/github/+server.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
import { redirect, type RequestHandler } from '@sveltejs/kit';
import { randomBytes, createHash } from 'node:crypto';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, PUBLIC_ORIGIN } from '$app/env/private';
import { storage } from '#lib/server/course/storage.js';
import { createSession, publicUser } from '#lib/server/course/service.js';
import { requireValue } from '#lib/server/course/errors.js';
import { apiError } from '#lib/server/course/http.js';
export const GET: RequestHandler = async (event) => {
	const { cookies, url } = event;
	let destination: string;
	try {
		requireValue(
			GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET,
			503,
			'NOT_CONFIGURED',
			'GitHub OAuth 앱 설정이 필요합니다.'
		);
		const options = {
			path: '/oauth/github',
			httpOnly: true,
			sameSite: 'lax' as const,
			secure: url.protocol === 'https:',
			maxAge: 600
		};
		const callback = PUBLIC_ORIGIN + '/oauth/github';
		if (!url.searchParams.has('code')) {
			const state = randomBytes(24).toString('base64url'),
				verifier = randomBytes(32).toString('base64url');
			cookies.set('oauth_state', state, options);
			cookies.set('oauth_verifier', verifier, options);
			destination =
				'https://github.com/login/oauth/authorize?' +
				new URLSearchParams({
					client_id: GITHUB_CLIENT_ID,
					redirect_uri: callback,
					state,
					code_challenge: createHash('sha256').update(verifier).digest('base64url'),
					code_challenge_method: 'S256',
					scope: 'read:user'
				});
		} else {
			const verifier = cookies.get('oauth_verifier'),
				state = cookies.get('oauth_state');
			cookies.delete('oauth_state', { path: options.path });
			cookies.delete('oauth_verifier', { path: options.path });
			requireValue(
				state && state === url.searchParams.get('state') && verifier,
				400,
				'BAD_REQUEST',
				'OAuth state를 확인하세요.'
			);
			const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
				method: 'POST',
				headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
				body: JSON.stringify({
					client_id: GITHUB_CLIENT_ID,
					client_secret: GITHUB_CLIENT_SECRET,
					code: url.searchParams.get('code'),
					redirect_uri: callback,
					code_verifier: verifier
				}),
				signal: AbortSignal.timeout(10000)
			});
			const token = await tokenResponse.json();
			requireValue(
				tokenResponse.ok && token.access_token,
				502,
				'UPSTREAM_ERROR',
				'OAuth 토큰 교환 실패'
			);
			const response = await fetch('https://api.github.com/user', {
				headers: {
					Authorization: 'Bearer ' + token.access_token,
					Accept: 'application/vnd.github+json',
					'User-Agent': 'SvelteKitStudy'
				},
				signal: AbortSignal.timeout(10000)
			});
			const profile = await response.json();
			requireValue(
				response.ok && Number.isInteger(profile.id),
				502,
				'UPSTREAM_ERROR',
				'OAuth 사용자 조회 실패'
			);
			const db = await storage(),
				email = 'github-' + profile.id + '@oauth.invalid';
			// A provider-specific identifier avoids linking accounts by an unverified email.
			let row = (await db.all('members')).find((u) => u.email === email);
			if (!row)
				row = await db.insert('members', {
					email,
					nickname: String(profile.login).slice(0, 80),
					passwordHash: 'oauth-only',
					createdAt: new Date().toISOString()
				});
			const session = await createSession(publicUser(row));
			cookies.set('course_session', session.accessToken, { ...options, path: '/', maxAge: 3600 });
			destination = '/board';
		}
	} catch (error) {
		return apiError(error, event);
	}
	redirect(303, destination);
};
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `@sveltejs/kit`에서 필요한 함수·컴포넌트를 가져온다. |
| 2 | `node:crypto`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | `$app/env/private`에서 필요한 함수·컴포넌트를 가져온다. |
| 4 | `#lib/server/course/storage.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 5 | `#lib/server/course/service.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 6 | `#lib/server/course/errors.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 7 | `#lib/server/course/http.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 8 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 9 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 10 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 11 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 12 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 13 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 14 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 15 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 16 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 17 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 18 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 19 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 20 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 21 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 22 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 23 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 24 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 25 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 26 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 27 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 28 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 29 | 브라우저 세션 쿠키를 설정한다. path·HttpOnly·SameSite·Secure 수명을 함께 관리한다. |
| 30 | 브라우저 세션 쿠키를 설정한다. path·HttpOnly·SameSite·Secure 수명을 함께 관리한다. |
| 31 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 32 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 33 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 34 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 35 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 36 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 37 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 38 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 39 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 40 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 41 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 42 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 43 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 44 | 설정한 path와 같은 경로의 쿠키를 삭제한다. |
| 45 | 설정한 path와 같은 경로의 쿠키를 삭제한다. |
| 46 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 47 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 48 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 49 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 50 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 51 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 52 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 53 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 54 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 55 | 자료를 JSON 문자열로 직렬화해 저장·전송 경계에 맞춘다. |
| 56 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 57 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 58 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 59 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 60 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 61 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 62 | 취소 또는 제한 시간 신호를 전달해 끝나지 않는 외부 요청을 제한한다. |
| 63 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 64 | JSON HTTP 응답을 만든다. status·headers와 본문 계약을 함께 확인한다. |
| 65 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 66 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 67 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 68 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 69 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 70 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 71 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 72 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 73 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 74 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 75 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 76 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 77 | 취소 또는 제한 시간 신호를 전달해 끝나지 않는 외부 요청을 제한한다. |
| 78 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 79 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 80 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 81 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 82 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 83 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 84 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 85 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 86 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 87 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 88 | 이어지는 코드의 제약 또는 의도를 설명하는 주석이다. |
| 89 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 90 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 91 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 92 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 93 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 94 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 95 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 96 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 97 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 98 | 브라우저 세션 쿠키를 설정한다. path·HttpOnly·SameSite·Secure 수명을 함께 관리한다. |
| 99 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 100 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 101 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 102 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 103 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 104 | HTTP 리다이렉트로 다음 URL을 열고 현재 요청 처리를 끝낸다. |
| 105 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

## ④ 🔗 연동 포인트

파일의 텍스트를 study18의 질문 입력으로 사용할 수 있다. 메일은 study15 백그라운드 작업으로 넘긴다. 외부 실호출은 자격 증명을 준비한 뒤 별도 점검하며 코드·mock 결과와 구분한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| Stripe 서명 오류 | JSON 파싱 후 다시 직렬화한 본문 사용 | request.text 원문으로 검증 |
| OAuth state 불일치 | 쿠키 만료·다른 callback·재사용 | 고정 origin·단기 쿠키·일회성 state 확인 |
| 메일 503 | 키 또는 발신 주소 미설정 | 테스트 공급자 설정 후 서버 재시작 |

## ⑥ 직접 해보기

1. 변조한 webhook 서명이 400인지 확인하자.
2. 다른 계정으로 파일 URL을 열자.
3. 설정이 없을 때 오류 메시지를 사용자에게 표시하자.

## ⑦ ☐ 체크리스트

- [ ] 테스트 결제·서명·중복 영수증
- [ ] 메일·타임아웃·중복키
- [ ] 파일 크기·UTF-8·소유권
- [ ] OAuth state·PKCE·callback

## ⑧ 다음 단계 연결 문장

이 단계의 결과를 [study14](study14.md)에 연결한다. 외부 실호출은 자격 증명을 준비한 뒤 별도 점검하며 코드·mock 결과와 구분한다.

공식 자료: [SvelteKit 문서](https://svelte.dev/docs/kit). 상세 출처는 [README](README.md)의 공식 자료와 노션 원문 링크를 따른다.
