<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const links = [
		['/about', '소개'],
		['/hello/kit', '인사'],
		['/posts', '게시판']
	] as const;
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
		<nav class="flex flex-wrap justify-end gap-x-4 gap-y-1 text-sm">
			{#each links as [href, label] (href)}
				<a {href} class={page.url.pathname === href ? 'font-semibold text-ember' : ''}>{label}</a>
			{/each}
		</nav>
	</header>
	<main class="flex-1 py-8">
		{@render children()}
	</main>
	<footer class="border-t border-line py-4 text-xs text-stone-600">
		demo · 폴더 이름이 URL입니다 · {page.url.pathname}
	</footer>
</div>
