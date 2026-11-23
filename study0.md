# study0 — 환경 설정

## ① 목표 한 줄

Node와 SvelteKit 프로젝트를 준비하고 Git·환경변수를 안전하게 관리한다.

이 문서는 SvelteKit 하나만 다룬다. 실행 코드: `ts_version/project`·`js_version/project`, 기초 SSR 기존 예제는 `*/demo`다. TypeScript 전체 코드를 싣고 JavaScript는 같은 상대 위치의 `.js`·타입 없는 script로 제공한다. 프로젝트의 심화 기능은 뒤 단계를 위해 미리 존재하지만 해당 단계의 원리와 파일부터 순서대로 학습한다.

## ② 📖 이론

SvelteKit은 `.svelte` 화면을 컴파일하고 파일 경로에서 URL과 서버 요청 처리를 만든다. Node는 서버 실행기, npm은 의존성·명령 실행기, Vite는 개발 중 변경을 전달하는 도구다. 식당에 비유하면 컴포넌트는 접시, 라우트는 주문 창구, load는 서빙 전 준비, API는 다른 손님도 이용하는 주문 규격이다.

이 저장소는 SvelteKit **3**, Svelte **5**, Node **24**를 사용한다. 설치된 정확한 패치 버전은 `npm ls @sveltejs/kit svelte vite`와 lockfile로 확인한다. SvelteKit 3의 설정은 `vite.config.ts`, 어댑터는 `sveltekit({ adapter })`, 공통 경로는 `#lib/파일.js`다. 환경변수는 `src/env.ts`에서 선언한다. 오래된 설정 예제를 섞으면 빌드부터 실패한다.

SSR은 요청 시 HTML 생성, hydration은 전달받은 HTML에 이벤트 연결, rune은 `$state` 같은 컴파일 지시자, adapter는 빌드 결과를 실행 환경에 맞추는 변환기다. `.svelte-kit`은 생성물이라 직접 수정하지 않는다.

## ③ 🛠️ 실기 — 전체 코드와 줄별 설명

1. Node 24 LTS 설치 후 PowerShell을 다시 열고 아래 명령을 실행한다. VS Code 확장 프로그램은 **Svelte for VS Code**, **ESLint**, **Prettier**를 설치한다.
2. 새 학습 프로젝트는 `npx sv create pine`에서 minimal·TypeScript·npm을 선택한다. 이 저장소를 실행할 때는 다시 생성하지 말고 `npm ci`를 쓴다.
3. `src/routes`는 URL, `src/lib`는 공통 코드, `src/lib/server`는 비밀·DB, `static`은 공개 파일, `src/app.html`은 HTML 골격이다.
4. `.env.example`를 `.env`로 복사하고 실제 값은 로컬에서만 바꾼다. `.env.example`의 `replace-...`는 운영 비밀이 아니다.
5. Git이 없는 새 폴더에서만 `git init`한다. 이미 저장소라면 `git status`로 시작한다.

실행: 앱 루트에서 `npm ci` 후 `npm run dev`, 배포 산출물은 `npm run build` 후 `npm start`다. 환경 설정은 [study0](study0.md), 실행 결과와 범위는 [검증 기록](docs/verification.md)을 참고한다. 코드 블록은 실제 파일 원문이며 import된 의존 파일은 저장소에 함께 있다.

```powershell
node -v
npm -v
# 새 프로젝트에만: npx sv create pine
cd ts_version/project
npm ci
Copy-Item .env.example .env
npm ls @sveltejs/kit svelte vite
npm run dev -- --host 127.0.0.1
```

명령별 설명: 1~2줄은 실행기·패키지 도구 확인, 3줄은 새 폴더 생성 안내, 4줄은 앱 루트 이동, 5줄은 lockfile 설치, 6줄은 로컬 설정 생성, 7줄은 실제 설치 버전 확인, 8줄은 개발 서버 시작이다. 별도 터미널에서 `git status`, `git check-ignore .env`를 실행한다. Git이 없는 새 저장소에서만 `git init`을 하고 `.gitignore`에 node_modules·.svelte-kit·build·.env·DB·업로드·백업을 제외한다.


### `vite.config.ts` 전체 코드

[실제 파일](ts_version/project/vite.config.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: adapter()
		})
	]
});
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `@tailwindcss/vite`에서 필요한 함수·컴포넌트를 가져온다. |
| 2 | `@sveltejs/adapter-node`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | `@sveltejs/kit/vite`에서 필요한 함수·컴포넌트를 가져온다. |
| 4 | `vite`에서 필요한 함수·컴포넌트를 가져온다. |
| 5 | 가독성을 위해 구간을 나누는 빈 줄이다. |
| 6 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 7 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 8 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 9 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 10 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 11 | 이어지는 코드의 제약 또는 의도를 설명하는 주석이다. |
| 12 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 13 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 14 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 15 | 가독성을 위해 구간을 나누는 빈 줄이다. |
| 16 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 17 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 18 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 19 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

### `src/env.ts` 전체 코드

[실제 파일](ts_version/project/src/env.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	WORKER_SECRET: { schema: (value: string | undefined) => value || '' },
	DB_KIND: { schema: (value: string | undefined) => value || 'sqlite' },
	DATABASE_URL: { schema: (value: string | undefined) => value || 'file:data/board.sqlite' },
	CORS_ORIGIN: { schema: (value: string | undefined) => value || 'http://localhost:5173' },
	OLLAMA_URL: { schema: (value: string | undefined) => value || 'http://127.0.0.1:11434' },
	OLLAMA_MODEL: { schema: (value: string | undefined) => value || 'gemma4:12b' },
	AI_MODE: { schema: (value: string | undefined) => value || 'live' },
	RESEND_API_KEY: { schema: (value: string | undefined) => value || '' },
	MAIL_FROM: { schema: (value: string | undefined) => value || '' },
	STRIPE_SECRET_KEY: { schema: (value: string | undefined) => value || '' },
	STRIPE_WEBHOOK_SECRET: { schema: (value: string | undefined) => value || '' },
	STRIPE_PRICE_ID: { schema: (value: string | undefined) => value || '' },
	GITHUB_CLIENT_ID: { schema: (value: string | undefined) => value || '' },
	GITHUB_CLIENT_SECRET: { schema: (value: string | undefined) => value || '' },
	PUBLIC_ORIGIN: { schema: (value: string | undefined) => value || 'http://localhost:5173' },
	UPLOAD_DIR: { schema: (value: string | undefined) => value || 'data/uploads' },
	JWT_SECRET: {
		description: '세션 JWT 서명 비밀',
		schema: (value: string | undefined) => value || 'dev-only-change-me'
	},
	SITE_NAME: {
		public: true,
		static: true,
		description: '사이트 이름',
		schema: (value: string | undefined) => value || '소나무 게시판'
	}
});
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `@sveltejs/kit/env`에서 필요한 함수·컴포넌트를 가져온다. |
| 2 | 가독성을 위해 구간을 나누는 빈 줄이다. |
| 3 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 4 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 5 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 6 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 7 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 8 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 9 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 10 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 11 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 12 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 13 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 14 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 15 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 16 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 17 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 18 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 19 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 20 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 21 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 22 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 23 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 24 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 25 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 26 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 27 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 28 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 29 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 30 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

## ④ 🔗 연동 포인트

Git은 복구 지점, lockfile은 설치 재현성, 환경변수 선언은 DB·메일·AI 연결의 계약이다. 공개 변수에 비밀을 넣지 않는다. study1은 같은 개발 서버에서 첫 HTML을 확인한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| node 명령을 찾지 못함 | 설치 후 터미널 PATH가 갱신되지 않음 | 터미널 재시작 후 node -v 확인 |
| 환경변수가 undefined | 선언 없이 읽었거나 다른 폴더의 .env를 수정함 | 앱 루트 .env와 src/env.ts를 함께 확인하고 재시작 |

## ⑥ 직접 해보기

1. .env.example에 가짜 사이트 이름을 넣고 화면 제목을 바꿔 보자.
2. git check-ignore로 .env와 build가 제외되는지 확인하자.
3. 폴더 구조를 손으로 그리고 브라우저에 공개되는 파일을 표시하자.

## ⑦ ☐ 체크리스트

- [ ] Node·npm·SvelteKit 버전 확인
- [ ] 에디터 확장 설치
- [ ] Git·.gitignore·.env 준비

**📌 노션 원문 추가 항목** — 문구·괄호·원문 링크를 그대로 보존했다. 원래 다른 저장소 경로를 가리키는 항목도 바꾸지 않았다. 이 문서에서는 학습 확인용 빈 체크로 옮긴다. 현재 검증 여부는 README와 검증 기록을 따른다.

- [ ] SvelteKit 프로젝트 생성
- [ ] <code>npx sv create</code>로 SvelteKit 프로젝트 만들기 (→ study0, <code>SvelteKit_final</code>)

## ⑧ 다음 단계 연결 문장

이 단계의 결과를 [study1](study1.md)에 연결한다. study1은 같은 개발 서버에서 첫 HTML을 확인한다.

공식 자료: [SvelteKit 문서](https://svelte.dev/docs/kit). 상세 출처는 [README](README.md)의 공식 자료와 노션 원문 링크를 따른다.
