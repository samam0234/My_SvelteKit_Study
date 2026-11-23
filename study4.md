# study4 — 라우팅과 요청 처리

## ① 목표 한 줄

동적 URL·쿼리·load·오류 화면이 요청을 처리하는 흐름을 구현한다.

이 문서는 SvelteKit 하나만 다룬다. 실행 코드: `ts_version/project`·`js_version/project`, 기초 SSR 기존 예제는 `*/demo`다. TypeScript 전체 코드를 싣고 JavaScript는 같은 상대 위치의 `.js`·타입 없는 script로 제공한다. 프로젝트의 심화 기능은 뒤 단계를 위해 미리 존재하지만 해당 단계의 원리와 파일부터 순서대로 학습한다.

## ② 📖 이론

`src/routes/board/+page.svelte`는 `/board`, `[id]` 폴더는 동적 경로, `+page.server.ts`의 load는 페이지 데이터, `+server.ts`는 HTTP 응답이다. 우체국에 비유하면 폴더는 주소, params는 번지, searchParams는 배송 옵션이다.

요청은 hooks → 서버 load 또는 endpoint → DB → 직렬화된 data → 페이지 순서로 흐른다. 페이지 이동은 `<a href>`가 기본이며 필요할 때 goto를 사용한다. 쿼리는 `url.searchParams`에서 읽고 검색어·페이지 크기·내 글 필터를 새 링크에도 유지한다.

서버는 숫자가 아닌 id를 400, 없는 글을 404, 권한 없는 수정을 403으로 나눈다. API는 공통 오류 JSON, 화면은 `+error.svelte`를 사용한다. universal load는 서버와 브라우저에서 실행될 수 있으므로 비밀 코드를 넣지 않는다.

## ③ 🛠️ 실기 — 전체 코드와 줄별 설명

1. `/board/1`은 `[id]`와 연결되며 id를 positiveId로 먼저 검증한다.
2. `/board?q=문서&page=1&limit=5`를 열어 URL과 결과를 확인한다.
3. `/board/abc`와 없는 숫자 id를 열어 오류 화면을 비교한다.
4. 서버 load에서는 내부 서비스를 직접 부른다. 같은 서버를 불필요하게 HTTP로 재호출할 필요가 없다. 외부 클라이언트는 `/api/posts/:id`를 사용한다.

실행: 앱 루트에서 `npm ci` 후 `npm run dev`, 배포 산출물은 `npm run build` 후 `npm start`다. 환경 설정은 [study0](study0.md), 실행 결과와 범위는 [검증 기록](docs/verification.md)을 참고한다. 코드 블록은 실제 파일 원문이며 import된 의존 파일은 저장소에 함께 있다.



### `src/routes/board/[id]/+page.server.ts` 전체 코드

[실제 파일](ts_version/project/src/routes/board/[id]/+page.server.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { post, comments } from '#lib/server/course/service.js';
import { ApiError, positiveId } from '#lib/server/course/errors.js';
export const load: PageServerLoad = async ({ params, locals }) => {
	try {
		const id = positiveId(params.id);
		return { post: await post(id), comments: await comments(id), member: locals.member };
	} catch (caught) {
		if (caught instanceof ApiError) error(caught.status, caught.message);
		throw caught;
	}
};
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `@sveltejs/kit`에서 필요한 함수·컴포넌트를 가져온다. |
| 2 | `./$types`에서 필요한 타입만 가져와 실행 번들에 넣지 않는다. |
| 3 | `#lib/server/course/service.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 4 | `#lib/server/course/errors.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 5 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 6 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 7 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 8 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 9 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 10 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 11 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 12 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 13 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

### `src/routes/+error.svelte` 전체 코드

[실제 파일](ts_version/project/src/routes/+error.svelte) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```svelte
<script lang="ts">
	import { page } from '$app/state';
</script>

<h1 class="text-3xl font-semibold tracking-tight">{page.status}</h1>
<p class="mt-4 leading-7">{page.error?.message}</p>
<p class="mt-6 text-sm"><a class="underline" href="/">홈으로</a></p>
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | 컴포넌트 스크립트 구간의 경계를 정한다. |
| 2 | `$app/state`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | 컴포넌트 스크립트 구간의 경계를 정한다. |
| 4 | 가독성을 위해 구간을 나누는 빈 줄이다. |
| 5 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 6 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 7 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |

## ④ 🔗 연동 포인트

화면 URL `/board/:id`와 데이터 URL `/api/posts/:id`는 역할이 다르지만 같은 service.post를 사용한다. study5의 폼은 이 데이터 경로에 쓰기 요청을 보낸다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| 동적 경로가 404 | 파일명·폴더 규칙이 잘못됨 | [id]/+page.svelte와 서버 파일 위치 확인 |
| 검색 후 다음 페이지에서 필터가 사라짐 | 새 링크에 q·mine·limit 누락 | URL을 단일 원본으로 유지 |

## ⑥ 직접 해보기

1. sort 쿼리를 선택하는 UI를 추가하자.
2. 숫자가 아닌 id와 없는 숫자 id의 상태를 비교하자.
3. JS를 꺼도 목록·상세가 보이는지 확인하자.

## ⑦ ☐ 체크리스트

- [ ] 파일·동적·그룹 라우팅
- [ ] SSR load·query·페이지 이동
- [ ] 오류 페이지와 API 오류 구분

**📌 노션 원문 추가 항목** — 문구·괄호·원문 링크를 그대로 보존했다. 원래 다른 저장소 경로를 가리키는 항목도 바꾸지 않았다. 이 문서에서는 학습 확인용 빈 체크로 옮긴다. 현재 검증 여부는 README와 검증 기록을 따른다.

- [ ] 파일 기반 라우팅 (<code>src/routes</code>)
- [ ] <code>+page.svelte</code> / <code>+layout.svelte</code> / <code>+page.server.js</code>
- [ ] load 함수로 데이터 패칭
- [ ] 파일 기반 라우팅: <code>src/routes/posts/[id]/+page.svelte</code> (→ study4, 이 저장소는 users 대신 posts)
- [ ] <code>load()</code>로 데이터 불러오기 (SSR로 첫 응답에 내용이 들어 있는지 확인) (→ study4, <code>curl</code>과 E2E로 확인)

## ⑧ 다음 단계 연결 문장

이 단계의 결과를 [study5](study5.md)에 연결한다. study5의 폼은 이 데이터 경로에 쓰기 요청을 보낸다.

공식 자료: [SvelteKit 문서](https://svelte.dev/docs/kit). 상세 출처는 [README](README.md)의 공식 자료와 노션 원문 링크를 따른다.
