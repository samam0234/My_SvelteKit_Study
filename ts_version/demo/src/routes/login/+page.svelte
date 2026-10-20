<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<p class="text-sm font-semibold text-ember">study6 · 세션 쿠키</p>
<h1 class="mt-2 text-3xl font-semibold tracking-tight">로그인</h1>
<p class="mt-4 text-sm leading-6 text-stone-600">
	처음이면 <code>demo@example.com</code> / <code>demo1234</code> 로 들어갈 수 있습니다. 비밀번호는 서버에
	bcrypt 해시로만 있습니다.
</p>

<form class="mt-6 border border-line bg-card p-4" method="POST" use:enhance>
	{#if form?.invalid}
		<p class="mb-3 text-sm text-ember">이메일 또는 비밀번호가 맞지 않습니다.</p>
	{/if}
	<label class="block text-sm">
		이메일
		<input class="mt-1 w-full" name="email" type="email" value={form?.email ?? ''} />
	</label>
	<label class="mt-3 block text-sm">
		비밀번호
		<input class="mt-1 w-full" name="password" type="password" />
	</label>
	<button class="mt-4 bg-ember px-4 py-2 text-sm font-semibold text-white">로그인</button>
</form>
<p class="mt-4 text-sm">
	계정이 없으면 <a class="underline" href="/register">가입</a>
</p>
