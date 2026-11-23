# study2 — 핵심 구조

## ① 목표 한 줄

컴포넌트·모듈·레이아웃을 나누고 props와 콜백으로 연결한다.

이 문서는 SvelteKit 하나만 다룬다. 실행 코드: `ts_version/project`·`js_version/project`, 기초 SSR 기존 예제는 `*/demo`다. TypeScript 전체 코드를 싣고 JavaScript는 같은 상대 위치의 `.js`·타입 없는 script로 제공한다. 프로젝트의 심화 기능은 뒤 단계를 위해 미리 존재하지만 해당 단계의 원리와 파일부터 순서대로 학습한다.

## ② 📖 이론

SvelteKit의 화면 기본 단위는 Svelte 컴포넌트다. 라우트 파일도 컴포넌트지만, 재사용 컴포넌트는 `src/lib/components`에 둔다. 일반 함수는 `.ts`, rune을 포함한 공유 로직은 `.svelte.ts`에 둔다. 서버 모듈은 `src/lib/server`에 둬서 브라우저 import를 막는다.

`$props()`는 부모가 준 입력, 콜백 prop은 자식이 부모에게 알리는 통로다. 컴포넌트를 가전제품으로 보면 props는 설정 버튼, 콜백은 완료 알림, snippet은 본체에 넣는 교체 가능한 내용물이다. `children`은 부모가 넣은 내용을 나타내는 snippet이며 `{@render children?.()}`로 렌더한다.

양방향 바인딩이 필요한 자식 prop만 `$bindable()`로 선언한다. 모든 props를 바인딩하면 변경 주체를 찾기 어려워진다. 레이아웃은 여러 페이지가 공유하는 틀이고 route group `(marketing)`은 URL에 표시되지 않는다.

## ③ 🛠️ 실기 — 전체 코드와 줄별 설명

1. StudyCard 파일을 먼저 읽고 title·children·onchange의 방향을 표시한다.
2. `/lab`은 카드 배열을 만들고 콜백으로 selected를 변경한다. 부모가 상태의 소유자다.
3. 루트 레이아웃은 children을 렌더하고 공통 링크를 제공한다. `#lib` 별칭은 package.json의 imports에 연결된다.
4. JS 버전은 타입만 제거되고 props·callback·snippet 동작은 같다.

실행: 앱 루트에서 `npm ci` 후 `npm run dev`, 배포 산출물은 `npm run build` 후 `npm start`다. 환경 설정은 [study0](study0.md), 실행 결과와 범위는 [검증 기록](docs/verification.md)을 참고한다. 코드 블록은 실제 파일 원문이며 import된 의존 파일은 저장소에 함께 있다.



### `src/lib/components/StudyCard.svelte` 전체 코드

[실제 파일](ts_version/project/src/lib/components/StudyCard.svelte) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		title,
		children,
		onchange
	}: { title: string; children?: Snippet; onchange?: (value: string) => void } = $props();
</script>

<section>
	<h2>{title}</h2>
	{@render children?.()}<button onclick={() => onchange?.(title)}>선택</button>
</section>
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | 컴포넌트 스크립트 구간의 경계를 정한다. |
| 2 | `svelte`에서 필요한 타입만 가져와 실행 번들에 넣지 않는다. |
| 3 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 4 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 5 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 6 | 사용자 동작을 함수로 연결한다. 비동기 작업 중 중복 실행 여부를 확인한다. |
| 7 | 부모 또는 라우터에서 받은 props를 읽는다. 상태의 전달 경계다. |
| 8 | 컴포넌트 스크립트 구간의 경계를 정한다. |
| 9 | 가독성을 위해 구간을 나누는 빈 줄이다. |
| 10 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 11 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 12 | 부모에서 전달한 snippet을 현재 위치에 렌더한다. |
| 13 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |

### `src/routes/+layout.svelte` 전체 코드

[실제 파일](ts_version/project/src/routes/+layout.svelte) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```svelte
<script lang="ts">
	import './layout.css';
	import './course.css';
	import favicon from '#lib/assets/favicon.svg';
	import { SITE_NAME } from '$app/env/public';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const links = [
		[resolve('/(marketing)/about'), '소개'],
		[resolve('/board'), '게시판'],
		[resolve('/(desk)/notes'), '이전 메모 실습']
	] as const;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{SITE_NAME}</title>
</svelte:head>

<div class="mx-auto flex min-h-screen max-w-3xl flex-col px-5">
	<header
		class="flex flex-col items-start justify-between gap-4 border-b border-line py-5 sm:flex-row sm:items-center"
	>
		<a
			href={resolve('/(marketing)')}
			class="flex items-center gap-2 font-semibold tracking-tight whitespace-nowrap"
		>
			<span class="inline-block size-3 bg-pine"></span>
			{SITE_NAME}
		</a>
		<nav class="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
			{#each links as [href, label] (href)}
				<a {href} class={page.url.pathname === href ? 'font-semibold text-pine' : ''}
					>{label}</a
				>
			{/each}
			{#if data.member}
				<span class="text-stone-600">{data.member.nickname}</span>
				<a href={resolve('/board')}>게시판 계정</a>
			{:else if data.user}
				<span class="text-stone-600">{data.user.name}</span>
				<form method="POST" action="/logout" use:enhance>
					<button class="underline">로그아웃</button>
				</form>
			{:else}
				<a href={resolve('/board')}>게시판 로그인·가입</a>
				<a href={resolve('/login')}>이전 메모 로그인</a>
			{/if}
		</nav>
	</header>
	<main class="flex-1 py-8">
		{@render children()}
	</main>
	<footer class="border-t border-line py-4 text-xs text-stone-600">{page.url.pathname}</footer>
</div>
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | 컴포넌트 스크립트 구간의 경계를 정한다. |
| 2 | 부작용 import로 스타일 또는 초기화를 적용한다. |
| 3 | 부작용 import로 스타일 또는 초기화를 적용한다. |
| 4 | `#lib/assets/favicon.svg`에서 필요한 함수·컴포넌트를 가져온다. |
| 5 | `$app/env/public`에서 필요한 함수·컴포넌트를 가져온다. |
| 6 | `$app/forms`에서 필요한 함수·컴포넌트를 가져온다. |
| 7 | `$app/state`에서 필요한 함수·컴포넌트를 가져온다. |
| 8 | `$app/paths`에서 필요한 함수·컴포넌트를 가져온다. |
| 9 | `./$types`에서 필요한 타입만 가져와 실행 번들에 넣지 않는다. |
| 10 | 가독성을 위해 구간을 나누는 빈 줄이다. |
| 11 | 부모 또는 라우터에서 받은 props를 읽는다. 상태의 전달 경계다. |
| 12 | 가독성을 위해 구간을 나누는 빈 줄이다. |
| 13 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 14 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 15 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 16 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 17 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 18 | 컴포넌트 스크립트 구간의 경계를 정한다. |
| 19 | 가독성을 위해 구간을 나누는 빈 줄이다. |
| 20 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 21 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 22 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 23 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 24 | 가독성을 위해 구간을 나누는 빈 줄이다. |
| 25 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 26 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 27 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 28 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 29 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 30 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 31 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 32 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 33 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 34 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 35 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 36 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 37 | id/key를 기준으로 목록 항목의 DOM과 상태를 연결한다. |
| 38 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 39 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 40 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 41 | id/key를 기준으로 목록 항목의 DOM과 상태를 연결한다. |
| 42 | 조건에 맞는 UI만 렌더하거나 빈 상태를 표시한다. |
| 43 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 44 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 45 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 46 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 47 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 48 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 49 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 50 | 조건에 맞는 UI만 렌더하거나 빈 상태를 표시한다. |
| 51 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 52 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 53 | 조건에 맞는 UI만 렌더하거나 빈 상태를 표시한다. |
| 54 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 55 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 56 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 57 | 부모에서 전달한 snippet을 현재 위치에 렌더한다. |
| 58 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 59 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 60 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |

## ④ 🔗 연동 포인트

props로 받은 자료를 표시하고, 콜백으로 사용자 의도를 올려 보낸다. 다음 단계에서는 상태가 컴포넌트 수명 동안 어디에 저장되는지 정한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| 자식에서 bind 사용 시 오류 | $bindable 선언 없이 부모가 bind 사용 | 자식에서 허용하거나 콜백으로 바꾼다 |
| 서버 모듈 import 빌드 오류 | 화면에서 DB 모듈을 직접 import | 서버 load·API를 경유한다 |

## ⑥ 직접 해보기

1. StudyCard에 footer snippet을 추가하자.
2. 선택된 카드만 강조하는 상태를 부모에 두자.
3. 입력 전용 props와 콜백의 방향을 그림으로 그리자.

## ⑦ ☐ 체크리스트

- [ ] props·callback·children 전달
- [ ] 레이아웃과 일반 컴포넌트 구분

## ⑧ 다음 단계 연결 문장

이 단계의 결과를 [study3](study3.md)에 연결한다. 다음 단계에서는 상태가 컴포넌트 수명 동안 어디에 저장되는지 정한다.

공식 자료: [SvelteKit 문서](https://svelte.dev/docs/kit). 상세 출처는 [README](README.md)의 공식 자료와 노션 원문 링크를 따른다.
