# study0 — SvelteKit 기초 이론

이 문서는 실습 없이 개념만 정리합니다.
[Next.js 학습](../next.js/study0.md)과 [Nuxt.js 학습](../nuxt.js/study0.md)을 이미 봤다면, SvelteKit은 **같은 풀스택 자리를 Svelte로 채운 엔진**이라고 생각하면 출발점이 맞습니다.

Notion 학습 목표:

```
- [ ] SvelteKit 프로젝트 생성
- [ ] 파일 기반 라우팅 (`src/routes`)
- [ ] `+page.svelte` / `+layout.svelte` / `+page.server.js`
- [ ] load 함수로 데이터 포치
- [ ] form actions / API 라우트
- [ ] 인증 쿠키 / hooks
- [ ] 게시판을 SvelteKit 단일로 구현
```

이후 `study1`부터 위 항목을 하나씩 코드로 확인합니다. JavaScript(`.js`, `<script>`)와 TypeScript(`.ts`, `<script lang="ts">`) 버전을 같이 만듭니다. 이론 자체는 동일하고, 차이는 타입 어노테이션과 파일 확장자뿐입니다.

---

## 1. SvelteKit이란?

### 한 줄 정의

**Svelte UI + 파일 기반 라우팅 + 서버 렌더링 + API**를 한 저장소에서 처리하는 풀스택 프레임워크입니다.

Vite + Svelte로 만든 SPA는 "화면"만 담당합니다. 데이터와 로그인은 Django/FastAPI/Nest/Spring 같은 별도 서버가 필요합니다. SvelteKit은 그 경계를 기본값으로 지웁니다. `src/routes`에 페이지를 두면 URL이 되고, 같은 폴더의 `+page.server`에서 데이터를 읽고, `+server`로 HTTP API도 둘 수 있습니다.

### 왜 그냥 Svelte SPA를 안 쓰고 SvelteKit을 쓸까?

| | Vite + Svelte SPA | SvelteKit |
|---|---|---|
| 첫 화면 HTML | `index.html` 껍데기 + JS 번들. 브라우저는 JS를 받은 뒤에야 내용을 그림 | 서버가 이미 내용이 채워진 HTML을 내려줄 수 있음 |
| 라우팅 | `svelte-spa-router` 등을 직접 설치하고 경로를 손으로 적음 | `src/routes` 폴더 이름이 URL이 됨 (서버도 URL을 앎) |
| 데이터 | 마운트 후 `fetch` (클라이언트가 API를 때림) | `load`가 서버에서 읽고, 페이지는 `data`로 받음 |
| 폼 저장 | 클라이언트가 `fetch`로 POST | `<form method="POST">` + form actions. JS가 꺼져 있어도 동작 |
| 백엔드 | CORS, 별도 포트, 별도 배포 | 같은 프로젝트의 `+server.js` / form actions |
| SEO / 공유 미리보기 | JS 실행 전엔 내용이 비어 있음 | 서버 HTML + `<svelte:head>` |

Notion 콜아웃 그대로입니다.

- **Svelte 기반 풀스택 엔진.** Next.js / Nuxt.js와 같은 자리에서 라우팅 + 서버 렌더링 + API를 한 프로젝트로 처리한다.

### Nest/Django와는 무엇이 다른가

SvelteKit의 `+server.js`와 form actions는 Nest 컨트롤러를 대체할 수 있을 만큼은 됩니다. 다만 SvelteKit은 **페이지를 그리는 일**이 본업이고, Nest는 **API 계층을 크게 키우는 일**이 본업입니다.

그래서 Notion 목표처럼 **게시판 + 로그인을 SvelteKit 하나로 합쳤다가**, 트래픽이나 팀 분리가 필요해지면 Nest/Django API로 백엔드만 떼는 경로가 자연스럽습니다. 이 강의의 `demo/`는 "한 프로젝트로 합친 상태"를 끝까지 갑니다.

---

## 2. Next / Nuxt와 차이

Notion:

- Next = React 생태계
- Nuxt = Vue 생태계
- SvelteKit = Svelte 생태계

같은 일을 하는 부품만 이름이 다릅니다.

| 역할 | Next.js | Nuxt | SvelteKit |
|---|---|---|---|
| UI | React (JSX) | Vue (SFC) | Svelte (SFC) |
| 페이지 | `app/.../page.tsx` | `app/pages/*.vue` | `src/routes/.../+page.svelte` |
| 레이아웃 | `layout.tsx`가 `children`을 받음 | `layouts/*.vue` + `<slot>` | `+layout.svelte`가 `children` 스니펫을 받음 |
| 링크 | `<Link href>` | `<NuxtLink>` | 그냥 `<a href>`. 클릭은 클라이언트가 가로챔 |
| 데이터 | 서버 컴포넌트 `async` 함수 | `useFetch` / `useAsyncData` | `load` 함수. 페이지는 `data` prop |
| 폼 저장 | Server Action (`"use server"`) | 보통 `server/api`에 POST | **form actions** (`+page.server.js`의 `actions`) |
| HTTP API | `app/api/.../route.ts` | `server/api/*.ts` | `+server.js`가 GET/POST를 export |
| 요청 전 가드 | `proxy.ts` | 라우트 미들웨어 | **`src/hooks.server.js`의 `handle`** |
| 서버/클라 경계 | `"use client"`가 없으면 서버 | SFC는 유니버설. `window`는 `onMounted` | SFC는 유니버설. 비밀은 `+page.server`와 `#lib/server` |
| 환경 변수 | `NEXT_PUBLIC_` | `NUXT_PUBLIC_` | `src/env.ts`에 선언. 공개만 `public: true`. import는 `$app/env/private` · `$app/env/public` |

핵심 감각은 Next·Nuxt와 같습니다. **폴더가 URL이고, 서버가 먼저 HTML을 만들고, API도 같은 저장소에 둔다.**

다른 점 세 가지를 먼저 잡아 두면 이후 실습이 덜 헷갈립니다.

1. **파일 이름 앞에 `+`가 붙습니다.** `+page`, `+layout`, `+server`, `+error`. `+`가 없는 `.svelte`는 라우트가 아닙니다.
2. **`"use client"`가 없습니다.** Svelte 컴포넌트는 서버에서 HTML을 만들고, 브라우저에서 다시 살아납니다(hydration). 비밀과 DB는 컴포넌트가 아니라 `+page.server.js`와 `#lib/server`에 둡니다.
3. **폼이 일급입니다.** JS를 끄고 `<form method="POST">`만 있어도 `actions`가 실행됩니다. `use:enhance`를 붙이면 그 위에 새로고침 없는 제출이 올라갑니다.

---

## 3. 렌더링 모델을 먼저 구분한다

| 이름 | 언제 HTML이 만들어지나 | 이 강의에서 |
|---|---|---|
| **CSR** | 브라우저가 JS를 실행한 뒤 | `$state` 카운터처럼 클릭 이후의 화면 |
| **SSR** | **요청이 올 때마다** 서버가 HTML 생성 | 게시글, 로그인한 헤더. SvelteKit **기본값** |
| **Prerender** | **빌드 시점**에 HTML 파일로 구움 | 소개 페이지. `export const prerender = true` |
| **Hydration** | 서버 HTML 위에 브라우저 JS가 이벤트를 붙임 | 모든 인터랙티브 컴포넌트의 기본 동작 |

SPA의 `onMount`에서 `fetch`하면 사용자는 빈 화면을 먼저 봅니다. SvelteKit의 `load`는 그 `fetch`를 **HTML을 만들기 전**으로 당깁니다. 그래서 첫 응답의 본문에 이미 제목이 들어 있습니다.

클라이언트 이동(링크 클릭)에서는 서버가 페이지 전체를 다시 그리지 않고, `load` 결과(데이터)만 받아서 바뀐 부분만 갱신합니다. 레이아웃은 유지됩니다.

---

## 4. `src/routes` 디렉터리 구조

SvelteKit 프로젝트의 라우트는 전부 `src/routes` 아래입니다. `+`로 시작하는 파일만 프레임워크와 약속입니다.

```
src/routes/
├─ +layout.svelte         ← 모든 페이지를 감싸는 루트 레이아웃
├─ +layout.server.js      ← 레이아웃용 서버 load (로그인 사용자 등)
├─ +page.svelte           ← URL `/`
├─ +page.server.js        ← `/` 의 서버 load, form actions
├─ +error.svelte          ← 이 세그먼트의 에러 UI
├─ about/
│  └─ +page.svelte        ← URL `/about`
├─ posts/
│  ├─ +layout.svelte      ← `/posts` 아래만 감싸는 중첩 레이아웃
│  ├─ +page.svelte        ← URL `/posts`
│  ├─ +page.server.js     ← 목록 load + 글쓰기 action
│  └─ [id]/
│     ├─ +page.svelte     ← URL `/posts/1`
│     └─ +page.server.js
└─ api/
   └─ posts/
      └─ +server.js       ← HTTP 핸들러. URL `/api/posts`
```

JavaScript 버전은 확장자가 `.js`, TypeScript 버전은 `.ts`입니다. `.svelte` 파일 이름은 같습니다. TS 컴포넌트만 `<script lang="ts">`를 씁니다.

### 파일 이름 = 프레임워크와 약속

| 파일 | 역할 |
|---|---|
| `+page.svelte` | 이 폴더가 URL이 된다. 없으면 그 경로는 페이지가 아님 |
| `+layout.svelte` | 자식 `+page`를 감싼다. 이동해도 레이아웃 인스턴스는 유지 |
| `+page.js` / `+page.ts` | **유니버설 load**. 서버와 클라이언트 이동 때 둘 다 실행될 수 있음 |
| `+page.server.js` | **서버 전용 load** + **form actions**. DB, 쿠키, 비밀키 |
| `+layout.server.js` | 레이아웃 트리의 서버 load. 자식 페이지가 `data`로 이어받음 |
| `+server.js` | 페이지가 아니라 HTTP 핸들러 (`GET`, `POST`, …) |
| `+error.svelte` | 이 세그먼트에서 난 에러 / 404 UI |
| `+page.server.js` 안의 `actions` | `<form>` POST를 받는 함수들 |

**폴더 이름 = URL 세그먼트**입니다. Next의 `app/posts/[id]/page.tsx`와 같은 생각이고, 페이지 파일 이름만 `+page.svelte`로 고정돼 있습니다.

특별한 폴더 문법:

| 문법 | 예 | 의미 |
|---|---|---|
| `[id]` | `posts/[id]/+page.svelte` | 동적 세그먼트. `params.id` |
| `[...slug]` | `docs/[...slug]/+page.svelte` | 나머지 경로 전부 |
| `(marketing)` | `(marketing)/about/+page.svelte` | **라우트 그룹**. URL에는 안 들어감. 레이아웃만 묶음 |
| `+` 없는 파일 | `posts/PostList.svelte` | 라우트가 아님. 다만 라우트 폴더에 컴포넌트를 두기보다 `$lib`에 두는 편이 낫다 |

---

## 5. `+page` / `+layout` / `+page.server`

세 파일은 같이 둡니다. SvelteKit이 조립합니다.

### 레이아웃

```svelte
<script lang="ts">
  let { data, children } = $props();
</script>

<header>{data.user?.name ?? "손님"}</header>
<main>{@render children()}</main>
```

- `children`은 React의 `children`과 같고, Svelte 5에서는 **스니펫**이라 `{@render children()}`로 그립니다.
- 루트 레이아웃은 `<slot>`이 아니라 이 스니펫을 씁니다. (`app.html`이 `<html>`과 `<body>`를 이미 갖고 있습니다. Next와 달리 `+layout.svelte` 안에 `<html>`을 다시 쓰지 않습니다.)
- 중첩 `posts/+layout.svelte`는 `/posts`로 시작하는 화면만 감쌉니다.

### 페이지

```svelte
<script lang="ts">
  let { data } = $props();
</script>

<h1>{data.title}</h1>
```

`data`는 같은 폴더의 `load`가 돌려준 값입니다. 페이지 컴포넌트 안에서 `await db.query()`를 하지 않습니다. 그 일은 `load`의 몫입니다.

### 서버 파일

```ts
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  return { title: "서버에서 읽은 제목", user: locals.user };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await request.formData();
    return { title: String(form.get("title") ?? "") };
  },
};
```

- `+page.server.ts`는 **브라우저 번들에 들어가지 않습니다.** 여기에 둔 비밀은 클라이언트로 안 내려갑니다. `load`의 **반환값**만 페이지로 갑니다. 반환값에 비밀번호를 넣으면 그건 내려갑니다.
- `./$types`는 SvelteKit이 생성합니다. JS 버전은 이 import가 없고 `export function load`만 둡니다.
- 이 저장소는 **SvelteKit 3**입니다. 설정은 `svelte.config.js`가 아니라 `vite.config.ts`의 `sveltekit({ adapter })`에 있습니다. 공유 코드 별칭은 `$lib`가 아니라 `package.json`의 `#lib`입니다. import에는 확장자를 붙입니다. `import { createPost } from '#lib/server/posts.js'`

---

## 6. load 함수로 데이터 포치

`load`는 "이 페이지를 그리기 전에 필요한 데이터를 준비하는 함수"입니다. Next의 서버 컴포넌트 안 `await`, Nuxt의 `useAsyncData`에 대응합니다.

두 종류가 있습니다.

| | `+page.js` (유니버설) | `+page.server.js` (서버 전용) |
|---|---|---|
| 실행 위치 | 첫 요청은 서버. 이후 링크 이동은 **브라우저에서 다시** 실행될 수 있음 | **항상 서버** |
| 쓸 수 있는 것 | `fetch`, `params`, 공개 데이터 | DB, 파일, `cookies`, 비밀키, `$lib/server` |
| 반환 | 직렬화 가능한 객체 | 직렬화 가능한 객체 |

```ts
// +page.server.ts
export const load: PageServerLoad = async ({ fetch, params }) => {
  const res = await fetch(`/api/posts/${params.id}`);
  const post = await res.json();
  return { post };
};
```

여기서 `fetch`는 브라우저 `fetch`를 감싼 SvelteKit `fetch`입니다. 서버에서 자기 앱의 `+server`를 부를 때 쿠키를 이어 주고, 요청 로그에 남습니다.

규칙 세 개:

1. **비밀은 서버 load에만.** 유니버설 load는 브라우저에서 다시 돌 수 있습니다.
2. **반환값은 JSON으로 바꿀 수 있어야 합니다.** 클래스 인스턴스, 함수는 못 넘깁니다.
3. **레이아웃 load의 반환값**은 자식 페이지 `data`에 합쳐집니다. `+layout.server.js`에서 `user`를 주면 모든 페이지가 `data.user`를 봅니다.

없는 글은 `error(404, "글을 찾을 수 없습니다")`를 던집니다. 가까운 `+error.svelte`가 그립니다.

---

## 7. form actions / API 라우트

Notion이 이 둘을 한 줄에 적습니다. 둘 다 "서버에서 데이터를 바꾸는 문"이지만 입구가 다릅니다.

### form actions — HTML 폼이 입구

```svelte
<form method="POST" action="?/create">
  <input name="title" />
  <button>등록</button>
</form>
```

```ts
export const actions: Actions = {
  create: async ({ request, locals }) => {
    const form = await request.formData();
    const title = String(form.get("title") ?? "").trim();
    if (!title) return fail(400, { message: "제목을 입력하세요.", title });
    const post = createPost({ title, authorId: locals.user?.id });
    redirect(303, `/posts/${post.id}`);
  },
};
```

- `action="?/create"`의 `create`가 `actions.create`입니다. 이름을 생략하면 `default`입니다.
- `fail(상태, 데이터)`는 검증 실패입니다. 페이지가 다시 그려지고 `form` prop으로 메시지가 옵니다.
- `redirect()`와 `error()`는 호출하는 순간 예외를 던집니다. 반환 타입이 `never`라서 `throw`를 붙이지 않아도 그 아래 코드는 실행되지 않습니다. 성공한 폼은 `redirect(303, url)`이 관례입니다.
- `<form use:enhance>`를 붙이면 JS가 있을 때는 새로고침 없이 제출하고, JS가 없으면 그냥 HTML 폼으로 동작합니다. 이걸 **점진적 향상**이라고 부릅니다.

Next의 Server Action과 같은 자리입니다. 차이는 SvelteKit 액션이 **항상 폼 요청**(`application/x-www-form-urlencoded` 또는 `multipart`)이라는 점입니다.

### `+server.js` — HTTP가 입구

```ts
// src/routes/api/posts/+server.ts
export const GET: RequestHandler = async () => {
  return Response.json(listPosts());
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();
  const post = createPost({ title: body.title, authorId: locals.user?.id });
  return Response.json(post, { status: 201 });
};
```

다른 앱, `curl`, 모바일 클라이언트가 두드릴 문이 필요할 때 씁니다. 우리 화면의 "글쓰기" 버튼은 form action으로 두고, 같은 저장소를 `+server`로도 열어 두면 "SvelteKit 하나로 API와 화면을 같이 준다"는 Notion 목표가 충족됩니다.

| | form actions | `+server` |
|---|---|---|
| 누가 부르나 | 우리 페이지의 `<form>` | 아무 HTTP 클라이언트 |
| 본문 | `FormData` | JSON, 텍스트, 파일 |
| 실패 | `fail()` → 페이지의 `form` | HTTP 상태 코드 + JSON |
| JS 없이 | 동작함 | 해당 없음 |

---

## 8. 서버/클라이언트 경계

Svelte에는 `"use client"`가 없습니다. 대신 **파일이 어디에 있느냐**로 경계를 나눕니다.

```
브라우저에 가도 되는 것
  src/routes/+page.svelte
  src/routes/+layout.svelte
  src/lib/components/*
  src/lib/format.js          ← import { formatDate } from '#lib/format.js'

서버에만 있어야 하는 것
  src/routes/+page.server.js
  src/routes/+server.js
  src/hooks.server.js
  src/lib/server/*           ← #lib/server. 클라이언트가 import하면 빌드 에러
  *.server.js                ← 파일 이름에 server가 들어가면 서버 전용
```

컴포넌트 파일은 **양쪽에서 실행**됩니다.

- 서버: HTML을 만들기 위해 한 번 실행. `$state`의 초기값이 여기 찍힙니다.
- 브라우저: hydration 이후 `$state` 변경, `onclick`이 살아납니다.
- `onMount` 안은 브라우저에서만 실행됩니다. `window`는 여기에 둡니다.

그래서 "클릭 카운터"는 컴포넌트의 `$state`로 만들고, "게시글 목록"은 `load`가 준비한 `data`로 그립니다. 카운터 숫자를 서버 메모리 변수에 두면 모든 방문자가 그 변수를 공유합니다. 요청마다 격리되는 곳은 `load`와 `hooks`의 `event.locals`입니다.

한 줄 요약: **데이터를 읽고 쓰는 일 = 서버 load/actions, 클릭·입력의 즉각 반응 = 컴포넌트.**

---

## 9. 인증 쿠키 / hooks

### 쿠키

SPA 습관처럼 JWT를 `localStorage`에 두지 않습니다. 서버가 **HttpOnly 쿠키**로 심으면 페이지 JS가 토큰 문자열을 읽지 못합니다. XSS가 나도 토큰을 빼 가기 어렵습니다.

```ts
cookies.set("session_token", token, {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
});
```

로그인 form action이 `cookies.set`을 하고, 로그아웃이 `cookies.delete`를 합니다.

### hooks

`src/hooks.server.ts`의 `handle`은 **모든 요청**이 라우트에 닿기 전에 탑니다. Next의 `proxy.ts`, Nuxt의 서버 미들웨어와 같은 자리입니다.

```ts
export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get("session_token");
  event.locals.user = token ? await verifySession(token) : null;

  if (event.url.pathname.startsWith("/posts/new") && !event.locals.user) {
    redirect(303, "/login");
  }

  return resolve(event);
};
```

- `event.locals`는 이 요청 동안만 사는 가방입니다. `load`와 `actions`가 `locals.user`로 받습니다.
- hooks는 쿠키 **유무와 서명**을 볼 수 있습니다. "이 글의 작성자인가"는 글의 `authorId`와 `locals.user.id`를 비교하는 load/action의 일입니다. 가드만 믿고 소유권 검사를 빼지 않습니다.
- `handleError`는 예외가 났을 때 로그를 남기는 hook입니다. `study9`에서 붙입니다.

---

## 10. 환경 변수와 배포

SvelteKit 3은 변수를 `src/env.ts`(JS는 `src/env.js`)에 **이름을 적고** 씁니다. 예전 `$env/static/private`와 `PUBLIC_` 접두사 규칙은 레거시입니다.

```ts
// src/env.ts
import { defineEnvVars } from "@sveltejs/kit/env";

export const variables = defineEnvVars({
  JWT_SECRET: {},
  SITE_NAME: { public: true },
});
```

```ts
import { JWT_SECRET } from "$app/env/private";
import { SITE_NAME } from "$app/env/public";
```

| 선언 | import | 브라우저 |
|---|---|---|
| `JWT_SECRET: {}` | `$app/env/private` | 불가. 서버 파일에서만 import |
| `SITE_NAME: { public: true }` | `$app/env/public` | 가능 |

기본은 프로세스가 뜰 때 읽는 동적 값입니다. 빌드 결과에 박제하려면 `{ static: true }`를 줍니다. `.env`는 Git에 넣지 않고 `.env.example`만 넣습니다.

배포는 **어댑터**가 결정합니다. SvelteKit 3에서는 `vite.config.ts`의 `sveltekit({ adapter })`입니다.

- `@sveltejs/adapter-auto` — 생성 직후 기본값. 플랫폼을 추측
- `@sveltejs/adapter-node` — `npm run build` 결과가 `build/` Node 서버. Docker에 이걸 씀
- Vercel / Cloudflare용 어댑터 — 호스팅에 맞춘 출력

`npm run build` 후 `node build`(adapter-node) 또는 `npm run preview`로 확인합니다.

---

## 11. JavaScript 버전과 TypeScript 버전

| | `js_version` | `ts_version` |
|---|---|---|
| 생성 | `sv create --no-types` | `sv create --types ts` |
| 서버 파일 | `+page.server.js` | `+page.server.ts` |
| 컴포넌트 | `<script>` | `<script lang="ts">` |
| load 타입 | 없음 | `PageServerLoad`, `Actions`, `./$types` |
| 앱 전역 타입 | 없음 | `src/app.d.ts`의 `App.Locals` |

런타임 동작은 같게 유지합니다. 강의 문서의 코드 블록은 TypeScript를 보여주고, JS는 타입 줄만 없다고 적습니다.

---

## 12. 이 강의가 만드는 것

| 문서 | 코드에 남는 것 |
|---|---|
| study1 | `sv create`, 루트 레이아웃, `/` 가 서버 HTML이라는 확인 |
| study2 | `/about`, `/hello/[name]`, `/posts`, `/posts/[id]`, 라우트 그룹 |
| study3 | 서버 load / 유니버설 load / 외부 API `fetch` |
| study4 | 방명록 form action, `fail`, `use:enhance` |
| study5 | JSON 게시판 CRUD + `+server` API |
| study6 | 회원가입/로그인, HttpOnly JWT 쿠키, 작성자 |
| study7 | `hooks.server`로 `locals.user`와 글쓰기 보호 |
| study8 | `$state` 카운터, `$lib/server` 경계, `$app/state` |
| study9 | `+error`, 환경 변수, `<svelte:head>`, 정적 이미지 |
| study10 | adapter-node, Docker, `npm run build` |
| studyFinal | 학습 카드 웹사이트. route group + feature + SQLite. 게시판과 구조가 다름 |

`demo/`는 한 게시판이 위 순서대로 자랍니다. `project/`는 그 부품으로 **다른 사이트**를 처음부터 조립합니다.

---

## 13. 용어 사전

| 용어 | 뜻 |
|---|---|
| Svelte | UI 컴파일러. 가상 DOM 없이 컴포넌트를 JS로 컴파일 |
| SvelteKit | Svelte에 라우팅·SSR·서버 함수를 붙인 프레임워크 |
| rune | Svelte 5의 `$props`, `$state`, `$derived`, `$effect` |
| `load` | 페이지 데이터 준비 함수 |
| form action | 폼 POST를 받는 서버 함수 |
| `+server` | 경로 하나의 HTTP API |
| `event.locals` | 요청 하나 동안 서버가 공유하는 값 |
| hook | 모든 요청의 앞(`handle`) 또는 에러(`handleError`) |
| hydration | 서버 HTML에 브라우저 이벤트를 붙이는 과정 |
| adapter | 빌드 결과를 어느 플랫폼 형식으로 내보낼지 |
| `#lib` | `package.json` `imports`로 선언한 `src/lib` 별칭. 경로에 확장자를 붙임 |
| prerender | 빌드 때 HTML을 파일로 구움 |

다음: [study1.md](study1.md) — 프로젝트를 만들고 첫 HTML이 서버에서 내려오는지 확인합니다.
