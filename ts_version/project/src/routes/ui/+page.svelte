<script lang="ts">
	import { resolve } from '$app/paths';
	import { Dialog } from 'bits-ui';
	import { superForm } from 'sveltekit-superforms';
	import type { PageProps } from './$types';
	let { data, form: actionResult }: PageProps = $props();
	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, submitting } = superForm(data.form);
</script>

<h1>UI·폼 라이브러리</h1>
<Dialog.Root
	><Dialog.Trigger>입력 도움말</Dialog.Trigger><Dialog.Portal
		><Dialog.Overlay class="fixed inset-0 bg-black/20" /><Dialog.Content
			class="fixed top-1/4 left-1/4 bg-white p-8"
			><Dialog.Title>서버 검증</Dialog.Title><Dialog.Description
				>제목 1~200자, 본문 1~20000자. 게시판에서 먼저 로그인하세요.</Dialog.Description
			><Dialog.Close>닫기</Dialog.Close></Dialog.Content
		></Dialog.Portal
	></Dialog.Root
>
<form method="POST" use:enhance>
	<label>제목 <input name="title" bind:value={$form.title} /></label>{#if $errors.title}<p
			role="alert"
		>
			{$errors.title.join(', ')}
		</p>{/if}
	<label>본문 <textarea name="body" bind:value={$form.body}></textarea></label>{#if $errors.body}<p
			role="alert"
		>
			{$errors.body.join(', ')}
		</p>{/if}<button disabled={$submitting}>저장</button>
</form>
{#if actionResult && 'message' in actionResult}<p role="alert">{actionResult.message}</p>{/if}
<a href={resolve('/board')}>게시판·로그인</a>
