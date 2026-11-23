<script>
let { title, children, onchange } = $props();
</script>

<section>
	<h2>{title}</h2>
	{@render children?.()}<button onclick={() => onchange?.(title)}>선택</button>
</section>
