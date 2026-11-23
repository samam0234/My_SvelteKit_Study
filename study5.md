# study5 — 폼·입력·검증

## ① 목표 한 줄

서버 검증과 중복 제출 방지를 갖춘 글쓰기 폼을 만든다.

이 문서는 SvelteKit 하나만 다룬다. 실행 코드: `ts_version/project`·`js_version/project`, 기초 SSR 기존 예제는 `*/demo`다. TypeScript 전체 코드를 싣고 JavaScript는 같은 상대 위치의 `.js`·타입 없는 script로 제공한다. 프로젝트의 심화 기능은 뒤 단계를 위해 미리 존재하지만 해당 단계의 원리와 파일부터 순서대로 학습한다.

## ② 📖 이론

HTML form은 브라우저의 기본 요청 방법이다. SvelteKit form action은 FormData를 받고 fail은 오류 상태와 입력 결과를 같은 페이지로 돌려준다. use:enhance는 JavaScript가 있을 때 페이지 전체 이동을 줄이지만, 서버 검증은 항상 남아야 한다. 브라우저 required는 입구 안내판이고 서버 검증은 실제 출입 검사다.

공통 API v1에서 검증 실패는 400 `VALIDATION_ERROR`, JSON 문법 오류도 400이지만 `BAD_REQUEST`다. 422를 쓰는 외부 API가 있다면 같은 입력 오류 UI로 표시하되 이 저장소의 v1 응답을 422로 바꾸지 않는다. 성공은 요청 종류에 따라 200 또는 생성 201이며 form action은 성공 결과를 표시한다.

클라이언트 busy·submitting은 연속 클릭을 막는다. 서버에서 완전한 중복 방지가 필요한 결제·메일은 idempotency key를 추가한다. 클라이언트 잠금은 새 탭이나 재시도를 막는 보안 장치가 아니다.

## ③ 🛠️ 실기 — 전체 코드와 줄별 설명

1. postSchema는 제목 1~200자, 본문 1~20000자, 태그 10개까지를 검증한다.
2. board action은 FormData를 읽고 service.write를 호출한다. API와 동일한 규칙을 쓴다.
3. enhance는 제출 시작에 잠그고 update 완료 또는 오류 뒤 finally에서 해제한다.
4. API 클라이언트는 response.ok를 검사한다. fetch는 400·422에도 자동으로 reject하지 않는다.
5. JS를 끈 뒤 로그인 쿠키가 있는 상태에서 기본 form POST가 성공하는지 확인한다.

실행: 앱 루트에서 `npm ci` 후 `npm run dev`, 배포 산출물은 `npm run build` 후 `npm start`다. 환경 설정은 [study0](study0.md), 실행 결과와 범위는 [검증 기록](docs/verification.md)을 참고한다. 코드 블록은 실제 파일 원문이며 import된 의존 파일은 저장소에 함께 있다.



### `src/lib/course/schema.ts` 전체 코드

[실제 파일](ts_version/project/src/lib/course/schema.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
import { z } from 'zod';
export const postSchema = z.object({
	title: z.string().trim().min(1).max(200),
	body: z.string().trim().min(1).max(20000),
	tags: z.array(z.string().trim().min(1).max(30)).max(10).default([])
});
export const postPatchSchema = z
	.object({
		title: postSchema.shape.title.optional(),
		body: postSchema.shape.body.optional(),
		tags: z.array(z.string().trim().min(1).max(30)).max(10).optional()
	})
	.strict()
	.refine((value) => Object.keys(value).length > 0);
export const signupSchema = z.object({
	email: z.string().trim().toLowerCase().email().max(254),
	nickname: z.string().trim().min(1).max(80),
	password: z.string().min(10).max(128)
});
export const loginSchema = signupSchema.pick({ email: true, password: true });
export const commentSchema = z.object({ body: z.string().trim().min(1).max(2000) });
export const questionSchema = z.object({
	text: z.string().min(1).max(20000),
	question: z.string().min(1).max(500)
});
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `zod`에서 필요한 함수·컴포넌트를 가져온다. |
| 2 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 3 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 4 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 5 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 6 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 7 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 8 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 9 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 10 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 11 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 12 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 13 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 14 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 15 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 16 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 17 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 18 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 19 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 20 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 21 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 22 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 23 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 24 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 25 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

### `src/routes/board/+page.server.ts` 전체 코드

[실제 파일](ts_version/project/src/routes/board/+page.server.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { list, write } from '#lib/server/course/service.js';
import { ApiError } from '#lib/server/course/errors.js';
export const load: PageServerLoad = async ({ url, locals }) => ({
	...(await list(url.searchParams, locals.member)),
	member: locals.member,
	mine: url.searchParams.get('mine') === 'true'
});
export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await write(
				{ title: String(form.get('title') ?? ''), body: String(form.get('body') ?? ''), tags: [] },
				locals.member
			);
			return { success: true };
		} catch (error) {
			if (error instanceof ApiError)
				return fail(error.status, { message: error.message, fields: error.fields });
			throw error;
		}
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
| 6 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 7 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 8 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 9 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 10 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 11 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 12 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 13 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 14 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 15 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 16 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 17 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 18 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 19 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 20 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 21 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 22 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 23 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 24 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 25 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

### `src/routes/board/+page.svelte` 전체 코드

[실제 파일](ts_version/project/src/routes/board/+page.svelte) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```svelte
<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import CourseAuth from '#lib/components/CourseAuth.svelte';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();
	let submitting = $state(false);
</script>

<svelte:head
	><title>소나무 게시판</title><meta
		name="description"
		content="SvelteKit 단일 게시판 학습 서비스"
	/></svelte:head
>
<h1>소나무 게시판</h1>
<nav>
	<a href={resolve('/lab')}>기초 실습</a> · <a href={resolve('/ui')}>UI 실습</a> ·
	<a href={resolve('/integrations')}>외부 서비스</a>
	· <a href={resolve('/ai')}>문서 AI</a> · <a href={resolve('/api-docs')}>API 문서</a>
</nav>
<CourseAuth />
<p>{data.member ? `${data.member.nickname}님` : '읽기는 누구나, 쓰기는 로그인 후 가능합니다.'}</p>
<form method="GET">
	<label>검색 <input name="q" value={data.meta.q} /></label>
	<label
		>페이지 크기 <select name="limit" value={String(data.meta.limit)}
			><option>5</option><option>10</option><option>50</option></select
		></label
	>
	<label><input type="checkbox" name="mine" value="true" checked={data.mine} /> 내 글만</label
	><button>검색</button>
</form>
<ul>
	{#each data.data as post (post.id)}<li>
			<a href={resolve('/board/[id]', { id: String(post.id) })}>{post.title}</a> · {post.author
				.nickname} · 댓글 {post.commentCount}
		</li>{:else}<li>게시글이 없습니다.</li>{/each}
</ul>
<p>{data.meta.page} / {data.meta.totalPages} 페이지 · 총 {data.meta.total}개</p>
<a
	href={resolve(
		`/board?q=${encodeURIComponent(data.meta.q)}&limit=${data.meta.limit}&mine=${data.mine}&page=${Math.max(1, data.meta.page - 1)}`
	)}>이전</a
>
<a
	href={resolve(
		`/board?q=${encodeURIComponent(data.meta.q)}&limit=${data.meta.limit}&mine=${data.mine}&page=${data.meta.page + 1}`
	)}>다음</a
>
{#if data.member}
	<form
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				try {
					await update();
				} finally {
					submitting = false;
				}
			};
		}}
	>
		<label>제목 <input name="title" required maxlength="200" /></label>
		{#if form && 'fields' in form && form.fields?.title}<p role="alert">
				{form.fields.title.join(', ')}
			</p>{/if}
		<label>본문 <textarea name="body" required maxlength="20000"></textarea></label>
		{#if form && 'fields' in form && form.fields?.body}<p role="alert">
				{form.fields.body.join(', ')}
			</p>{/if}
		<button disabled={submitting}>{submitting ? '저장 중' : '글 등록'}</button>
	</form>
{/if}
{#if form && 'message' in form}<p role="alert">{form.message}</p>{/if}
{#if form && 'success' in form}<p role="status">저장했습니다.</p>{/if}
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | 컴포넌트 스크립트 구간의 경계를 정한다. |
| 2 | `$app/paths`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | `$app/forms`에서 필요한 함수·컴포넌트를 가져온다. |
| 4 | `#lib/components/CourseAuth.svelte`에서 필요한 함수·컴포넌트를 가져온다. |
| 5 | `./$types`에서 필요한 타입만 가져와 실행 번들에 넣지 않는다. |
| 6 | 부모 또는 라우터에서 받은 props를 읽는다. 상태의 전달 경계다. |
| 7 | 사용자가 바꿀 원본을 반응형 상태로 선언한다. 값 변경이 연결된 화면을 갱신한다. |
| 8 | 컴포넌트 스크립트 구간의 경계를 정한다. |
| 9 | 가독성을 위해 구간을 나누는 빈 줄이다. |
| 10 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 11 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 12 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 13 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 14 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 15 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 16 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 17 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 18 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 19 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 20 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 21 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 22 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 23 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 24 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 25 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 26 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 27 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 28 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 29 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 30 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 31 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 32 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 33 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 34 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 35 | id/key를 기준으로 목록 항목의 DOM과 상태를 연결한다. |
| 36 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 37 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 38 | 조건에 맞는 UI만 렌더하거나 빈 상태를 표시한다. |
| 39 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 40 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 41 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 42 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 43 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 44 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 45 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 46 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 47 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 48 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 49 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 50 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 51 | 조건에 맞는 UI만 렌더하거나 빈 상태를 표시한다. |
| 52 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 53 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 54 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 55 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 56 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 57 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 58 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 59 | 성공·실패와 관계없이 제출 잠금 또는 연결 자원을 정리한다. |
| 60 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 61 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 62 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 63 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 64 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 65 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 66 | 조건에 맞는 UI만 렌더하거나 빈 상태를 표시한다. |
| 67 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 68 | 조건에 맞는 UI만 렌더하거나 빈 상태를 표시한다. |
| 69 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 70 | 조건에 맞는 UI만 렌더하거나 빈 상태를 표시한다. |
| 71 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 72 | 조건에 맞는 UI만 렌더하거나 빈 상태를 표시한다. |
| 73 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 74 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 75 | 조건에 맞는 UI만 렌더하거나 빈 상태를 표시한다. |
| 76 | 조건에 맞는 UI만 렌더하거나 빈 상태를 표시한다. |
| 77 | 조건에 맞는 UI만 렌더하거나 빈 상태를 표시한다. |

## ④ 🔗 연동 포인트

검증 스키마는 API·폼·UI 라이브러리에서 재사용한다. study6은 이 입력을 DB에 넣고 201·Location을 반환한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| 버튼이 계속 비활성 | 실패 후 잠금 해제 누락 | finally에서 submitting=false |
| 빈 글이 DB에 저장됨 | 클라이언트에서만 검증 | 서버 service에서 스키마 검증 |

## ⑥ 직접 해보기

1. Network에서 required를 우회해 빈 JSON을 보내자.
2. 가짜 422 응답을 만들어 입력 오류 UI로 처리하자.
3. 응답을 느리게 하고 중복 클릭이 막히는지 확인하자.

## ⑦ ☐ 체크리스트

- [ ] 서버 검증·fields 오류 표시
- [ ] 400·422·200/201 구분
- [ ] 중복 제출 잠금과 해제
- [ ] JS 없는 form 제출

**📌 노션 원문 추가 항목** — 문구·괄호·원문 링크를 그대로 보존했다. 원래 다른 저장소 경로를 가리키는 항목도 바꾸지 않았다. 이 문서에서는 학습 확인용 빈 체크로 옮긴다. 현재 검증 여부는 README와 검증 기록을 따른다.

- [ ] form actions / API 라우트
- [ ] form actions + <code>use:enhance</code>로 글쓰기 구현 (서버에서 검증) (→ study5, zod 서버 검증 + JS 없이도 동작 확인)

## ⑧ 다음 단계 연결 문장

이 단계의 결과를 [study6](study6.md)에 연결한다. study6은 이 입력을 DB에 넣고 201·Location을 반환한다.

공식 자료: [SvelteKit 문서](https://svelte.dev/docs/kit). 상세 출처는 [README](README.md)의 공식 자료와 노션 원문 링크를 따른다.
