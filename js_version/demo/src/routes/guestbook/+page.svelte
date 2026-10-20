<script>
	import { enhance } from '$app/forms';

	let { data, form } = $props();
</script>

<p class="text-sm font-semibold text-ember">study4 · form action</p>
<h1 class="mt-2 text-3xl font-semibold tracking-tight">방명록</h1>
<p class="mt-4 leading-7">
	<code>&lt;form method="POST"&gt;</code>는 JavaScript 없이도 <code>actions.default</code>를 호출합니다.
	<code>use:enhance</code>는 JS가 있을 때 새로고침 없이 같은 일을 하게 합니다.
</p>

<form class="mt-6 border border-line bg-card p-4" method="POST" use:enhance>
	{#if form?.missing}
		<p class="mb-3 text-sm text-ember">이름과 메시지를 모두 적어 주세요.</p>
	{/if}
	<label class="block text-sm">
		이름
		<input class="mt-1 w-full" name="name" value={form?.name ?? ''} />
	</label>
	<label class="mt-3 block text-sm">
		메시지
		<textarea class="mt-1 w-full" name="message" rows="3">{form?.message ?? ''}</textarea>
	</label>
	<button class="mt-4 bg-ember px-4 py-2 text-sm font-semibold text-white">남기기</button>
</form>

<ul class="mt-6 divide-y divide-line border border-line bg-card">
	{#each data.entries as entry (entry.id)}
		<li class="px-4 py-3">
			<p class="text-sm font-semibold">{entry.name}</p>
			<p class="mt-1">{entry.message}</p>
		</li>
	{:else}
		<li class="px-4 py-3 text-sm text-stone-600">아직 메시지가 없습니다.</li>
	{/each}
</ul>
