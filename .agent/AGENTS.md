# 에이전트 공통 가이드라인 (인수인계 문서)

이 문서는 이 저장소에서 작업하는 모든 AI 에이전트(Claude, Grok, Codex 등)가 **공통으로** 지켜야 할 규칙을 정리한 인수인계 문서입니다.
`.claude/`, `.grok/`, `.codex/` 폴더의 에이전트별 문서는 이 문서를 기본으로 삼고, 도구별 특이사항만 추가로 기술합니다.

## 1. 저장소 개요

- JS / TS 기반 풀스택 엔진 [SvelteKit](https://svelte.dev/docs/kit) 학습 기록 저장소입니다. SvelteKit은 Svelte 위에 **파일 기반 라우팅 + 서버 렌더링 + load / form actions / API** 를 한 프로젝트에 붙인 프레임워크입니다.
- 같은 워크스페이스의 `frontend_study`의 Svelte(있다면)와 `full_stack/next.js/`, `full_stack/nuxt.js/`를 이미 다룬 전제에서, **같은 게시판을 Svelte 생태계로 다시 조립하는 방법**을 배우는 것이 목표입니다. 나중에 Nest/Django API로 백엔드를 분리해도 되는 구조를 염두에 둡니다.
- Vite + Svelte SPA와의 결정적 차이: SPA는 브라우저가 라우팅·데이터 페치를 전부 처리하고, SvelteKit은 **서버가 HTML/데이터 일부를 먼저 준비**합니다.
- Next = React 생태계, Nuxt = Vue 생태계, SvelteKit = Svelte 생태계. 폴더가 URL이고 서버가 먼저 HTML을 만든다는 감각은 같고, 파일 이름(`+page`, `+layout`, `load`, `actions`)만 다릅니다.
- 공통 스펙: **게시판(Posts) CRUD + 회원/인증**. `demo/`는 라우팅 → load → form actions → `+server` API → JSON 저장소 → JWT 쿠키 → `hooks.server` 순으로 점진적으로 발전합니다.
- 학습 목표와 전체 로드맵은 [Notion: SvelteKit](https://app.notion.com/p/SvelteKit-3fdd7dec5e2e81cea8e6e8daa94a52e2) 페이지를 기준으로 삼습니다.
- `study0.md`, `study1.md`, `study2.md`, ... 순서로 학습 진도가 진행됩니다. (숫자가 클수록 최신 진도)
  - `study0`: 실습 없이 이론만 (라우팅, load, 서버/클라이언트 경계, Next/Nuxt 비교)
  - `study1` ~ `study5`: 기본기 실습 (생성·명령어, 파일 라우팅, load, form actions, API와 게시판 CRUD)
  - `study6` ~ `study10`: 고급 기술 (JWT 쿠키 인증, hooks 인가, 서버 경계, 환경 변수·에러·메타, 빌드·배포)
  - `studyFinal`: 지금까지 배운 것을 응용하되 **구조를 다르게** 설계한 최종 미니 웹사이트 (학습 카드, route group + feature 폴더 + `node:sqlite`)
- JavaScript와 TypeScript를 **같은 진도로 둘 다** 만듭니다.
  - `js_version/demo`, `js_version/project` — JavaScript (`.js`, `<script>`)
  - `ts_version/demo`, `ts_version/project` — TypeScript (`.ts`, `<script lang="ts">`)
- `demo/`: study1~study10 문서 내용을 단계별로 하나씩 실습하며 누적되는 SvelteKit 프로젝트입니다. 커밋 히스토리를 따라가면 배운 순서 그대로 코드가 진화하는 것을 볼 수 있습니다.
- `project/`: `studyFinal.md`에 대응하는, `demo/`에서 익힌 개념을 전부 합쳐 처음부터 다른 구조로 완성한 독립된 미니 웹사이트입니다.

## 2. 작업 전 확인 사항

- 새 작업을 시작하기 전에 `studyN.md` 파일들을 번호 순서대로 확인하여 지금까지의 학습 진도와 맥락을 파악합니다.
- `js_version/`과 `ts_version/`의 기능은 같아야 합니다. 한쪽에만 기능을 넣지 않습니다. 차이는 타입 어노테이션과 파일 확장자, Svelte의 `lang="ts"`뿐입니다.
- `demo/`, `project/` 프로젝트 코드가 study 문서 설명과 어긋나지 않는지 확인합니다.
- 새 studyN.md 문서를 추가/수정할 때는 이전 study 문서와 이어지는 흐름을 유지합니다.
- `node_modules/`, `.svelte-kit/`, `build/`, `.env`(`.env.example` 제외), `*.db`는 반드시 `.gitignore`에 포함되어 있어야 합니다.
- 코드를 고쳤으면 **커밋 전에 최소한 `npm run build`로 확인**합니다. 가능하면 브라우저나 `curl`로 실제 응답을 확인한 뒤 커밋합니다.
- `sv create`는 이미 Git 저장소인 이 폴더 안에서 쓰이므로, 하위 프로젝트에 중첩 `.git`이 생기면 삭제합니다. 이 저장소의 `.gitignore`는 `**/.git`을 무시합니다.
- 문서의 코드 예시는 기본적으로 **TypeScript**를 보여 주고, JavaScript는 타입이 빠지고 확장자가 `.js`인 점을 본문에 명시합니다. 실제 코드는 두 버전 모두 존재해야 합니다.
- Svelte 5 runes(`$props`, `$state`, `{@render children()}`)를 사용합니다. Svelte 4의 `export let` 스타일로 되돌리지 않습니다.
- 이 저장소의 스캐폴드는 **SvelteKit 3**입니다. 공유 모듈은 `#lib/파일.js`처럼 확장자를 붙여 import합니다. `$lib`와 `svelte.config.js`, `json()`, `$env/*`를 새로 쓰지 않습니다. 어댑터는 `vite.config.ts`에 있습니다. 환경 변수는 `src/env.ts`의 `defineEnvVars`와 `$app/env/private` · `$app/env/public`입니다.
- 페이지 이동은 `<a href>`를 씁니다. React의 `<Link>`에 해당하는 별도 컴포넌트가 기본값으로 없습니다.

## 3. 커밋 규칙

- 커밋 관련 규칙은 [COMMIT_GUIDE.md](./COMMIT_GUIDE.md) 문서를 따릅니다.

## 4. 언어 규칙

- 문서 내용, 커밋 설명: 한글
- 커밋 타입(prefix), 코드, 식별자, 파일명: 영어

## 5. 에이전트별 문서

- Claude: [.claude/CLAUDE.md](../.claude/CLAUDE.md)
- Grok: [.grok/GROK.md](../.grok/GROK.md)
- Codex: [.codex/AGENTS.md](../.codex/AGENTS.md)

## 6. 인수인계 원칙

- 작업을 마칠 때는 다음 에이전트/세션이 이어받을 수 있도록 변경 내용과 다음 단계 후보를 간단히 남깁니다.
- 불확실한 결정은 추측하지 말고 study 문서 내용과 [Notion 학습 목표 페이지](https://app.notion.com/p/SvelteKit-3fdd7dec5e2e81cea8e6e8daa94a52e2)를 근거로 삼습니다.
- 이 문서나 커밋 가이드에 없는 새로운 컨벤션이 필요해지면, 추측해서 각자 다르게 처리하지 말고 이 문서를 먼저 갱신합니다.
