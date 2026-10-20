<script>
	import { enhance } from '$app/forms';
</script>

<h1 class="text-3xl font-semibold tracking-tight">로그아웃</h1>
<form class="mt-6" method="POST" use:enhance>
	<button class="bg-ink px-4 py-2 text-sm font-semibold text-paper">세션 쿠키 지우기</button>
</form>
