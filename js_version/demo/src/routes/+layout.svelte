<script>
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	let { children, data } = $props();

	const links = [
		['/about', '소개'],
		['/hello/kit', '인사'],
		['/posts', '게시판'],
		['/load-demo', 'load'],
		['/external', '외부 API'],
		['/guestbook', '방명록']
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>SvelteKit 실습</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-3xl flex-col px-5">
	<header class="flex items-center justify-between gap-4 border-b border-line py-5">
		<a href="/" class="flex items-center gap-2 font-semibold tracking-tight">
			<span class="inline-block size-3 bg-ember"></span>
			SvelteKit 실습
		</a>
		<nav class="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
			{#each links as [href, label] (href)}
				<a {href} class={page.url.pathname === href ? 'font-semibold text-ember' : ''}>{label}</a>
			{/each}
			{#if data.user}
				<span class="text-stone-600">{data.user.name}</span>
				<form method="POST" action="/logout" use:enhance>
					<button class="underline">로그아웃</button>
				</form>
			{:else}
				<a href="/login">로그인</a>
				<a href="/register">가입</a>
			{/if}
		</nav>
	</header>
	<main class="flex-1 py-8">
		{@render children()}
	</main>
	<footer class="border-t border-line py-4 text-xs text-stone-600">
		demo · 폴더 이름이 URL입니다 · {page.url.pathname}
	</footer>
</div>
