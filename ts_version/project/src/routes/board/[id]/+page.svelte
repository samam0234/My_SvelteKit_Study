<script lang="ts">
	import { resolve } from '$app/paths';
	import { invalidateAll, goto } from '$app/navigation';
	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	let title = $state(''),
		body = $state(''),
		comment = $state(''),
		message = $state(''),
		busy = $state(false);
	$effect(() => {
		title = data.post.title;
		body = data.post.body;
	});
	async function send(path: string, method: string, payload?: unknown) {
		if (busy) return;
		busy = true;
		message = '';
		try {
			const response = await fetch(path, {
				method,
				headers: { 'content-type': 'application/json' },
				body: payload === undefined ? undefined : JSON.stringify(payload)
			});
			if (!response.ok) throw new Error((await response.json()).error.message);
			if (method === 'DELETE' && path === '/api/posts/' + data.post.id)
				await goto(resolve('/board'));
			else {
				comment = '';
				await invalidateAll();
			}
		} catch (error) {
			message = error instanceof Error ? error.message : '요청 실패';
		} finally {
			busy = false;
		}
	}
</script>

<h1>{data.post.title}</h1>
<p>{data.post.body}</p>
<p>{data.post.author.nickname} · {data.post.createdAt}</p>
{#if data.member?.id === data.post.author.id}
	<form
		onsubmit={(event) => {
			event.preventDefault();
			send('/api/posts/' + data.post.id, 'PATCH', { title, body });
		}}
	>
		<label>제목 <input bind:value={title} required maxlength="200" /></label><label
			>본문 <textarea bind:value={body} required></textarea></label
		>
		<button disabled={busy}>수정</button><button
			disabled={busy}
			type="button"
			onclick={() => send('/api/posts/' + data.post.id, 'DELETE')}>삭제</button
		>
	</form>
{/if}
<h2>댓글</h2>
<ul>
	{#each data.comments as item (item.id)}<li>
			{item.author.nickname}: {item.body}
			{#if data.member?.id === item.author.id}<button
					disabled={busy}
					onclick={() => send('/api/comments/' + item.id, 'DELETE')}>댓글 삭제</button
				>{/if}
		</li>{/each}
</ul>
{#if data.member}<form
		onsubmit={(event) => {
			event.preventDefault();
			send('/api/posts/' + data.post.id + '/comments', 'POST', { body: comment });
		}}
	>
		<label>댓글 <textarea bind:value={comment} required maxlength="2000"></textarea></label><button
			disabled={busy}>댓글 등록</button
		>
	</form>{/if}
<p role="alert">{message}</p>
<a href={resolve('/board')}>목록</a>
