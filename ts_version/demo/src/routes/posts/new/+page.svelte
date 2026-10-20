<script lang="ts">
	import { enhance } from '$app/forms';
	import PostFields from '#lib/components/PostFields.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-3xl font-semibold tracking-tight">새 글</h1>
<p class="mt-2 text-sm text-stone-600">
	{data.user?.name} 이름으로 등록됩니다. 이 주소는 로그인하지 않으면 열리지 않습니다.
</p>
<form class="mt-6 border border-line bg-card p-4" method="POST" use:enhance>
	<PostFields
		title={form?.title ?? ''}
		body={form?.body ?? ''}
		message={form?.missing ? '제목과 본문을 모두 적어 주세요.' : ''}
	/>
	<button class="mt-4 bg-ember px-4 py-2 text-sm font-semibold text-white">등록</button>
</form>
