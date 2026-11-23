# study9 — 테스트·디버깅

## ① 목표 한 줄

단위·요청 테스트로 동작을 증명하고 requestId로 실패를 찾는다.

이 문서는 SvelteKit 하나만 다룬다. 실행 코드: `ts_version/project`·`js_version/project`, 기초 SSR 기존 예제는 `*/demo`다. TypeScript 전체 코드를 싣고 JavaScript는 같은 상대 위치의 `.js`·타입 없는 script로 제공한다. 프로젝트의 심화 기능은 뒤 단계를 위해 미리 존재하지만 해당 단계의 원리와 파일부터 순서대로 학습한다.

## ② 📖 이론

단위 테스트는 입력 검증·id 변환·캐시·검색처럼 좁은 규칙을 빠르게 검사한다. 요청 테스트는 실제 HTTP·세션·DB·응답 계약이 연결되는지 검사한다. 단위는 부품 검사, 요청 테스트는 조립 후 시운전이다. 단위만 통과해도 route 경로나 쿠키가 틀릴 수 있다.

Node의 test runner와 assert를 사용하고 Vite가 SvelteKit 가상 환경변수 모듈을 로드한다. AI는 fetcher 함수를 주입해 가짜 스트림으로 바꾼다. Storage 인터페이스도 all·insert·patch·remove를 가진 메모리 객체로 교체할 수 있다. 실제 DB 검사는 별도 테스트 DB를 사용하며 운영 DB에 시험 데이터를 만들지 않는다.

디버깅은 브라우저 Console·Network에서 status와 requestId를 찾고 같은 id의 JSON 서버 로그로 이어 간다. Node inspector는 `node --inspect server.mjs`로 켜고 외부에 디버그 포트를 공개하지 않는다. 비밀번호·token·원문 문서는 로그에 찍지 않는다.

## ③ 🛠️ 실기 — 전체 코드와 줄별 설명

1. `npm test`로 단위 검사를 실행한다. 부분 수정 테스트는 태그 삭제 회귀를 실제로 발견한 검사다.
2. 별도 서버를 켜고 `BASE_URL`을 지정해 `npm run test:api`를 실행한다.
3. 응답 status뿐 아니라 Location·Set-Cookie·meta·requestId·403·로그아웃 후 401도 확인한다.
4. 실패할 때 테스트를 약하게 만들지 말고 코드의 첫 실패 지점을 고친다. API 테스트는 실제 DB를 사용하고 AI 단위 검사는 mock이므로 검증 범위를 구분한다.

실행: 앱 루트에서 `npm ci` 후 `npm run dev`, 배포 산출물은 `npm run build` 후 `npm start`다. 환경 설정은 [study0](study0.md), 실행 결과와 범위는 [검증 기록](docs/verification.md)을 참고한다. 코드 블록은 실제 파일 원문이며 import된 의존 파일은 저장소에 함께 있다.

### 자주 나는 오류 TOP 10

| 증상 | 원인 | 해결 |
|---|---|---|
| window/localStorage 없음 | SSR에서 브라우저 API | onMount·사용자 이벤트로 이동 |
| 상태 변경 미표시 | 일반 let | $state 선언 |
| props 경고 | 반응형 자료를 한 번만 캡처 | getter·derived 또는 의도적 초기화 주석 |
| bind 실패 | 자식이 $bindable 미선언 | 명시적 허용 또는 콜백 |
| 라우트 404 | +파일·폴더 위치 오류 | src/routes와 동적 경로 확인 |
| import 경계 오류 | 클라이언트가 server 모듈 import | 서버 load/API 경유 |
| env 없음 | 선언·실행 폴더·재시작 누락 | src/env와 .env 확인 |
| form 403 | Origin 불일치 | 외부 도메인과 ORIGIN 일치 |
| 로그인 401 | 만료·Secure·잘못된 쿠키 | 쿠키·HTTPS·세션 DB 확인 |
| 변경 없는 필드 초기화 | 생성 schema default를 PATCH에 재사용 | postPatchSchema 분리 |


### `tests/unit.test.mjs` 전체 코드

[실제 파일](ts_version/project/tests/unit.test.mjs) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
let vite, schema, errors, cache, ai, service;
before(async () => {
	vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
	schema = await vite.ssrLoadModule('/src/lib/course/schema.ts');
	errors = await vite.ssrLoadModule('/src/lib/server/course/errors.ts');
	cache = await vite.ssrLoadModule('/src/lib/server/course/cache.ts');
	ai = await vite.ssrLoadModule('/src/lib/server/course/ai.ts');
	service = await vite.ssrLoadModule('/src/lib/server/course/service.ts');
});
after(async () => {
	await vite?.close();
});
test('가짜 DB를 주입해 검색·페이지·작성자 직렬화를 확인한다', async () => {
	const rows = {
		posts: [
			{
				id: 1,
				title: 'SvelteKit',
				body: '첫 글',
				tags: '[]',
				authorId: 7,
				createdAt: '2026-11-23T00:00:00Z',
				updatedAt: '2026-11-23T00:00:00Z'
			}
		],
		members: [{ id: 7, nickname: '가짜 DB 사용자', passwordHash: 'not-public' }],
		comments: [{ id: 3, postId: 1 }]
	};
	const calls = [];
	const fake = {
		all: async (table) => {
			calls.push(table);
			return rows[table] || [];
		},
		insert: async () => {
			throw new Error('unexpected write');
		},
		patch: async () => {},
		remove: async () => {}
	};
	const result = await service.list(new URLSearchParams('q=SVELTE&limit=1'), null, fake);
	assert.equal(result.meta.total, 1);
	assert.equal(result.data[0].commentCount, 1);
	assert.deepEqual(result.data[0].author, { id: 7, nickname: '가짜 DB 사용자' });
	assert.ok(!JSON.stringify(result).includes('not-public'));
	assert.deepEqual(calls, ['posts', 'members', 'comments']);
});
test('공백 제목·긴 본문·잘못된 tags 거부', () => {
	assert.equal(schema.postSchema.safeParse({ title: ' ', body: '본문' }).success, false);
	assert.equal(
		schema.postSchema.safeParse({ title: '제목', body: 'a'.repeat(20001) }).success,
		false
	);
	assert.equal(
		schema.postSchema.safeParse({ title: '제목', body: '본문', tags: [''] }).success,
		false
	);
});
test('부분 수정에서 생략한 필드는 생성하지 않는다', () => {
	assert.deepEqual(schema.postPatchSchema.parse({ title: ' changed ' }), { title: 'changed' });
});
test('회원 입력 정규화와 비밀번호 길이', () => {
	assert.equal(
		schema.signupSchema.parse({ email: 'A@example.com', nickname: 'a', password: '1234567890' })
			.email,
		'a@example.com'
	);
	assert.equal(
		schema.signupSchema.safeParse({ email: 'bad', nickname: 'a', password: 'short' }).success,
		false
	);
});
test('잘못된 id가 실제 DB 조회까지 내려가지 않는다', () => {
	for (const value of ['0', '-1', 'abc', '1e2', '9007199254740992'])
		assert.throws(() => errors.positiveId(value));
	assert.equal(errors.positiveId('23'), 23);
});
test('캐시는 동시 요청을 합치고 실패는 보관하지 않는다', async () => {
	const c = cache.ttlCache(1000);
	let calls = 0;
	const load = async () => ++calls;
	assert.deepEqual(await Promise.all([c.get('a', load), c.get('a', load)]), [1, 1]);
	c.clear();
	assert.equal(await c.get('a', load), 2);
	await assert.rejects(
		c.get('bad', async () => {
			throw new Error('network');
		})
	);
	assert.equal(await c.get('bad', async () => 3), 3);
});
test('RAG 검색은 질문과 관련된 발췌를 우선한다', () => {
	const sources = ai.retrieve('a'.repeat(700) + '사과 영양 정보', '사과');
	assert.equal(sources[0].index, 2);
	assert.ok(sources.length <= 3);
});
test('AI 공급자를 mock fetch로 바꿔 스트림 계약을 확인한다', async () => {
	let payload;
	const fake = async (_url, options) => {
		payload = JSON.parse(options.body);
		return new Response('{"message":{"content":"답변"},"done":true}\n');
	};
	const response = await ai.ask('사과 문서', '사과', new AbortController().signal, fake);
	assert.match(await response.text(), /답변/);
	assert.equal(payload.stream, true);
	assert.match(payload.messages[0].content, /근거/);
});
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `node:test`에서 필요한 함수·컴포넌트를 가져온다. |
| 2 | `node:assert/strict`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | `vite`에서 필요한 함수·컴포넌트를 가져온다. |
| 4 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 5 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 6 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 7 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 8 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 9 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 10 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 11 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 12 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 13 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 14 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 15 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 16 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 17 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 18 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 19 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 20 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 21 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 22 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 23 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 24 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 25 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 26 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 27 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 28 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 29 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 30 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 31 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 32 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 33 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 34 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 35 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 36 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 37 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 38 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 39 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 40 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 41 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 42 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 43 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 44 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 45 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 46 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 47 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 48 | 자료를 JSON 문자열로 직렬화해 저장·전송 경계에 맞춘다. |
| 49 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 50 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 51 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 52 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 53 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 54 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 55 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 56 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 57 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 58 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 59 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 60 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 61 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 62 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 63 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 64 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 65 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 66 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 67 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 68 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 69 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 70 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 71 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 72 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 73 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 74 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 75 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 76 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 77 | 모음 또는 스트림의 항목을 순서대로 처리한다. |
| 78 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 79 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 80 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 81 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 82 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 83 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 84 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 85 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 86 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 87 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 88 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 89 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 90 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 91 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 92 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 93 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 94 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 95 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 96 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 97 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 98 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 99 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 100 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 101 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 102 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 103 | 문자열 JSON을 자료로 변환한다. 스트림에서는 완성된 줄인지 먼저 확인해야 한다. |
| 104 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 105 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 106 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 107 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 108 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 109 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 110 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

### `tests/api.mjs` 전체 코드

[실제 파일](ts_version/project/tests/api.mjs) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```js
import assert from 'node:assert/strict';
const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
let checks = 0;
async function request(path, method = 'GET', body, token, expected = 200, extra = {}) {
	const response = await fetch(base + path, {
		method,
		headers: {
			...(!['GET', 'HEAD'].includes(method) ? { 'Content-Type': 'application/json' } : {}),
			...(token ? { Authorization: 'Bearer ' + token } : {}),
			...extra
		},
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	assert.equal(
		response.status,
		expected,
		method + ' ' + path + ' ' + (await response.clone().text())
	);
	assert.ok(response.headers.get('x-request-id'));
	checks++;
	const data = response.status === 204 ? null : await response.json();
	if (expected >= 400) {
		assert.equal(data.error.requestId, response.headers.get('x-request-id'));
		assert.ok(data.error.code);
	}
	return { data, response };
}
const stamp = crypto.randomUUID();
const account = {
	email: 'a-' + stamp + '@example.com',
	password: 'safe-password-123',
	nickname: '학습자'
};
await request('/health');
await request('/api/auth/signup', 'POST', account, null, 201);
await request('/api/auth/signup', 'POST', account, null, 409);
await request('/api/auth/login', 'POST', { ...account, password: 'wrong-password' }, null, 401);
const { data: login, response: session } = await request('/api/auth/login', 'POST', account);
const token = login.data.accessToken;
assert.match(session.headers.get('set-cookie'), /HttpOnly/i);
await request('/api/auth/me', 'GET', undefined, token);
await request('/api/auth/me', 'GET', undefined, 'fake-token', 401);
await request('/api/posts', 'POST', { title: 'no auth', body: 'body' }, null, 401);
await request('/api/posts', 'POST', { title: '', body: '' }, token, 400);
const result = await request(
	'/api/posts',
	'POST',
	{ title: 'spec-' + stamp, body: '<script>alert(1)</script>', tags: ['study'] },
	token,
	201
);
const id = result.data.data.id;
assert.equal(result.response.headers.get('location'), '/api/posts/' + id);
await request('/api/posts/' + id);
const listing = await request('/api/posts?q=' + stamp + '&limit=99&sort=-commentCount');
assert.equal(listing.data.meta.limit, 50);
assert.equal(listing.data.meta.total, 1);
await request('/api/posts?page=0', 'GET', undefined, null, 400);
await request('/api/posts/abc', 'GET', undefined, null, 400);
await request('/api/unknown', 'GET', undefined, null, 404);
await request('/api/posts/999999999', 'GET', undefined, null, 404);
await request('/api/posts/' + id, 'PATCH', { title: 'changed' }, token);
const other = { ...account, email: 'b-' + stamp + '@example.com' };
await request('/api/auth/signup', 'POST', other, null, 201);
const otherToken = (await request('/api/auth/login', 'POST', other)).data.data.accessToken;
await request('/api/posts/' + id, 'PATCH', { title: 'stolen' }, otherToken, 403);
await request('/api/posts/' + id, 'DELETE', undefined, otherToken, 403);
const comment = (
	await request('/api/posts/' + id + '/comments', 'POST', { body: '댓글' }, token, 201)
).data.data;
await request('/api/posts/' + id + '/comments');
await request('/api/comments/' + comment.id, 'DELETE', undefined, otherToken, 403);
await request('/api/comments/' + comment.id, 'DELETE', undefined, token, 204);
await request('/api/posts/' + id, 'DELETE', undefined, token, 204);
await request('/api/posts/' + id, 'GET', undefined, null, 404);
await request('/api/auth/logout', 'POST', undefined, token, 204);
await request('/api/auth/me', 'GET', undefined, token, 401);
await request('/api/posts', 'POST', { title: 'csrf', body: 'test' }, otherToken, 403, {
	Origin: 'https://evil.invalid'
});
const malformed = await fetch(base + '/api/posts', {
	method: 'POST',
	headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + otherToken },
	body: '{'
});
assert.equal(malformed.status, 400);
checks++;
console.log(JSON.stringify({ checks, base, result: 'passed' }));
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `node:assert/strict`에서 필요한 함수·컴포넌트를 가져온다. |
| 2 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 3 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 4 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 5 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 6 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 7 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 8 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 9 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 10 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 11 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 12 | 자료를 JSON 문자열로 직렬화해 저장·전송 경계에 맞춘다. |
| 13 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 14 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 15 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 16 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 17 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 18 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 19 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 20 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 21 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 22 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 23 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 24 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 25 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 26 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 27 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 28 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 29 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 30 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 31 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 32 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 33 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 34 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 35 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 36 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 37 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 38 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 39 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 40 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 41 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 42 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 43 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 44 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 45 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 46 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 47 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 48 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 49 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 50 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 51 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 52 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 53 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 54 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 55 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 56 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 57 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 58 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 59 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 60 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 61 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 62 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 63 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 64 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 65 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 66 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 67 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 68 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 69 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 70 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 71 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 72 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 73 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 74 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 75 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 76 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 77 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 78 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 79 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 80 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 81 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 82 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 83 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 84 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 85 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 86 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 87 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 88 | 자료를 JSON 문자열로 직렬화해 저장·전송 경계에 맞춘다. |

## ④ 🔗 연동 포인트

단위 검사는 코드 규칙, HTTP 검사는 서비스 경계, 이후 CI는 같은 명령의 반복 실행을 담당한다. study10은 검사한 코드를 빌드 결과로 실행한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| 테스트가 다른 서버를 검사 | BASE_URL 또는 포트 잘못 지정 | 테스트 출력의 base와 서버 로그 확인 |
| mock 통과인데 실제 모델 실패 | 키·주소·모델 설치는 mock 범위 밖 | 실제 연결을 별도 수행하고 결과를 구분 |

## ⑥ 직접 해보기

1. 권한 비교를 잠시 반대로 바꿔 403 테스트가 실패하는지 확인 후 복원하자.
2. DB 실패를 던지는 가짜 Storage를 만들자.
3. 브라우저 요청 하나를 requestId로 로그에서 찾아보자.

## ⑦ ☐ 체크리스트

- [ ] 단위·요청·mock 범위 구분
- [ ] 재현 명령·requestId 로그
- [ ] 오류 TOP 10 숙지

## ⑧ 다음 단계 연결 문장

이 단계의 결과를 [study10](study10.md)에 연결한다. study10은 검사한 코드를 빌드 결과로 실행한다.

공식 자료: [SvelteKit 문서](https://svelte.dev/docs/kit). 상세 출처는 [README](README.md)의 공식 자료와 노션 원문 링크를 따른다.
