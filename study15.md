# study15 — 성능·캐시

## ① 목표 한 줄

측정·캐시·비동기 작업의 수명과 일관성을 구분한다.

이 문서는 SvelteKit 하나만 다룬다. 실행 코드: `ts_version/project`·`js_version/project`, 기초 SSR 기존 예제는 `*/demo`다. TypeScript 전체 코드를 싣고 JavaScript는 같은 상대 위치의 `.js`·타입 없는 script로 제공한다. 프로젝트의 심화 기능은 뒤 단계를 위해 미리 존재하지만 해당 단계의 원리와 파일부터 순서대로 학습한다.

## ② 📖 이론

캐시는 다시 계산할 수 있는 결과를 잠시 보관한다. TTL은 보관 기한, 무효화는 원본 변경 후 폐기, single-flight는 같은 요청의 동시 계산을 합치는 것이다. 냉장고처럼 개인 식품과 공용 식품의 구획을 잘못 나누면 사용자 데이터가 새어 나간다. 인증 응답은 no-store로 두고 공개 자료에만 명시적으로 캐시를 붙인다.

ttlCache는 최대 항목 수·만료·실패 제거·중복 Promise 병합을 구현한다. 현재 회원·내 글 API에 자동 적용하지 않는다. 게시글 목록은 회원·댓글을 한 번씩 읽어 목록마다 반복 쿼리하는 N+1을 줄였다. 다만 작은 학습 DB를 가정해 전체 rows를 메모리에서 필터·정렬하므로 대량 데이터의 운영 최적화까지 끝난 것은 아니다. 이후 SQL WHERE·COUNT·LIMIT/OFFSET·인덱스로 내려야 한다.

백그라운드 메일은 receipts에 queued 작업을 저장하고 worker가 재시도한다. 공급자 idempotency key가 재전송 중복을 줄인다. 프로세스 내 running은 단일 인스턴스 전용이다. 여러 웹 인스턴스에는 원자적 lease·SKIP LOCKED 또는 전문 queue를 도입해야 한다. 응답 후 setTimeout만 두는 방식은 서버 종료 때 작업을 잃는다.

## ③ 🛠️ 실기 — 전체 코드와 줄별 설명

1. `npm run measure`로 30번 순차 요청의 median·p95를 기록한다. 로컬 HTTP 수치와 Lighthouse/CWV를 혼동하지 않는다.
2. 캐시 단위 테스트로 동시 요청 병합·실패 제거·무효화를 확인한다.
3. `POST /api/jobs`는 로그인 본인에게 보낼 고정 알림 작업을 202로 수락한다.
4. WORKER_SECRET 32자 이상을 설정하고 단일 `npm run worker`를 실행한다. 작업은 최대 3회 시도하며 실패 상태를 DB에서 확인한다.
5. 여러 인스턴스 운영 전 DB 측 페이지네이션과 원자적 작업 claim을 구현하고 부하 시험한다.

실행: 앱 루트에서 `npm ci` 후 `npm run dev`, 배포 산출물은 `npm run build` 후 `npm start`다. 환경 설정은 [study0](study0.md), 실행 결과와 범위는 [검증 기록](docs/verification.md)을 참고한다. 코드 블록은 실제 파일 원문이며 import된 의존 파일은 저장소에 함께 있다.



### `src/lib/server/course/cache.ts` 전체 코드

[실제 파일](ts_version/project/src/lib/server/course/cache.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
// Public data only. Never put a user's session or private document in this cache.
export function ttlCache<T>(ttlMs: number, maxEntries = 100) {
	const values = new Map<string, { expires: number; value: Promise<T> }>();
	return {
		get(key: string, load: () => Promise<T>) {
			const hit = values.get(key);
			if (hit && hit.expires > Date.now()) return hit.value;
			if (values.size >= maxEntries) values.delete(values.keys().next().value!);
			const value = load().catch((error) => {
				values.delete(key);
				throw error;
			});
			values.set(key, { value, expires: Date.now() + ttlMs });
			return value;
		},
		clear() {
			values.clear();
		}
	};
}
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | 이어지는 코드의 제약 또는 의도를 설명하는 주석이다. |
| 2 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 3 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 4 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 5 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 6 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 7 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 8 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 9 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 10 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 11 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 12 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 13 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 14 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 15 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 16 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 17 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 18 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 19 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 20 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

### `src/routes/api/jobs/+server.ts` 전체 코드

[실제 파일](ts_version/project/src/routes/api/jobs/+server.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
import type { RequestHandler } from '@sveltejs/kit';
import { WORKER_SECRET } from '$app/env/private';
import { storage } from '#lib/server/course/storage.js';
import { mail } from '#lib/server/course/integrations.js';
import { authorized } from '#lib/server/course/service.js';
import { requireValue } from '#lib/server/course/errors.js';
import { apiError } from '#lib/server/course/http.js';
let running = false;
export const POST: RequestHandler = async (event) => {
	try {
		const user = event.locals.member;
		authorized(user);
		const id = 'mail-job:' + crypto.randomUUID();
		await (
			await storage()
		).insert('receipts', {
			eventId: id,
			payload: JSON.stringify({ to: user.email, status: 'queued', attempts: 0 }),
			createdAt: new Date().toISOString()
		});
		return Response.json({ data: { id } }, { status: 202 });
	} catch (error) {
		return apiError(error, event);
	}
};
export const PATCH: RequestHandler = async (event) => {
	try {
		requireValue(
			WORKER_SECRET.length >= 32 && event.request.headers.get('x-worker-secret') === WORKER_SECRET,
			403,
			'FORBIDDEN',
			'작업자 인증 실패'
		);
		if (running) return Response.json({ data: { busy: true } });
		running = true;
		try {
			const db = await storage();
			for (const row of (await db.all('receipts')).filter((r) =>
				r.eventId.startsWith('mail-job:')
			)) {
				const job = JSON.parse(row.payload);
				if (job.status === 'done' || job.attempts >= 3) continue;
				try {
					await mail(job.to, '백그라운드 작업 알림', row.eventId);
					job.status = 'done';
				} catch {
					job.attempts++;
					job.status = job.attempts >= 3 ? 'failed' : 'queued';
				}
				await db.patch('receipts', row.id, { payload: JSON.stringify(job) });
			}
			return Response.json({ data: { processed: true } });
		} finally {
			running = false;
		}
	} catch (error) {
		return apiError(error, event);
	}
};
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `@sveltejs/kit`에서 필요한 타입만 가져와 실행 번들에 넣지 않는다. |
| 2 | `$app/env/private`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | `#lib/server/course/storage.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 4 | `#lib/server/course/integrations.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 5 | `#lib/server/course/service.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 6 | `#lib/server/course/errors.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 7 | `#lib/server/course/http.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 8 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 9 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 10 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 11 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 12 | 로그인한 사용자임을 서버에서 확인한 뒤 쓰기·개인 데이터 접근을 허용한다. |
| 13 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 14 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 15 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 16 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 17 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 18 | 자료를 JSON 문자열로 직렬화해 저장·전송 경계에 맞춘다. |
| 19 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 20 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 21 | JSON HTTP 응답을 만든다. status·headers와 본문 계약을 함께 확인한다. |
| 22 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 23 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 24 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 25 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 26 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 27 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 28 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 29 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 30 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 31 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 32 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 33 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 34 | JSON HTTP 응답을 만든다. status·headers와 본문 계약을 함께 확인한다. |
| 35 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 36 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 37 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 38 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 39 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 40 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 41 | 문자열 JSON을 자료로 변환한다. 스트림에서는 완성된 줄인지 먼저 확인해야 한다. |
| 42 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 43 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 44 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 45 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 46 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 47 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 48 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 49 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 50 | 자료를 JSON 문자열로 직렬화해 저장·전송 경계에 맞춘다. |
| 51 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 52 | JSON HTTP 응답을 만든다. status·headers와 본문 계약을 함께 확인한다. |
| 53 | 성공·실패와 관계없이 제출 잠금 또는 연결 자원을 정리한다. |
| 54 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 55 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 56 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 57 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 58 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 59 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

### `scripts/worker.mjs` 전체 코드

[실제 파일](ts_version/project/scripts/worker.mjs) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```js
const base = process.env.BOARD_ORIGIN || 'http://127.0.0.1:3000';
if ((process.env.WORKER_SECRET || '').length < 32) throw new Error('WORKER_SECRET 32자 이상 필요');
async function tick() {
	try {
		const response = await fetch(base + '/api/jobs', {
			method: 'PATCH',
			headers: { 'x-worker-secret': process.env.WORKER_SECRET, 'content-type': 'application/json' },
			signal: AbortSignal.timeout(30000)
		});
		console.log(JSON.stringify({ worker: response.status }));
	} catch (error) {
		console.error(String(error));
	}
}
await tick();
setInterval(tick, 10000);
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 2 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 3 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 4 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 5 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 6 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 7 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 8 | 취소 또는 제한 시간 신호를 전달해 끝나지 않는 외부 요청을 제한한다. |
| 9 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 10 | 자료를 JSON 문자열로 직렬화해 저장·전송 경계에 맞춘다. |
| 11 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 12 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 13 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 14 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 15 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 16 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |

### `scripts/measure.mjs` 전체 코드

[실제 파일](ts_version/project/scripts/measure.mjs) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```js
import { performance } from 'node:perf_hooks';
const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
const durations = [];
for (let i = 0; i < 30; i++) {
	const start = performance.now();
	const response = await fetch(base + '/api/posts?limit=10');
	if (!response.ok) throw new Error('HTTP ' + response.status);
	await response.arrayBuffer();
	durations.push(performance.now() - start);
}
durations.sort((a, b) => a - b);
console.log(
	JSON.stringify({
		samples: 30,
		medianMs: durations[15],
		p95Ms: durations[28],
		note: '로컬 순차 HTTP 측정. Lighthouse/CWV 또는 부하 시험 결과가 아님.'
	})
);
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `node:perf_hooks`에서 필요한 함수·컴포넌트를 가져온다. |
| 2 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 3 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 4 | 모음 또는 스트림의 항목을 순서대로 처리한다. |
| 5 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 6 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 7 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 8 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 9 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 10 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 11 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 12 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 13 | 자료를 JSON 문자열로 직렬화해 저장·전송 경계에 맞춘다. |
| 14 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 15 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 16 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 17 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 18 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 19 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

## ④ 🔗 연동 포인트

requestId·duration 로그는 최적화 전후 근거다. study16은 이 로그를 수집하고 배포·백업의 복구 가능성을 확인한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| 다른 사용자 결과가 캐시됨 | 사용자별 데이터를 공용 키에 저장 | 개인 데이터 no-store 또는 사용자 키 격리 |
| 작업이 중복 수행됨 | 다중 인스턴스에 프로세스 락만 사용 | DB 원자 claim·idempotency key·단일 worker 제한 |

## ⑥ 직접 해보기

1. 캐시 TTL을 짧게 바꾸고 만료 후 호출 횟수를 확인하자.
2. 원본 갱신 뒤 clear를 누락했을 때 stale 데이터를 재현하자.
3. PostgreSQL EXPLAIN으로 SQL 페이지네이션 개선안을 작성하자.

## ⑦ ☐ 체크리스트

- [ ] 측정 근거·캐시 TTL·무효화
- [ ] 비동기·영속 작업·재시도
- [ ] N+1·전체 읽기 한계 인지

## ⑧ 다음 단계 연결 문장

이 단계의 결과를 [study16](study16.md)에 연결한다. study16은 이 로그를 수집하고 배포·백업의 복구 가능성을 확인한다.

공식 자료: [SvelteKit 문서](https://svelte.dev/docs/kit). 상세 출처는 [README](README.md)의 공식 자료와 노션 원문 링크를 따른다.
