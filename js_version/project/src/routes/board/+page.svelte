<script>
import { resolve } from '$app/paths';
import { enhance } from '$app/forms';
import CourseAuth from '#lib/components/CourseAuth.svelte';
let { data, form } = $props();
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
