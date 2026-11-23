<script lang="ts">
	import './layout.css';
	import './course.css';
	import favicon from '#lib/assets/favicon.svg';
	import { SITE_NAME } from '$app/env/public';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const links = [
		[resolve('/(marketing)/about'), '소개'],
		[resolve('/board'), '게시판'],
		[resolve('/(desk)/notes'), '이전 메모 실습']
	] as const;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{SITE_NAME}</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-3xl flex-col px-5">
	<header
		class="flex flex-col items-start justify-between gap-4 border-b border-line py-5 sm:flex-row sm:items-center"
	>
		<a
			href={resolve('/(marketing)')}
			class="flex items-center gap-2 font-semibold tracking-tight whitespace-nowrap"
		>
			<span class="inline-block size-3 bg-pine"></span>
			{SITE_NAME}
		</a>
		<nav class="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
			{#each links as [href, label] (href)}
				<a {href} class={page.url.pathname === href ? 'font-semibold text-pine' : ''}
					>{label}</a
				>
			{/each}
			{#if data.member}
				<span class="text-stone-600">{data.member.nickname}</span>
				<a href={resolve('/board')}>게시판 계정</a>
			{:else if data.user}
				<span class="text-stone-600">{data.user.name}</span>
				<form method="POST" action="/logout" use:enhance>
					<button class="underline">로그아웃</button>
				</form>
			{:else}
				<a href={resolve('/board')}>게시판 로그인·가입</a>
				<a href={resolve('/login')}>이전 메모 로그인</a>
			{/if}
		</nav>
	</header>
	<main class="flex-1 py-8">
		{@render children()}
	</main>
	<footer class="border-t border-line py-4 text-xs text-stone-600">{page.url.pathname}</footer>
</div>
