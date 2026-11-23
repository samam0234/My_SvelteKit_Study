# study14 — API 설계

## ① 목표 한 줄

REST 리소스·페이지네이션·오류·OpenAPI 문서를 계약으로 고정한다.

이 문서는 SvelteKit 하나만 다룬다. 실행 코드: `ts_version/project`·`js_version/project`, 기초 SSR 기존 예제는 `*/demo`다. TypeScript 전체 코드를 싣고 JavaScript는 같은 상대 위치의 `.js`·타입 없는 script로 제공한다. 프로젝트의 심화 기능은 뒤 단계를 위해 미리 존재하지만 해당 단계의 원리와 파일부터 순서대로 학습한다.

## ② 📖 이론

REST는 URL을 동작 이름보다 리소스 이름으로 설계한다. `/api/posts`는 모음, `/api/posts/{id}`는 하나의 글이다. GET은 읽기, POST는 생성, PATCH는 부분 수정, DELETE는 삭제다. 규격화된 소켓처럼 응답 형식이 같아야 클라이언트를 안정적으로 연결할 수 있다.

공통 API 스펙 v1의 버전은 계약 버전이다. 이 저장소에서 `/api/v1` 접두어를 임의로 추가하지 않는다. 호환되지 않는 v2가 필요하면 기존 v1 경로를 유지하며 별도 경로·이관 기간을 설계한다. camelCase, UTC 시각, data·meta·error 규칙을 고정한다.

page는 1부터, limit은 기본 10·최대 50, q는 제목·본문 대소문자 무시 부분 검색, sort는 createdAt·-createdAt·-commentCount다. 오류는 code·message·fields·requestId이고 header의 X-Request-Id와 같은 값을 사용한다. OpenAPI 3 JSON은 `/openapi.json`, 사람이 읽는 문서는 `/api-docs`에 있다.

## ③ 🛠️ 실기 — 전체 코드와 줄별 설명

1. `/api-docs`에서 13개 method/path 계약을 확인한다.
2. `/openapi.json`을 Swagger Editor에 가져와 schema·인증·오류를 살핀다.
3. API 테스트와 문서의 성공 status·필드를 대조한다.
4. 필드를 추가할 때 schema·직렬화·OpenAPI·테스트를 함께 고친다. 정적 OpenAPI는 자동 동기화되지 않으므로 리뷰가 필요하다.
5. 기존 `/api/posts`와 새 클라이언트를 유지하며 v2 확장안을 문서로 작성한다.

실행: 앱 루트에서 `npm ci` 후 `npm run dev`, 배포 산출물은 `npm run build` 후 `npm start`다. 환경 설정은 [study0](study0.md), 실행 결과와 범위는 [검증 기록](docs/verification.md)을 참고한다. 코드 블록은 실제 파일 원문이며 import된 의존 파일은 저장소에 함께 있다.

전체 OpenAPI 원문은 [openapi.json](ts_version/project/static/openapi.json)에 있으며 13개 method/path를 기술한다. 공통 v1 원문은 [노션](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e)을 따른다.


### `src/routes/api-docs/+page.server.ts` 전체 코드

[실제 파일](ts_version/project/src/routes/api-docs/+page.server.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ fetch }) => ({
	spec: await (await fetch('/openapi.json')).json()
});
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `./$types`에서 필요한 타입만 가져와 실행 번들에 넣지 않는다. |
| 2 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 3 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 4 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

### `src/routes/api-docs/+page.svelte` 전체 코드

[실제 파일](ts_version/project/src/routes/api-docs/+page.svelte) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```svelte
<script lang="ts">
	import { asset } from '$app/paths';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
</script>

<h1>공통 API 스펙 v1</h1>
<a href={asset('openapi.json')}>OpenAPI 3 JSON 내려받기</a>
<p>
	JSON은 Swagger Editor에 가져올 수 있습니다. 인증은 course_session 쿠키 또는 Bearer 토큰입니다.
	오류는 error.code/message/fields/requestId입니다.
</p>
{#each Object.entries(data.spec.paths) as [path, methods] (path)}<h2>{path}</h2>
	<pre>{JSON.stringify(methods, null, 2)}</pre>{/each}
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | 컴포넌트 스크립트 구간의 경계를 정한다. |
| 2 | `$app/paths`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | `./$types`에서 필요한 타입만 가져와 실행 번들에 넣지 않는다. |
| 4 | 부모 또는 라우터에서 받은 props를 읽는다. 상태의 전달 경계다. |
| 5 | 컴포넌트 스크립트 구간의 경계를 정한다. |
| 6 | 가독성을 위해 구간을 나누는 빈 줄이다. |
| 7 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 8 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 9 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 10 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 11 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 12 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 13 | id/key를 기준으로 목록 항목의 DOM과 상태를 연결한다. |
| 14 | 자료를 JSON 문자열로 직렬화해 저장·전송 경계에 맞춘다. |

### `src/lib/server/course/errors.ts` 전체 코드

[실제 파일](ts_version/project/src/lib/server/course/errors.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
export class ApiError extends Error {
	constructor(
		public status: number,
		public code: string,
		message: string,
		public fields: Record<string, string[]> = {}
	) {
		super(message);
	}
}
export function requireValue(
	condition: unknown,
	status: number,
	code: string,
	message: string
): asserts condition {
	if (!condition) throw new ApiError(status, code, message);
}
export function positiveId(value: string) {
	requireValue(
		/^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)),
		400,
		'BAD_REQUEST',
		'숫자 id가 필요합니다.'
	);
	return Number(value);
}
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 2 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 3 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 4 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 5 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 6 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 7 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 8 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 9 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 10 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 11 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 12 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 13 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 14 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 15 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 16 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 17 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 18 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 19 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 20 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 21 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 22 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 23 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 24 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 25 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 26 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 27 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

## ④ 🔗 연동 포인트

문서는 프론트·MCP 도구·자동 테스트가 따르는 공개 계약이다. 다음 단계는 같은 계약을 유지하면서 지연과 DB 접근 비용을 줄인다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| Swagger와 실제 응답이 다름 | 정적 스펙만 수정 | 라우트·schema·테스트 함께 갱신 |
| 204 파싱에서 예외 | 빈 본문을 JSON으로 읽음 | status 204이면 파싱 생략 |

## ⑥ 직접 해보기

1. 응답 schema에 required 필드를 강화하자.
2. limit=100의 meta.limit이 50인지 검사하자.
3. v1을 깨지 않는 필드 추가와 깨는 변경을 분류하자.

## ⑦ ☐ 체크리스트

- [ ] REST·v1 경로·camelCase
- [ ] 페이지네이션·정렬·오류 계약
- [ ] OpenAPI·Swagger 가져오기

## ⑧ 다음 단계 연결 문장

이 단계의 결과를 [study15](study15.md)에 연결한다. 다음 단계는 같은 계약을 유지하면서 지연과 DB 접근 비용을 줄인다.

공식 자료: [SvelteKit 문서](https://svelte.dev/docs/kit). 상세 출처는 [README](README.md)의 공식 자료와 노션 원문 링크를 따른다.
