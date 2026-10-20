<script lang="ts">
	import { enhance } from '$app/forms';
	import PostFields from '#lib/components/PostFields.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-3xl font-semibold tracking-tight">글 수정</h1>
<form class="mt-6 border border-line bg-card p-4" method="POST" use:enhance>
	<PostFields
		title={form?.title ?? data.post.title}
		body={form?.body ?? data.post.body}
		message={form?.missing ? '제목과 본문을 모두 적어 주세요.' : ''}
	/>
	<button class="mt-4 bg-ember px-4 py-2 text-sm font-semibold text-white">저장</button>
</form>
