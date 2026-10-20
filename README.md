# SvelteKit 학습 저장소

JS / TS 기반 풀스택 엔진 SvelteKit을 기초 개념부터 단계별로 실습하며 정리하는 개인 학습 저장소입니다.
같은 워크스페이스의 `full_stack/next.js/`(React 풀스택)와 `full_stack/nuxt.js/`(Vue 풀스택)를 이미 다룬 전제에서, **같은 자리를 Svelte로 채우는 방법**을 배웁니다.

학습 목표는 [Notion: SvelteKit](https://app.notion.com/p/SvelteKit-3fdd7dec5e2e81cea8e6e8daa94a52e2)를 기준으로 합니다.

- `studyN.md` 문서에 개념 정리와 실습 과정, **실제로 실행해서 확인한 결과**를 순서대로 기록합니다.
- `js_version/` · `ts_version/` 아래에 같은 기능의 프로젝트를 JavaScript와 TypeScript로 각각 둡니다.
- `demo/`는 각 study에서 다루는 내용을 구현한 SvelteKit 프로젝트입니다. study가 진행될수록 코드도 함께 발전합니다.
- `project/`는 `studyFinal.md`에 대응하는, `demo/`와는 **다른 구조**로 처음부터 다시 설계한 완결된 미니 웹사이트입니다.

## 사전 준비

```powershell
node -v   # v24.x 확인
npm -v    # 11.x 확인
```

## 기술 스택

### demo/ (study1 ~ study10)

- SvelteKit 3 + Svelte 5
- 파일 기반 라우팅 (`src/routes`, `+page` / `+layout`)
- `load` (서버 / 유니버설) + form actions
- `+server` API
- Tailwind CSS
- JSON 파일 저장소 (게시글·회원·방명록)
- JWT + HttpOnly 쿠키 인증
- `hooks.server` 인가
- `@sveltejs/adapter-node`

### project/ (studyFinal)

- 라우트 그룹 `(marketing)` / `(desk)`
- `src/lib/features` 폴더
- `node:sqlite` (demo의 JSON과 다른 저장소)
- 학습 카드 도메인 (게시판과 다른 화면/URL)
- form actions + hooks 세션

## 프로젝트 실행

```powershell
# TypeScript 실습
cd ts_version/demo
npm install
npm run dev          # http://localhost:5173

# JavaScript 실습 (동시에 띄울 때)
cd js_version/demo
npm install
npm run dev -- --port 5174
```

최종 프로젝트:

```powershell
cd ts_version/project
npm install
npm run dev          # http://localhost:5173
```

시드 계정은 각 프로젝트 README와 `studyFinal.md`에 적혀 있습니다. demo 게시판은 `demo@example.com` / `demo1234` 입니다.

## 학습 문서 목차

| 문서 | 주제 | 핵심 내용 |
|---|---|---|
| [study0.md](study0.md) | SvelteKit 기초 이론 | Svelte + 라우팅 + SSR + API, Next/Nuxt와의 차이, `+page`/`load`/actions/hooks |
| [study1.md](study1.md) | 만드는 방법 & 명령어, 실습 1 | `sv create`, npm 스크립트, 루트 레이아웃, SSR HTML 확인 |
| [study2.md](study2.md) | 실습 2 — 파일 기반 라우팅 | `+layout`, 동적 세그먼트, 라우트 그룹, `<a>` |
| [study3.md](study3.md) | 실습 3 — load | 서버 load, 유니버설 load, 외부 API `fetch` |
| [study4.md](study4.md) | 실습 4 — form actions | 방명록, `fail`, `use:enhance` |
| [study5.md](study5.md) | 실습 5 — API와 게시판 | `+server` CRUD, JSON 저장소 |
| [study6.md](study6.md) | 고급 1 — JWT 쿠키 인증 | 회원가입/로그인, HttpOnly 쿠키, 작성자 |
| [study7.md](study7.md) | 고급 2 — hooks | `handle`, `locals.user`, 보호 라우트 |
| [study8.md](study8.md) | 고급 3 — 서버/클라이언트 경계 | `$state`, `$lib/server`, `$app/state` |
| [study9.md](study9.md) | 고급 4 — 에러·환경 변수·메타 | `+error`, `defineEnvVars`, `<svelte:head>` |
| [study10.md](study10.md) | 고급 5 — 빌드와 배포 | adapter-node, Docker, preview |
| [studyFinal.md](studyFinal.md) | 종합 프로젝트 (구조 다르게) | 학습 카드 웹사이트, feature + SQLite |

## 저장소 구조

```
SvelteKit/
├─ study0.md ~ studyFinal.md
├─ js_version/
│  ├─ demo/          ← JS 실습 (study1~study10 누적)
│  └─ project/       ← studyFinal (다른 구조)
├─ ts_version/
│  ├─ demo/          ← TS 실습 (study1~study10 누적)
│  └─ project/       ← studyFinal (다른 구조)
└─ .agent/           ← AI 에이전트 공통 가이드라인
```
