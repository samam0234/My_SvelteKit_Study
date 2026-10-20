<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<p class="text-sm font-semibold text-ember">study6 · 세션 쿠키</p>
<h1 class="mt-2 text-3xl font-semibold tracking-tight">가입</h1>

<form class="mt-6 border border-line bg-card p-4" method="POST" use:enhance>
	{#if form?.invalid}
		<p class="mb-3 text-sm text-ember">이름, 이메일, 8자 이상 비밀번호가 필요합니다.</p>
	{/if}
	{#if form?.taken}
		<p class="mb-3 text-sm text-ember">이미 있는 이메일입니다.</p>
	{/if}
	<label class="block text-sm">
		이름
		<input class="mt-1 w-full" name="name" value={form?.name ?? ''} />
	</label>
	<label class="mt-3 block text-sm">
		이메일
		<input class="mt-1 w-full" name="email" type="email" value={form?.email ?? ''} />
	</label>
	<label class="mt-3 block text-sm">
		비밀번호
		<input class="mt-1 w-full" name="password" type="password" />
	</label>
	<button class="mt-4 bg-ember px-4 py-2 text-sm font-semibold text-white">가입하고 로그인</button>
</form>
