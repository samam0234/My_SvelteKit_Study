<script>
	import { enhance } from '$app/forms';

	let { data } = $props();
</script>

<p class="text-xs text-stone-500">{data.post.authorName}</p>
<h1 class="mt-2 text-3xl font-semibold tracking-tight">{data.post.title}</h1>
<p class="mt-4 whitespace-pre-wrap leading-7">{data.post.body}</p>
<div class="mt-6 flex gap-4 text-sm">
	<a class="underline" href="/posts/{data.post.id}/edit">수정</a>
	<form method="POST" action="?/remove" use:enhance>
		<button class="underline">삭제</button>
	</form>
	<a class="underline" href="/posts">목록</a>
</div>
