<script lang="ts">
	import Counter from '#lib/components/Counter.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<p class="text-sm font-semibold text-ember">study1</p>
<h1 class="mt-2 text-3xl font-semibold tracking-tight">서버가 먼저 그린 페이지</h1>
<p class="mt-4 leading-7">
	이 시각은 브라우저 <code>Date</code>가 아니라 <code>+page.server.ts</code>의 <code>load</code>가
	만들었습니다. 페이지 소스(HTML) 안에 같은 문자열이 들어 있습니다.
</p>
<p class="mt-6 border border-line bg-card px-4 py-3 font-mono text-sm">{data.renderedAt}</p>
<div class="mt-8 border border-line bg-card p-4">
	<Counter />
</div>
<p class="mt-4 text-sm text-stone-600">
	푸터의 경로는 <code>$app/state</code>의 <code>page.url</code>입니다. 클릭만으로 바뀌고 서버 데이터는
	아닙니다.
</p>
