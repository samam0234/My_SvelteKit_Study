<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<p class="text-sm font-semibold text-ember">study3 · 외부 API</p>
<h1 class="mt-2 text-3xl font-semibold tracking-tight">서버가 대신 받아 온 글</h1>
<p class="mt-4 leading-7">
	브라우저는 jsonplaceholder에 직접 요청하지 않습니다. <code>+page.server.ts</code>의
	<code>fetch</code>가 서버에서 5개를 읽고 HTML에 제목을 넣습니다.
</p>
{#if data.failed}
	<p class="mt-4 text-ember">외부 API를 읽지 못했습니다.</p>
{:else}
	<ol class="mt-6 list-decimal space-y-2 border border-line bg-card p-4 pl-8">
		{#each data.posts as post (post.id)}
			<li>{post.title}</li>
		{/each}
	</ol>
{/if}
