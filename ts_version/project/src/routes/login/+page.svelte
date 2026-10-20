<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<h1 class="text-3xl font-semibold tracking-tight">로그인</h1>
<p class="mt-4 text-sm leading-6 text-stone-600">
	시드 계정은 <code>demo@example.com</code> / <code>demo1234</code> 입니다.
</p>
<form class="mt-6 border border-line bg-card p-4" method="POST" use:enhance>
	{#if form?.invalid}
		<p class="mb-3 text-sm text-pine">이메일 또는 비밀번호가 맞지 않습니다.</p>
	{/if}
	<label class="block text-sm">
		이메일
		<input class="mt-1 w-full" name="email" type="email" value={form?.email ?? ''} />
	</label>
	<label class="mt-3 block text-sm">
		비밀번호
		<input class="mt-1 w-full" name="password" type="password" />
	</label>
	<button class="mt-4 bg-pine px-4 py-2 text-sm font-semibold text-paper">로그인</button>
</form>
