<script>
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>SvelteKit 실습</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-3xl flex-col px-5">
	<header class="flex items-center justify-between border-b border-line py-5">
		<a href="/" class="flex items-center gap-2 font-semibold tracking-tight">
			<span class="inline-block size-3 bg-ember"></span>
			SvelteKit 실습
		</a>
	</header>
	<main class="flex-1 py-8">
		{@render children()}
	</main>
	<footer class="border-t border-line py-4 text-xs text-stone-600">
		demo · 서버가 HTML을 먼저 만듭니다
	</footer>
</div>
