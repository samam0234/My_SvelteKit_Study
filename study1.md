# study1 — Hello World와 기본 문법

## ① 목표 한 줄

첫 SSR 화면과 템플릿 보간·조건·리스트를 읽고 수정한다.

이 문서는 SvelteKit 하나만 다룬다. 실행 코드: `ts_version/project`·`js_version/project`, 기초 SSR 기존 예제는 `*/demo`다. TypeScript 전체 코드를 싣고 JavaScript는 같은 상대 위치의 `.js`·타입 없는 script로 제공한다. 프로젝트의 심화 기능은 뒤 단계를 위해 미리 존재하지만 해당 단계의 원리와 파일부터 순서대로 학습한다.

## ② 📖 이론

Svelte 파일은 script(계산), HTML 형태의 템플릿(표시), style(모양)을 한 단위로 묶는다. `{name}`은 값을 텍스트로 표시하며 기본적으로 HTML을 이스케이프한다. `{#if}`는 조건, `{#each ... (id)}`는 식별자가 있는 반복이다. 이름표가 붙은 서랍처럼 key는 항목이 이동해도 같은 DOM 상태를 이어 준다.

`$state(0)`은 반응형 상태이고 `$derived(count * 2)`는 상태에서 계산한 값이다. 일반 `let`만 바꾸면 화면이 갱신된다고 가정하면 안 된다. `onclick`은 DOM 이벤트, `bind:value`는 입력값과 상태 연결이다. `{@html}`은 신뢰하지 않는 입력에 쓰지 않는다.

서버 load가 첫 데이터를 만들면 HTML 소스에 값이 보인다. 유니버설 load도 SSR 시 서버에서 실행될 수 있다. 노션의 ‘서버 load 값만 첫 HTML에 들어간다’는 설명은 너무 좁으므로 이렇게 바로잡는다.

## ③ 🛠️ 실기 — 전체 코드와 줄별 설명

1. demo를 실행하고 `/`의 서버 시각과 페이지 소스를 비교한다.
2. project의 `/lab`에서 이름을 바꾸고 카운터를 누른다. 이름은 바인딩, 두 배 숫자는 파생 상태다.
3. 브라우저 개발자도구 Elements·Console·Network를 연다. 카운터 클릭마다 API 요청이 생기지 않는지 확인한다.
4. `Hello` 문구를 저장하고 Vite의 HMR로 화면이 바뀌는지 확인한다. HMR은 전체 새로고침과 다르며 일부 상태가 보존될 수 있다.

실행: 앱 루트에서 `npm ci` 후 `npm run dev`, 배포 산출물은 `npm run build` 후 `npm start`다. 환경 설정은 [study0](study0.md), 실행 결과와 범위는 [검증 기록](docs/verification.md)을 참고한다. 코드 블록은 실제 파일 원문이며 import된 의존 파일은 저장소에 함께 있다.



### `src/routes/lab/+page.svelte` 전체 코드

[실제 파일](ts_version/project/src/routes/lab/+page.svelte) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```svelte
<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import StudyCard from '#lib/components/StudyCard.svelte';
	import { createDraft } from '#lib/course/draft.svelte.js';
	let name = $state('SvelteKit'),
		count = $state(0),
		selected = $state('');
	const double = $derived(count * 2),
		draft = createDraft();
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
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | 컴포넌트 스크립트 구간의 경계를 정한다. |
| 2 | `$app/paths`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | `svelte`에서 필요한 함수·컴포넌트를 가져온다. |
| 4 | `#lib/components/StudyCard.svelte`에서 필요한 함수·컴포넌트를 가져온다. |
| 5 | `#lib/course/draft.svelte.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 6 | 사용자가 바꿀 원본을 반응형 상태로 선언한다. 값 변경이 연결된 화면을 갱신한다. |
| 7 | 사용자가 바꿀 원본을 반응형 상태로 선언한다. 값 변경이 연결된 화면을 갱신한다. |
| 8 | 사용자가 바꿀 원본을 반응형 상태로 선언한다. 값 변경이 연결된 화면을 갱신한다. |
| 9 | 원본 상태에서 파생 값을 계산한다. 중복 상태를 따로 저장하지 않는다. |
| 10 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 11 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 12 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 13 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 14 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 15 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 16 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 17 | 컴포넌트 스크립트 구간의 경계를 정한다. |
| 18 | 가독성을 위해 구간을 나누는 빈 줄이다. |
| 19 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 20 | 입력 요소와 컴포넌트 상태를 양방향으로 연결한다. |
| 21 | 사용자 동작을 함수로 연결한다. 비동기 작업 중 중복 실행 여부를 확인한다. |
| 22 | 조건에 맞는 UI만 렌더하거나 빈 상태를 표시한다. |
| 23 | id/key를 기준으로 목록 항목의 DOM과 상태를 연결한다. |
| 24 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 25 | 사용자 동작을 함수로 연결한다. 비동기 작업 중 중복 실행 여부를 확인한다. |
| 26 | id/key를 기준으로 목록 항목의 DOM과 상태를 연결한다. |
| 27 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 28 | 입력 요소와 컴포넌트 상태를 양방향으로 연결한다. |
| 29 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 30 | 사용자 동작을 함수로 연결한다. 비동기 작업 중 중복 실행 여부를 확인한다. |
| 31 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |

## ④ 🔗 연동 포인트

템플릿은 props·load 결과를 표시하는 출구다. 다음 단계에서 같은 문법을 자식 컴포넌트로 분리하고 서버 데이터도 같은 data prop으로 받는다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| 값은 바뀌는데 화면은 그대로 | 일반 변수에 상태를 저장함 | $state로 선언한다 |
| 페이지 소스와 화면 값이 다름 | SSR 이후 브라우저 상태가 바뀜 | 초기 HTML과 hydration 이후 상태를 나누어 확인한다 |

## ⑥ 직접 해보기

1. 카운터가 10 이상이면 메시지를 표시하자.
2. each 배열의 항목을 바꾸고 key의 역할을 설명하자.

## ⑦ ☐ 체크리스트

- [ ] 첫 화면·페이지 소스·HMR 확인
- [ ] if·each·보간·bind 사용

## ⑧ 다음 단계 연결 문장

이 단계의 결과를 [study2](study2.md)에 연결한다. 다음 단계에서 같은 문법을 자식 컴포넌트로 분리하고 서버 데이터도 같은 data prop으로 받는다.

공식 자료: [SvelteKit 문서](https://svelte.dev/docs/kit). 상세 출처는 [README](README.md)의 공식 자료와 노션 원문 링크를 따른다.
