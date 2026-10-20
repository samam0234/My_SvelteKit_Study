<script>
	let { data } = $props();
</script>

<p class="text-sm font-semibold text-ember">study1</p>
<h1 class="mt-2 text-3xl font-semibold tracking-tight">서버가 먼저 그린 페이지</h1>
<p class="mt-4 leading-7">
	이 시각은 브라우저 <code>Date</code>가 아니라 <code>+page.server.js</code>의 <code>load</code>가
	만들었습니다. 페이지 소스(HTML) 안에 같은 문자열이 들어 있습니다.
</p>
<p class="mt-6 border border-line bg-card px-4 py-3 font-mono text-sm">{data.renderedAt}</p>
