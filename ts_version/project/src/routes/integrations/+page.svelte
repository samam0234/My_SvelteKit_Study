<script lang="ts">
	import { resolve } from '$app/paths';
	import CourseAuth from '#lib/components/CourseAuth.svelte';
	let message = $state(''),
		busy = $state(false),
		file: File | undefined = $state();
	async function send(kind: string) {
		if (busy) return;
		busy = true;
		try {
			const form = new FormData();
			if (file) form.set('file', file);
			const response = await fetch('/api/integrations/' + kind, {
				method: 'POST',
				headers: kind === 'upload' ? {} : { 'content-type': 'application/json' },
				body: kind === 'upload' ? form : JSON.stringify({ key: crypto.randomUUID() })
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.error.message);
			message = JSON.stringify(result.data);
			if (kind === 'checkout' && result.data.url) window.location.assign(result.data.url);
		} catch (error) {
			message = error instanceof Error ? error.message : '요청 실패';
		} finally {
			busy = false;
		}
	}
</script>

<h1>외부 서비스 실습</h1>
<CourseAuth /><a href={resolve('/oauth/github')}>GitHub으로 로그인</a>
<p>
	메일은 로그인한 본인에게만 보냅니다. 결제는 테스트 모드만 허용합니다. 결제 반환 화면은 결제 완료
	증명이 아닙니다.
</p>
<button disabled={busy} onclick={() => send('mail')}>내 이메일로 확인 메일</button><button
	disabled={busy}
	onclick={() => send('checkout')}>테스트 결제</button
>
<label
	>텍스트 파일 <input
		type="file"
		accept=".txt,.md"
		onchange={(event) => (file = event.currentTarget.files?.[0])}
	/></label
>
<button disabled={busy || !file} onclick={() => send('upload')}>파일 업로드</button>
<p role="status">{message}</p>
