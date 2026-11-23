<script>
import { resolve } from '$app/paths';
import CourseAuth from '#lib/components/CourseAuth.svelte';
let text = $state(''), question = $state('이 문서를 요약해 주세요.'), answer = $state(''), message = $state(''), busy = $state(false);
let controller;
async function submit() {
    if (busy)
        return;
    controller = new AbortController();
    busy = true;
    answer = '';
    message = '';
    try {
        const response = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, question }),
            signal: controller.signal
        });
        if (!response.ok)
            throw new Error((await response.json()).error.message);
        if (!response.body)
            throw new Error('스트림이 없습니다.');
        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        const consume = (line) => {
            if (!line.trim())
                return;
            const item = JSON.parse(line);
            if (item.error)
                throw new Error(item.error);
            answer += item.message?.content ?? '';
        };
        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done)
                    break;
                buffer += value;
                let newline;
                while ((newline = buffer.indexOf('\n')) >= 0) {
                    consume(buffer.slice(0, newline));
                    buffer = buffer.slice(newline + 1);
                }
            }
            if (buffer.trim())
                consume(buffer);
        }
        finally {
            reader.releaseLock();
        }
    }
    catch (error) {
        message = error instanceof Error ? error.message : 'AI 요청 실패';
    }
    finally {
        busy = false;
    }
}
</script>

<h1>문서 요약·질의응답</h1>
<p>최대 20,000자 문서에서 발췌를 골라 답합니다. 답변의 발췌 번호를 원문과 확인하세요.</p>
<CourseAuth />
<form
	onsubmit={(event) => {
		event.preventDefault();
		submit();
	}}
>
	<label>문서 <textarea bind:value={text} required maxlength="20000"></textarea></label>
	<label>질문 <input bind:value={question} required maxlength="500" /></label>
	<button disabled={busy}>질문 보내기</button><button
		type="button"
		onclick={() => controller?.abort()}
		disabled={!busy}>중단</button
	>
</form>
<p role="alert">{message}</p>
<pre style="white-space:pre-wrap">{answer}</pre>
<a href={resolve('/board')}>게시판</a>
