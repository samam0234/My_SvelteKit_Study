# study8 — 구조화·재사용

## ① 목표 한 줄

UI·계약·서버 규칙·저장소를 나누고 개발·운영 설정을 분리한다.

이 문서는 SvelteKit 하나만 다룬다. 실행 코드: `ts_version/project`·`js_version/project`, 기초 SSR 기존 예제는 `*/demo`다. TypeScript 전체 코드를 싣고 JavaScript는 같은 상대 위치의 `.js`·타입 없는 script로 제공한다. 프로젝트의 심화 기능은 뒤 단계를 위해 미리 존재하지만 해당 단계의 원리와 파일부터 순서대로 학습한다.

## ② 📖 이론

라우트 파일은 입출력, service는 업무 규칙, storage는 저장 동작, schema는 공유 계약이다. 같은 검증을 화면·action·API에서 복사하면 한쪽만 바뀐다. 전기 배선을 벽 속에 모으듯 비밀은 server 폴더에 모으고 공개 schema만 클라이언트에 허용한다.

`#lib/course/schema.js`는 브라우저에서도 쓸 수 있지만 `#lib/server/course/storage.js`는 서버 전용이다. TypeScript 파일을 import할 때 이 저장소의 모듈 규칙에 따라 `.js` 확장자를 쓴다. SvelteKit 3의 env 선언은 사용할 변수와 기본값을 검증하는 문서 역할도 한다.

개발은 로컬 SQLite·HTTP, 심화 운영 예시는 PostgreSQL·HTTPS·비밀 주입으로 구성한다. `.env.example`는 필요한 이름만 공유하고 진짜 값은 GitHub secrets·호스팅 설정에 넣는다. 빌드 시 공개 정적 변수는 번들에 들어갈 수 있으므로 비밀을 public으로 지정하지 않는다.

## ③ 🛠️ 실기 — 전체 코드와 줄별 설명

1. schema→service→storage의 import 방향을 따라 읽는다.
2. publicUser는 응답 필드를 명시해 해시 유출을 막는다.
3. apiError는 내부 예외를 서버 로그에만 기록하고 클라이언트에는 INTERNAL을 반환한다.
4. `DB_KIND`와 `DATABASE_URL`만 바꿔도 UI와 API가 같은 계약을 유지하도록 설계한다.
5. 개발 기본값을 운영 비밀로 오인하지 말고 `.env.example`의 모든 replace 값을 운영 설정에서 대체한다.

실행: 앱 루트에서 `npm ci` 후 `npm run dev`, 배포 산출물은 `npm run build` 후 `npm start`다. 환경 설정은 [study0](study0.md), 실행 결과와 범위는 [검증 기록](docs/verification.md)을 참고한다. 코드 블록은 실제 파일 원문이며 import된 의존 파일은 저장소에 함께 있다.



### `src/lib/server/course/http.ts` 전체 코드

[실제 파일](ts_version/project/src/lib/server/course/http.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
import type { RequestEvent } from '@sveltejs/kit';
import { ApiError } from './errors.js';
export async function jsonBody(request: Request) {
	if (!request.headers.get('content-type')?.includes('application/json'))
		throw new ApiError(400, 'BAD_REQUEST', 'JSON 본문이 필요합니다.');
	const text = await request.text();
	if (Buffer.byteLength(text) > 65536)
		throw new ApiError(413, 'PAYLOAD_TOO_LARGE', '64KB 이하로 입력하세요.');
	try {
		return JSON.parse(text);
	} catch {
		throw new ApiError(400, 'BAD_REQUEST', 'JSON 문법을 확인하세요.');
	}
}
export function apiError(error: unknown, event: RequestEvent) {
	const known = error instanceof ApiError;
	if (!known)
		console.error(
			JSON.stringify({
				requestId: event.locals.requestId,
				error: String(error),
				path: event.url.pathname
			})
		);
	return Response.json(
		{
			error: {
				code: known ? error.code : 'INTERNAL',
				message: known ? error.message : '서버 오류가 발생했습니다.',
				fields: known ? error.fields : {},
				requestId: event.locals.requestId
			}
		},
		{ status: known ? error.status : 500 }
	);
}
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `@sveltejs/kit`에서 필요한 타입만 가져와 실행 번들에 넣지 않는다. |
| 2 | `./errors.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 4 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 5 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 6 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 7 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 8 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 9 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 10 | 문자열 JSON을 자료로 변환한다. 스트림에서는 완성된 줄인지 먼저 확인해야 한다. |
| 11 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 12 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 13 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 14 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 15 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 16 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 17 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 18 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 19 | 자료를 JSON 문자열로 직렬화해 저장·전송 경계에 맞춘다. |
| 20 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 21 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 22 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 23 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 24 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 25 | JSON HTTP 응답을 만든다. status·headers와 본문 계약을 함께 확인한다. |
| 26 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 27 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 28 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 29 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 30 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 31 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 32 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 33 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 34 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 35 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 36 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

### `src/env.ts` 전체 코드

[실제 파일](ts_version/project/src/env.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	WORKER_SECRET: { schema: (value: string | undefined) => value || '' },
	DB_KIND: { schema: (value: string | undefined) => value || 'sqlite' },
	DATABASE_URL: { schema: (value: string | undefined) => value || 'file:data/board.sqlite' },
	CORS_ORIGIN: { schema: (value: string | undefined) => value || 'http://localhost:5173' },
	OLLAMA_URL: { schema: (value: string | undefined) => value || 'http://127.0.0.1:11434' },
	OLLAMA_MODEL: { schema: (value: string | undefined) => value || 'gemma4:12b' },
	AI_MODE: { schema: (value: string | undefined) => value || 'live' },
	RESEND_API_KEY: { schema: (value: string | undefined) => value || '' },
	MAIL_FROM: { schema: (value: string | undefined) => value || '' },
	STRIPE_SECRET_KEY: { schema: (value: string | undefined) => value || '' },
	STRIPE_WEBHOOK_SECRET: { schema: (value: string | undefined) => value || '' },
	STRIPE_PRICE_ID: { schema: (value: string | undefined) => value || '' },
	GITHUB_CLIENT_ID: { schema: (value: string | undefined) => value || '' },
	GITHUB_CLIENT_SECRET: { schema: (value: string | undefined) => value || '' },
	PUBLIC_ORIGIN: { schema: (value: string | undefined) => value || 'http://localhost:5173' },
	UPLOAD_DIR: { schema: (value: string | undefined) => value || 'data/uploads' },
	JWT_SECRET: {
		description: '세션 JWT 서명 비밀',
		schema: (value: string | undefined) => value || 'dev-only-change-me'
	},
	SITE_NAME: {
		public: true,
		static: true,
		description: '사이트 이름',
		schema: (value: string | undefined) => value || '소나무 게시판'
	}
});
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `@sveltejs/kit/env`에서 필요한 함수·컴포넌트를 가져온다. |
| 2 | 가독성을 위해 구간을 나누는 빈 줄이다. |
| 3 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 4 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 5 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 6 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 7 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 8 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 9 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 10 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 11 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 12 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 13 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 14 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 15 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 16 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 17 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 18 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 19 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 20 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 21 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 22 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 23 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 24 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 25 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 26 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 27 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 28 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 29 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 30 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

## ④ 🔗 연동 포인트

storage 인터페이스는 study11 DB 확장의 교체 지점이다. requestId는 study9 디버깅과 study16 운영 로그를 잇는다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| 비밀이 클라이언트 번들에 포함 | 환경변수를 public으로 선언 | 서버 전용 선언과 import 경계 확인 |
| 동일 규칙이 다르게 동작 | 폼·API에서 검증 코드를 복사 | schema와 service를 공유 |

## ⑥ 직접 해보기

1. 새 검증 규칙을 schema 한 곳에만 추가하자.
2. server 모듈을 화면에 import해 빌드가 막히는지 임시 확인 후 되돌리자.

## ⑦ ☐ 체크리스트

- [ ] 폴더 책임·import 방향 정리
- [ ] 개발·운영 환경 분리
- [ ] 공통 오류·검증 재사용

## ⑧ 다음 단계 연결 문장

이 단계의 결과를 [study9](study9.md)에 연결한다. requestId는 study9 디버깅과 study16 운영 로그를 잇는다.

공식 자료: [SvelteKit 문서](https://svelte.dev/docs/kit). 상세 출처는 [README](README.md)의 공식 자료와 노션 원문 링크를 따른다.
