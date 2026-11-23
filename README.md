# SvelteKit 학습 저장소

SvelteKit 한 프레임워크로 환경 설정부터 로그인 게시판·서버 DB·AI·운영까지 학습한다. [노션 원문](https://app.notion.com/p/3fdd7dec5e2e81cea8e6e8daa94a52e2)을 기준으로 기존 study 파일을 새 커리큘럼에 맞게 덮어썼다. 루트 문서는 study0~18·studyMidpoint·studyFinal 총 21개이며 midpoint/final도 study 접두사를 사용한다.

## 실행

Node 24, npm 11. 각 앱의 package-lock.json이 정확한 설치 버전 기준이다. 현재 과정은 `ts_version/project` 또는 `js_version/project`의 `/board`다. 두 버전은 같은 기능이며 `.agent/sync-course.mjs`로 TS 타입만 제거해 JS를 동기화한다.

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


브라우저에서 `/board`를 열고 새 계정으로 가입한다(비밀번호 10자 이상). `/lab`은 기초 문법·초안, `/ui`는 UI/폼 라이브러리, `/integrations`는 외부 서비스, `/realtime`은 SSE/WebSocket, `/ai`는 문서 AI, `/api-docs`는 OpenAPI다. WebSocket은 `npm run build` 후 `npm start`로 실행한다. 기존 demo의 `/`·`/posts`·방명록, project의 `/notes`는 이전 학습 기록이며 현재 게시판과 계정·쿠키·DB가 분리돼 있다.

## 학습 순서

| 문서 | 주제 |
|---|---|
| [study0](study0.md) | 환경 설정 |
| [study1](study1.md) | Hello World와 기본 문법 |
| [study2](study2.md) | 핵심 구조 |
| [study3](study3.md) | 데이터 다루기 |
| [study4](study4.md) | 라우팅과 요청 처리 |
| [study5](study5.md) | 폼·입력·검증 |
| [study6](study6.md) | DB·API 연동 |
| [study7](study7.md) | 인증·보안 기초 |
| [study8](study8.md) | 구조화·재사용 |
| [study9](study9.md) | 테스트·디버깅 |
| [study10](study10.md) | 배포·정리 |
| [studyMidpoint](studyMidpoint.md) | 중간 응용: 로그인 게시판 |
| [study11](study11.md) | DB 확장 |
| [study12](study12.md) | 프론트·UI 연동 |
| [study13](study13.md) | 외부 서비스 연동 |
| [study14](study14.md) | API 설계 |
| [study15](study15.md) | 성능·캐시 |
| [study16](study16.md) | 운영·CI/CD |
| [study17](study17.md) | 실시간·확장 |
| [study18](study18.md) | AI 연동·MCP |
| [studyFinal](studyFinal.md) | 심화 응용: 소나무 게시판 |

각 문서는 목표 → 이론(용도·개념·비유) → 실기(전체 파일·줄별 설명) → 연동 → 오류 노트 → 연습 2~3개 → 체크리스트 → 다음 단계 순서다. 응용 문서는 기능·폴더·구현 순서·구성도·배포 점검·회고를 포함한다.

## 문서와 코드 연결

| 구간 | 현재 코드 |
|---|---|
| study0~3 | `*/project` vite/env, `/lab`, StudyCard·createDraft; 기존 SSR 예시는 `*/demo` |
| study4~5 | `*/project/src/routes/board`, `[id]`, error, action·schema |
| study6~8·Midpoint | `*/project/src/lib/server/course`, hooks, `/api/[...path]` |
| study9~10 | `*/project/tests`, Dockerfile·server.mjs; demo 빌드도 유지 |
| study11 | storage: SQLite·pg·mysql2·Mongo 어댑터, root compose |
| study12~14 | ui·integrations·oauth·api-docs, static/openapi.json |
| study15~17 | cache·jobs·worker·measure·events·realtime·files, workflows·backup |
| study18·Final | ai·MCP scripts + 전체 게시판·Docker 운영 |

DB 접속 전환은 새 DB 연결을 선택하는 기능이며 기존 SQLite 자료를 자동 이관하지 않는다. 업로드는 UTF-8 txt/md만, 결제는 테스트 키·영수증 저장만 지원한다. worker는 단일 웹 인스턴스 학습용이며 여러 인스턴스의 원자 claim은 별도 구현이 필요하다. AI는 단어 검색 기반 미니 예제이며 PDF 파서·영속 채팅은 포함하지 않는다.

## 검증·운영

```powershell
# project 앱 루트
npm test
npm run build
# TS: npm run check
npm start
# 별도 앱 터미널
$env:BASE_URL='http://localhost:3000'
npm run test:api
npm run measure
$env:BOARD_ORIGIN='http://localhost:3000'
npm run mcp:client -- 문서
```

상세 실행 결과·미실행 범위는 [docs/verification.md](docs/verification.md), 노션 체크 원문은 [docs/notion-requirements.json](docs/notion-requirements.json)이다. 원문 18개 체크 항목은 각 문서의 ‘📌 노션 원문 추가 항목’에 빈 체크로 그대로 배치했으며 **문서 미배치 없음**이다. Svelte 페이지의 다른 저장소 경로가 들어간 원문은 수정하지 않고 현재 대응 위치를 위 표에 안내했다.

Docker·CI/CD·백업 복구·외부 배포 점검은 [study16](study16.md)을 따른다. 공급자 키·OAuth 앱·실제 호스팅 설정이 없는 기능은 설정 미완료를 오류로 반환한다. GitHub Actions 파일과 실제 Actions 실행·배포 성공은 구분한다.

## 공식 자료와 요구 출처

- [SvelteKit 3 마이그레이션](https://svelte.dev/docs/kit/migrating-to-sveltekit-3)
- [SvelteKit 어댑터](https://svelte.dev/docs/kit/adapters)
- [GitHub OAuth](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [Stripe 웹훅 운영](https://docs.stripe.com/events/manage-webhook-endpoints)
- [Ollama chat API](https://docs.ollama.com/api/chat)
- [MCP SDK v1 서버](https://ts.sdk.modelcontextprotocol.io/server)


- [공통 API 스펙 v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e)
- [Svelte 페이지의 이전 체크리스트](https://app.notion.com/p/3fdd7dec5e2e81b89b69c07abd5d2f81)
- [AI 미니 프로젝트 명단](https://app.notion.com/p/40bd7dec5e2e81dab88fda4b558aa498)
- [DocuForge 요구](https://app.notion.com/p/40bd7dec5e2e818d9c91c6fb26dccc4c)

문서 원문·줄별 설명 갱신: `python scripts/build-study-docs.py`. 코드 수정 후 JS 동기화→검증→문서 생성→노션 갱신 순서로 작업한다.
