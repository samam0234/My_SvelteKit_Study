<script>
	import { page } from '$app/state';
</script>

<p class="text-sm text-stone-600">id = {page.params.id}</p>
<h1 class="mt-2 text-3xl font-semibold tracking-tight">글 {page.params.id}</h1>
<p class="mt-4 leading-7">
	아직 파일에서 글을 읽지 않습니다. <code>[id]</code>가 URL에서 넘어오는지만 확인합니다.
	<code>/posts/1</code>과 <code>/posts/2</code>를 오가면 숫자만 바뀌고, 위 레이아웃 문구는 유지됩니다.
</p>
<p class="mt-6"><a class="text-sm underline" href="/posts">목록</a></p>
