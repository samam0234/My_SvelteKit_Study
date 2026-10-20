<script lang="ts">
	import { page } from '$app/state';
</script>

<h1 class="text-3xl font-semibold tracking-tight">{page.status}</h1>
<p class="mt-4 leading-7">{page.error?.message}</p>
<p class="mt-6 text-sm"><a class="underline" href="/">홈으로</a></p>
