<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<p class="text-xs text-stone-500">{data.note.authorName}</p>
<h1 class="mt-2 text-3xl font-semibold tracking-tight">{data.note.title}</h1>
<p class="mt-4 whitespace-pre-wrap leading-7">{data.note.body}</p>
<div class="mt-6 flex gap-4 text-sm">
	{#if data.canEdit}
		<a class="underline" href="/notes/{data.note.id}/edit">수정</a>
		<form method="POST" action="?/remove" use:enhance>
			<button class="underline">삭제</button>
		</form>
	{/if}
	<a class="underline" href="/notes">목록</a>
</div>
