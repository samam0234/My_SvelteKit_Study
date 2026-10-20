<script lang="ts">
	const posts = [
		{ id: '1', title: '라우트만 먼저 만든 글' },
		{ id: '2', title: '저장소는 study5에서 붙습니다' }
	];
</script>

<h1 class="text-3xl font-semibold tracking-tight">게시판</h1>
<ul class="mt-6 divide-y divide-line border border-line bg-card">
	{#each posts as post (post.id)}
		<li>
			<a class="block px-4 py-3 hover:bg-paper" href="/posts/{post.id}">{post.title}</a>
		</li>
	{/each}
</ul>
