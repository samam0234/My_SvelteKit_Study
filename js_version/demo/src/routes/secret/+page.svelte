<script>
	let { data } = $props();
</script>

<p class="text-sm font-semibold text-ember">study7 · hooks.server</p>
<h1 class="mt-2 text-3xl font-semibold tracking-tight">비밀 페이지</h1>
<p class="mt-4 leading-7">
	<code>handle</code>이 쿠키를 읽어 <code>locals.user</code>에 넣습니다. 로그인하지 않으면 이 문장 대신
	<code>/login</code>으로 갑니다. 지금 사용자는 {data.user.name}입니다.
</p>
