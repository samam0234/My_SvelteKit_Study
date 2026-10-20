# study2 — 실습 2: 파일 기반 라우팅

Notion 학습 목표의 **파일 기반 라우팅 (`src/routes`)** 와 `+page.svelte` / `+layout.svelte`를 페이지로 확인합니다.

코드는 양쪽 `demo/`의 `src/routes`에 있습니다. 아래 예시는 TypeScript 쪽 경로이고, JavaScript도 같은 폴더에 `.svelte`가 있습니다. 이 실습의 페이지는 아직 서버 load가 없어도 됩니다.

---

## 1. 추가한 주소

| URL | 파일 |
|---|---|
| `/about` | `src/routes/(marketing)/about/+page.svelte` |
| `/hello/kit` | `src/routes/hello/[name]/+page.svelte` |
| `/posts` | `src/routes/posts/+page.svelte` |
| `/posts/1` | `src/routes/posts/[id]/+page.svelte` |

`(marketing)`은 **라우트 그룹**입니다. 레이아웃을 나중에 묶기 위한 폴더이고 URL에는 안 나옵니다. Next의 `app/(marketing)`, Nuxt에는 없는 괄호 문법과 같습니다. SvelteKit도 괄호 폴더를 URL에서 뺍니다.

`[name]`, `[id]`는 동적 세그먼트입니다. 값은 `page.params`에 있습니다.

```svelte
<script lang="ts">
	import { page } from '$app/state';
</script>

<h1>안녕, {page.params.name}</h1>
```

`$app/state`의 `page`는 Svelte 5용입니다. 예전의 `$app/stores`와 `$page` 스토어는 이 프로젝트에서 쓰지 않습니다.

링크는 `<a href="/posts">`입니다. 첫 방문은 서버 HTML, 이후 클릭은 클라이언트가 필요한 데이터만 받아 화면을 바꿉니다. 루트 레이아웃의 헤더는 다시 만들어지지 않습니다.

---

## 2. 중첩 레이아웃

`src/routes/posts/+layout.svelte`는 `/posts`와 `/posts/1`만 감쌉니다. `/about`에는 그 문구가 없습니다.

```
+layout.svelte            헤더 (모든 페이지)
└─ posts/+layout.svelte   "중첩 레이아웃" 한 줄
   ├─ posts/+page.svelte
   └─ posts/[id]/+page.svelte
```

목록의 글은 아직 배열 상수입니다. 서버 파일에서 읽는 작업은 study5입니다.

---

## 3. 확인

`ts_version/demo`에서 `npm run build`가 라우트를 인식하는지, preview에서 각 주소가 200인지 확인합니다.

| 주소 | 기대 |
|---|---|
| `/about` | 본문에 `(marketing)` 설명. URL에는 괄호가 없음 |
| `/hello/kit` | 제목에 `kit` |
| `/hello/svelte` | 제목에 `svelte` |
| `/posts` | 목록 두 줄 + 중첩 레이아웃 문구 |
| `/posts/1` | `id = 1` + 같은 중첩 레이아웃 |
| `/` | 중첩 레이아웃 문구 없음 |

다음: [study3.md](study3.md) — `load`로 데이터를 준비합니다.
