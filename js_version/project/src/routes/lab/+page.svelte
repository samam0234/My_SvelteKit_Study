<script>
import { resolve } from '$app/paths';
import { onMount } from 'svelte';
import StudyCard from '#lib/components/StudyCard.svelte';
import { createDraft } from '#lib/course/draft.svelte.js';
let name = $state('SvelteKit'), count = $state(0), selected = $state('');
const double = $derived(count * 2), draft = createDraft();
onMount(() => {
    draft.text = localStorage.getItem('course-draft') ?? '';
});
function save() {
    localStorage.setItem('course-draft', draft.text);
}
</script>

<h1>Hello {name}</h1>
<label>이름 <input bind:value={name} /></label>
<button onclick={() => count++}>{count} × 2 = {double}</button>
{#if count > 3}<p>세 번 이상 눌렀습니다.</p>{/if}
{#each ['컴포넌트', '상태', '서버'] as title (title)}<StudyCard
		{title}
		onchange={(value) => (selected = value)}>{title} 실습</StudyCard
	>{/each}
<p>선택: {selected}</p>
<label>로컬 초안 <textarea bind:value={draft.text}></textarea></label>
<p>{draft.length}자</p>
<button onclick={save}>이 브라우저에 저장</button>
<a href={resolve('/board')}>게시판</a> · <a href={resolve('/realtime')}>실시간 실습</a>
