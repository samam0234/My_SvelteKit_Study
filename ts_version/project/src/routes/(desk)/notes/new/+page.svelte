<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<h1 class="text-3xl font-semibold tracking-tight">새 메모</h1>
<p class="mt-2 text-sm text-stone-600">{data.user?.name} 이름으로 남습니다.</p>
<form class="mt-6 border border-line bg-card p-4" method="POST" use:enhance>
	{#if form?.missing}
		<p class="mb-3 text-sm text-pine">제목과 본문을 모두 적어 주세요.</p>
	{/if}
	<label class="block text-sm">
		제목
		<input class="mt-1 w-full" name="title" value={form?.title ?? ''} />
	</label>
	<label class="mt-3 block text-sm">
		본문
		<textarea class="mt-1 w-full" name="body" rows="8">{form?.body ?? ''}</textarea>
	</label>
	<button class="mt-4 bg-pine px-4 py-2 text-sm font-semibold text-paper">남기기</button>
</form>
