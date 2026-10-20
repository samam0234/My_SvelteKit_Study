# study1 — 만드는 방법 및 명령어, 실습 1

[study0.md](study0.md)에서 개념을 봤으니 이제 프로젝트를 만들고, 첫 HTML이 서버에서 내려오는지 확인합니다.
**JavaScript와 TypeScript를 같은 구조로 둘 다** 만듭니다.

대응하는 코드:

- TypeScript: [`ts_version/demo`](ts_version/demo)
- JavaScript: [`js_version/demo`](js_version/demo)

이 저장소의 스캐폴드 버전은 **sv 1.1.1 / SvelteKit 3 / Svelte 5** 입니다. 설정은 `vite.config.ts`(JS는 `vite.config.js`)에 있고, 공유 폴더 별칭은 `#lib`입니다.

---

## 1. 사전 준비

```powershell
node -v   # v24.14.0 확인
npm -v    # 11.9.0 확인
```

NestJS의 Node, Spring의 JDK와 같은 역할입니다. 이 스캐폴드의 Vite 8은 Node 22 이상을 전제로 합니다. 여기 환경은 Node 24입니다.

---

## 2. 프로젝트 생성 명령어

이미 Git 저장소인 이 폴더 안에서 생성합니다. `sv create`가 하위 `.git`을 만들면 지웁니다. 루트 `.gitignore`도 `**/.git`을 무시합니다.

### TypeScript

```powershell
npx sv@1.1.1 create ts_version/demo --template minimal --types ts --add eslint prettier tailwindcss="plugins:forms" --install npm
```

### JavaScript

```powershell
npx sv@1.1.1 create js_version/demo --template minimal --no-types --add eslint prettier tailwindcss="plugins:forms" --install npm
```

| 옵션 | 의미 |
|---|---|
| `--template minimal` | 페이지 하나짜리 빈 앱. 단어 맞추기 demo 템플릿을 쓰지 않음 |
| `--types ts` | `.ts` 파일과 `<script lang="ts">` |
| `--no-types` | 타입체크 없이 JavaScript |
| `--add eslint prettier tailwindcss=...` | 린트, 포맷, Tailwind 4 + forms 플러그인 |
| `--install npm` | 패키지 매니저를 npm으로 고정 |

이 저장소를 처음 받은 사람은 생성 명령을 다시 돌릴 필요 없습니다. 아래만 하면 됩니다.

```powershell
cd ts_version/demo
npm install
npm run dev
```

---

## 3. 생성된 구조 (핵심만)

```
demo/
├─ src/
│  ├─ app.html              ← <html>, <body>. %sveltekit.body%
│  ├─ routes/
│  │  ├─ +layout.svelte     ← 모든 페이지를 감쌈
│  │  ├─ +page.svelte       ← URL `/`
│  │  ├─ +page.server.ts    ← `/` 의 서버 load (JS는 .js)
│  │  └─ layout.css         ← Tailwind 진입점
│  └─ lib/                  ← #lib 별칭
├─ static/                  ← 정적 파일. URL `/파일명`
├─ package.json             ← "imports"에 #lib 선언
└─ vite.config.ts           ← adapter, Tailwind, runes
```

SvelteKit 2 자료의 `svelte.config.js`와 `$lib`는 이 프로젝트에 없습니다.

### package.json 주요 스크립트

| 명령 | 역할 |
|---|---|
| `npm run dev` | 개발 서버. 저장하면 즉시 반영. 기본 `http://localhost:5173` |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과를 로컬에서 확인 |
| `npm run check` | TS 버전만. `svelte-check` |
| `npm run lint` | Prettier + ESLint |

두 버전을 동시에 띄울 때:

```powershell
# 터미널 1
cd ts_version/demo; npm run dev
# 터미널 2
cd js_version/demo; npm run dev -- --port 5174
```

Vite SPA의 `npm run dev`와 포트가 같습니다. 차이는 **이 서버가 HTML과 데이터 준비를 같이** 한다는 점입니다.

---

## 4. 루트 레이아웃과 첫 페이지

`app.html`이 `<html lang="ko">`와 `<body>`를 가집니다. Next의 루트 `layout`과 달리 `+layout.svelte` 안에 `<html>`을 다시 쓰지 않습니다.

`+layout.svelte`는 자식 페이지를 스니펫으로 받습니다.

```svelte
<script lang="ts">
	let { children }: LayoutProps = $props();
</script>

<main>{@render children()}</main>
```

JS 버전은 `LayoutProps`와 `lang="ts"`가 없습니다.

### 서버 시각

컴포넌트 안에서 `new Date()`를 쓰면 서버 HTML과 브라우저 hydration의 시각이 달라 경고가 납니다. 시각은 `load`가 만들어서 `data`로 넘깁니다. 같은 문자열이 HTML에도, 클라이언트가 받는 데이터에도 들어갑니다.

```ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return { renderedAt: new Date().toISOString() };
};
```

```svelte
<script lang="ts">
	let { data }: PageProps = $props();
</script>

<p>{data.renderedAt}</p>
```

`load`의 두 종류(서버 전용 / 유니버설)와 외부 API는 [study3.md](study3.md)에서 나눕니다. 지금은 "페이지 데이터는 load가 준비한다"만 확인합니다.

---

## 5. 확인

`ts_version/demo`에서 `npm run build` 후 `npm run preview -- --port 4173`으로 `/`를 요청했습니다.

- HTTP 200
- 응답 HTML에 `서버가 먼저 그린 페이지`와 ISO 시각이 이미 들어 있음
- 예: `2026-10-20T18:50:27.621Z`
- 같은 값이 페이지 데이터(`renderedAt`)에도 들어 있음

JS 버전도 `npm run build`가 성공했습니다. `adapter-auto`는 배포 플랫폼을 추측하지 못하면 안내만 출력하고 빌드는 끝납니다. Node 서버로 고정하는 일은 [study10.md](study10.md)입니다.

다음: [study2.md](study2.md) — 폴더가 URL이 되는지 페이지를 더 만듭니다.
