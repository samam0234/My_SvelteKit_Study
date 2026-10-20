<script>
	import { page } from '$app/state';
</script>

<p class="text-sm font-semibold text-ember">study2 · 동적 세그먼트</p>
<h1 class="mt-2 text-3xl font-semibold tracking-tight">안녕, {page.params.name}</h1>
<p class="mt-4 leading-7">
	폴더 이름 <code>[name]</code>이 URL 한 칸입니다. <code>/hello/kit</code>이면
	<code>page.params.name</code>은 <code>kit</code>입니다. 주소창의 마지막 칸을 바꿔 보세요.
</p>
