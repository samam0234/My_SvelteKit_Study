<script lang="ts">
	let {
		title = '',
		body = '',
		message = ''
	}: { title?: string; body?: string; message?: string } = $props();
</script>

{#if message}
	<p class="mb-3 text-sm text-ember">{message}</p>
{/if}
<label class="block text-sm">
	제목
	<input class="mt-1 w-full" name="title" value={title} />
</label>
<label class="mt-3 block text-sm">
	본문
	<textarea class="mt-1 w-full" name="body" rows="8">{body}</textarea>
</label>
