# study3 — 데이터 다루기

## ① 목표 한 줄

반응형 상태·파생 값·로컬 초안을 구분하고 새로고침 후 복원한다.

이 문서는 SvelteKit 하나만 다룬다. 실행 코드: `ts_version/project`·`js_version/project`, 기초 SSR 기존 예제는 `*/demo`다. TypeScript 전체 코드를 싣고 JavaScript는 같은 상대 위치의 `.js`·타입 없는 script로 제공한다. 프로젝트의 심화 기능은 뒤 단계를 위해 미리 존재하지만 해당 단계의 원리와 파일부터 순서대로 학습한다.

## ② 📖 이론

`$state`는 바뀌는 원본, `$derived`는 원본에서 계산한 값, `$effect`는 외부 시스템과 동기화하는 부수효과에 사용한다. 계산 가능한 값을 별도 상태에 중복 저장하면 서로 어긋난다. 가계부의 원장은 state, 합계는 derived, 종이에 출력하는 일은 effect에 비유할 수 있다.

객체와 배열 상태는 깊은 반응성을 지원한다. 하지만 구조 분해한 일반 값은 원본과 연결이 끊길 수 있다. createDraft는 getter·setter로 현재 상태를 읽고 쓰게 한다. 이 팩터리는 컴포넌트마다 새 인스턴스를 만들며 서버의 모듈 전역에 사용자 상태를 공유하지 않는다. `$state` 자체가 브라우저 전용은 아니며 컴포넌트 초기화는 SSR에서도 일어난다.

localStorage는 브라우저 저장소다. 서버 렌더링에는 window가 없으므로 onMount 안에서 읽는다. 이는 개인 브라우저 초안용이며 비밀번호·인증 토큰·공유 게시글의 원본 저장소가 아니다. 서버 파일 또는 DB는 여러 기기의 데이터를 관리하는 다른 수명이다.

## ③ 🛠️ 실기 — 전체 코드와 줄별 설명

1. createDraft가 매 호출마다 독립된 text 상태를 만드는지 확인한다.
2. `/lab`에서 초안을 쓰고 저장한 뒤 새로고침한다. onMount가 storage 값을 복원한다.
3. 다른 브라우저나 비공개 창에서는 같은 값이 공유되지 않는다.
4. 브라우저 저장소가 차단된 환경의 예외를 직접 잡아 오류 메시지를 표시하는 연습을 한다.

실행: 앱 루트에서 `npm ci` 후 `npm run dev`, 배포 산출물은 `npm run build` 후 `npm start`다. 환경 설정은 [study0](study0.md), 실행 결과와 범위는 [검증 기록](docs/verification.md)을 참고한다. 코드 블록은 실제 파일 원문이며 import된 의존 파일은 저장소에 함께 있다.



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

로컬 초안은 등록 전에만 사용하고, 등록 성공 후 서버 DB를 원본으로 삼는다. 검색 상태는 URL에, 로그인 상태는 서버 세션에 둔다. 다음 단계는 URL과 요청의 수명이다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| localStorage is not defined | SSR에서 브라우저 API 실행 | onMount 또는 이벤트에서 실행 |
| 다른 사용자 상태가 섞임 | 서버 모듈 전역에 사용자별 state 저장 | 요청 locals·컴포넌트 팩터리로 격리 |

## ⑥ 직접 해보기

1. 초안 삭제 버튼을 만들자.
2. 두 개의 createDraft 인스턴스가 독립적인지 확인하자.
3. 저장 불가 환경에서 try/catch로 안내하자.

## ⑦ ☐ 체크리스트

- [ ] state·derived·effect 역할 구분
- [ ] 브라우저 저장소 복원
- [ ] 서버 요청 간 사용자 상태 격리

## ⑧ 다음 단계 연결 문장

이 단계의 결과를 [study4](study4.md)에 연결한다. 다음 단계는 URL과 요청의 수명이다.

공식 자료: [SvelteKit 문서](https://svelte.dev/docs/kit). 상세 출처는 [README](README.md)의 공식 자료와 노션 원문 링크를 따른다.
