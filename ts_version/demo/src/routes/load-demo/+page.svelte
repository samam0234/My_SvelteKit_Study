<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<p class="text-sm font-semibold text-ember">study3 · load</p>
<h1 class="mt-2 text-3xl font-semibold tracking-tight">서버 load와 유니버설 load</h1>
<dl class="mt-6 space-y-3 border border-line bg-card p-4 text-sm">
	<div>
		<dt class="text-stone-500">generatedAt (+page.server)</dt>
		<dd class="font-mono">{data.generatedAt}</dd>
	</div>
	<div>
		<dt class="text-stone-500">secretNote (서버 파일에만 있는 문장)</dt>
		<dd>{data.secretNote}</dd>
	</div>
	<div>
		<dt class="text-stone-500">serverOnlySentence (#lib/server/vault)</dt>
		<dd>{data.serverOnlySentence}</dd>
	</div>
	<div>
		<dt class="text-stone-500">ranOn (+page.ts, 유니버설)</dt>
		<dd class="font-mono">{data.ranOn}</dd>
	</div>
</dl>
<p class="mt-4 leading-7 text-sm">
	첫 요청의 <code>ranOn</code>은 <code>server</code>입니다. 다른 페이지에서 이 링크로 들어오면 유니버설
	load가 브라우저에서 다시 돌아 <code>browser</code>가 될 수 있습니다. 비밀 문장을 유니버설 load에 두면
	그 코드가 브라우저로 갑니다. 그래서 비밀은 <code>+page.server</code>에 둡니다.
</p>
