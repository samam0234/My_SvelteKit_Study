<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<div class="flex items-end justify-between gap-4">
	<h1 class="text-3xl font-semibold tracking-tight">메모</h1>
	<a class="bg-pine px-3 py-2 text-sm font-semibold text-paper" href="/notes/new">새 메모</a>
</div>
<ul class="mt-6 divide-y divide-line border border-line bg-card">
	{#each data.notes as note (note.id)}
		<li>
			<a class="block px-4 py-3 hover:bg-paper" href="/notes/{note.id}">
				<span class="font-semibold">{note.title}</span>
				<span class="mt-1 block text-xs text-stone-500">{note.authorName}</span>
			</a>
		</li>
	{/each}
</ul>
