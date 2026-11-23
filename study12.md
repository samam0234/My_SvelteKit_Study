# study12 — 프론트·UI 연동

## ① 목표 한 줄

Bits UI·Superforms·공유 상태를 SvelteKit 폼과 연결한다.

이 문서는 SvelteKit 하나만 다룬다. 실행 코드: `ts_version/project`·`js_version/project`, 기초 SSR 기존 예제는 `*/demo`다. TypeScript 전체 코드를 싣고 JavaScript는 같은 상대 위치의 `.js`·타입 없는 script로 제공한다. 프로젝트의 심화 기능은 뒤 단계를 위해 미리 존재하지만 해당 단계의 원리와 파일부터 순서대로 학습한다.

## ② 📖 이론

UI 라이브러리는 다이얼로그의 포커스·키보드 이동 같은 상호작용을 재사용하게 한다. 상태 관리는 입력 원본과 파생 값을 한곳에서 관리한다. 폼 라이브러리는 값·오류·전송 상태를 묶는다. 세 도구는 예쁜 외관만이 아니라 반복되는 상호작용 규칙을 줄이는 역할이다.

이 과정은 Tailwind 스타일, Bits UI Dialog, Superforms의 zod4 adapter를 사용한다. 서버에서 superValidate가 schema를 적용하고 브라우저 superForm이 form·errors·submitting·enhance를 제공한다. 보안 검증은 여전히 서버 service에 남는다. 입력 폼의 성공 200과 API 생성 201은 서로 다른 입출력 계층이다.

SvelteKit 3 호환성을 위해 transitive runed를 0.38.0으로 고정한 override를 package.json에 기록했다. lockfile을 설치 기준으로 삼고 갱신 시 다이얼로그 열기·Esc·포커스 복원을 다시 확인한다. 모듈 전역에 사용자 상태 singleton을 두지 말고 createDraft처럼 인스턴스를 만든다.

## ③ 🛠️ 실기 — 전체 코드와 줄별 설명

1. `/board`에서 로그인하고 `/ui`를 연다.
2. Dialog를 키보드로 열고 Esc로 닫아 원래 trigger로 포커스가 돌아오는지 확인한다.
3. 빈 제목으로 제출해 서버 오류와 errors 표시를 확인한다.
4. 정상 제목·본문을 저장하고 `/board` 목록에 같은 글이 생기는지 확인한다.
5. 라이브러리를 추가한 뒤 npm ls·타입 검사·빌드로 peer·bundle 영향을 확인한다.

실행: 앱 루트에서 `npm ci` 후 `npm run dev`, 배포 산출물은 `npm run build` 후 `npm start`다. 환경 설정은 [study0](study0.md), 실행 결과와 범위는 [검증 기록](docs/verification.md)을 참고한다. 코드 블록은 실제 파일 원문이며 import된 의존 파일은 저장소에 함께 있다.



### `src/routes/ui/+page.server.ts` 전체 코드

[실제 파일](ts_version/project/src/routes/ui/+page.server.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { fail } from '@sveltejs/kit';
import { postSchema } from '#lib/course/schema.js';
import { write } from '#lib/server/course/service.js';
import { ApiError } from '#lib/server/course/errors.js';
import type { Actions, PageServerLoad } from './$types';
export const load: PageServerLoad = async () => ({ form: await superValidate(zod4(postSchema)) });
export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(postSchema));
		if (!form.valid) return fail(400, { form });
		try {
			await write(form.data, locals.member);
			return { form };
		} catch (error) {
			if (error instanceof ApiError) return fail(error.status, { form, message: error.message });
			throw error;
		}
	}
};
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `sveltekit-superforms`에서 필요한 함수·컴포넌트를 가져온다. |
| 2 | `sveltekit-superforms/adapters`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | `@sveltejs/kit`에서 필요한 함수·컴포넌트를 가져온다. |
| 4 | `#lib/course/schema.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 5 | `#lib/server/course/service.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 6 | `#lib/server/course/errors.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 7 | `./$types`에서 필요한 타입만 가져와 실행 번들에 넣지 않는다. |
| 8 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 9 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 10 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 11 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 12 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 13 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 14 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 15 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 16 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 17 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 18 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 19 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 20 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 21 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

### `src/routes/ui/+page.svelte` 전체 코드

[실제 파일](ts_version/project/src/routes/ui/+page.svelte) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```svelte
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
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | 컴포넌트 스크립트 구간의 경계를 정한다. |
| 2 | `$app/paths`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | `bits-ui`에서 필요한 함수·컴포넌트를 가져온다. |
| 4 | `sveltekit-superforms`에서 필요한 함수·컴포넌트를 가져온다. |
| 5 | `./$types`에서 필요한 타입만 가져와 실행 번들에 넣지 않는다. |
| 6 | 부모 또는 라우터에서 받은 props를 읽는다. 상태의 전달 경계다. |
| 7 | 이어지는 코드의 제약 또는 의도를 설명하는 주석이다. |
| 8 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 9 | 컴포넌트 스크립트 구간의 경계를 정한다. |
| 10 | 가독성을 위해 구간을 나누는 빈 줄이다. |
| 11 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 12 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 13 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 14 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 15 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 16 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 17 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 18 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 19 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 20 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 21 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 22 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 23 | 조건에 맞는 UI만 렌더하거나 빈 상태를 표시한다. |
| 24 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 25 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 26 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 27 | 조건에 맞는 UI만 렌더하거나 빈 상태를 표시한다. |
| 28 | 조건에 맞는 UI만 렌더하거나 빈 상태를 표시한다. |
| 29 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 30 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 31 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 32 | 조건에 맞는 UI만 렌더하거나 빈 상태를 표시한다. |
| 33 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 34 | 조건에 맞는 UI만 렌더하거나 빈 상태를 표시한다. |
| 35 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |

### `src/lib/course/draft.svelte.ts` 전체 코드

[실제 파일](ts_version/project/src/lib/course/draft.svelte.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
export function createDraft() {
	let text = $state('');
	return {
		get text() {
			return text;
		},
		set text(value: string) {
			text = value;
		},
		get length() {
			return text.length;
		}
	};
}
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 2 | 사용자가 바꿀 원본을 반응형 상태로 선언한다. 값 변경이 연결된 화면을 갱신한다. |
| 3 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 4 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 5 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 6 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 7 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 8 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 9 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 10 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 11 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 12 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 13 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 14 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

## ④ 🔗 연동 포인트

schema와 service를 재사용해 UI 라이브러리를 추가해도 API 규칙을 유지한다. 다음 단계에서는 입력 결과를 외부 서비스와 연결한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| 라이브러리 설치 후 peer 충돌 | Kit 2용 하위 의존성 포함 | lockfile·runed override 확인 후 상호작용 검사 |
| 저장 실패가 화면에 안 보임 | action message를 표시하지 않음 | form.message와 action 결과를 함께 확인 |

## ⑥ 직접 해보기

1. Dialog에 접근성 설명을 추가하자.
2. 서버 오류 메시지를 폼 아래 표시하자.
3. UI 페이지 방문 전후 Network의 전송 크기를 비교하자.

## ⑦ ☐ 체크리스트

- [ ] UI·상태·폼 라이브러리 연결
- [ ] 서버 검증 유지
- [ ] 키보드·포커스·전송 잠금

## ⑧ 다음 단계 연결 문장

이 단계의 결과를 [study13](study13.md)에 연결한다. 다음 단계에서는 입력 결과를 외부 서비스와 연결한다.

공식 자료: [SvelteKit 문서](https://svelte.dev/docs/kit). 상세 출처는 [README](README.md)의 공식 자료와 노션 원문 링크를 따른다.
