<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		title,
		children,
		onchange
	}: { title: string; children?: Snippet; onchange?: (value: string) => void } = $props();
</script>

<section>
	<h2>{title}</h2>
	{@render children?.()}<button onclick={() => onchange?.(title)}>선택</button>
</section>
