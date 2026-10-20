<script>
	let { data } = $props();
</script>

<h1 class="text-3xl font-semibold tracking-tight">게시판</h1>
<p class="mt-3 text-sm leading-6 text-stone-600">
	목록은 <code>load</code>가 JSON 파일에서 읽습니다. 같은 데이터는
	<code>GET /api/posts</code>로도 받을 수 있습니다.
</p>
<ul class="mt-6 divide-y divide-line border border-line bg-card">
	{#each data.posts as post (post.id)}
		<li>
			<a class="block px-4 py-3 hover:bg-paper" href="/posts/{post.id}">
				<span class="font-semibold">{post.title}</span>
				<span class="mt-1 block text-xs text-stone-500">{post.authorName}</span>
			</a>
		</li>
	{/each}
</ul>
