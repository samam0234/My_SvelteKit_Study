<script>
	let { children } = $props();
</script>

<p class="text-xs font-semibold tracking-wide text-pine">책상</p>
<div class="mt-4">
	{@render children()}
</div>
