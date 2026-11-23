<script>
import { invalidateAll } from '$app/navigation';
let email = $state(''), password = $state(''), nickname = $state(''), message = $state(''), busy = $state(false);
async function submit(kind) {
    if (busy)
        return;
    busy = true;
    message = '';
    try {
        const response = await fetch('/api/auth/' + kind, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email, password, nickname })
        });
        const result = response.status === 204 ? null : await response.json();
        if (!response.ok)
            throw new Error(result.error.message);
        message = kind === 'signup' ? '가입했습니다. 로그인하세요.' : '완료했습니다.';
        password = '';
        await invalidateAll();
    }
    catch (error) {
        message = error instanceof Error ? error.message : '요청 실패';
    }
    finally {
        busy = false;
    }
}
</script>

<form
	onsubmit={(event) => {
		event.preventDefault();
		submit('login');
	}}
>
	<fieldset disabled={busy}>
		<legend>게시판 계정 (학습용 메모 계정과 별도)</legend>
		<label>이메일 <input type="email" autocomplete="username" bind:value={email} required /></label>
		<label
			>비밀번호 <input
				type="password"
				autocomplete="current-password"
				bind:value={password}
				minlength="10"
				required
			/></label
		>
		<label>닉네임 <input bind:value={nickname} /></label>
		<button>로그인</button>
		<button type="button" onclick={() => submit('signup')}>회원가입</button>
		<button type="button" onclick={() => submit('logout')}>로그아웃</button>
	</fieldset>
</form>
<p role="status">{message}</p>
