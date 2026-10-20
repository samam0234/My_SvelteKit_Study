# study9 — 고급 4: 에러 페이지, handleError, 환경 변수

예상한 실패는 `error(상태, 메시지)`입니다. 그 화면은 `src/routes/+error.svelte`가 그립니다. `page.status`와 `page.error.message`는 `$app/state`입니다. 404도 같은 컴포넌트를 씁니다.

`hooks.server`의 `handleError`는 리다이렉트를 제외한 오류마다 호출됩니다. `kind`가 `app`이면 우리가 던진 `error()`, `framework`이면 SvelteKit가 만든 404 같은 오류, `unknown`이면 예상 못한 예외입니다. 여기서 다시 던지면 안 됩니다. 아무것도 반환하지 않으면 기본 메시지가 유지됩니다. 로그에는 경로와 종류만 남기고, 예상 못한 예외만 본문을 찍습니다.

---

## 1. 환경 변수

SvelteKit 3은 `src/env.ts`에서 `defineEnvVars`로 변수를 선언합니다.

| 이름 | 공개 | static | 하는 일 |
|---|---|---|---|
| `JWT_SECRET` | 아니오. `$app/env/private` | 아니오. 실행할 때 읽음 | 세션 서명 |
| `SITE_NAME` | 예. `$app/env/public` | 예. 빌드 값으로 고정 | `<title>`과 머리말 |

스키마 함수가 값이 없을 때 기본값을 돌려주므로, `.env` 없이도 빌드됩니다. 예시 파일은 `.env.example`입니다. 진짜 `.env`는 커밋하지 않습니다.

`static: true`인 `SITE_NAME`은 클라이언트 번들에 글자로 들어갑니다. 비밀은 `public`도 `static`도 아닙니다. `#lib/server/auth.ts`만 `$app/env/private`를 import합니다.

`<svelte:head>`가 문서의 `<title>`과 description을 바꿉니다. `app.html`이 `<html>`과 `<body>`를 소유합니다.

`static/mark.svg`는 가공 없이 `/mark.svg`로 제공됩니다.

`/boom`의 load는 `error(418, '주전자로는 커피를 내릴 수 없습니다')`를 던집니다. 페이지 마크업은 보이지 않고 `+error`가 보입니다.

---

## 2. 확인

개발 서버 `http://127.0.0.1:5175`에서 확인했습니다. JS 버전도 `npm run build`가 성공했습니다.

- `GET /` → `<title>SvelteKit 실습</title>`, 본문에 `/mark.svg`
- `GET /mark.svg` → 200, SVG
- `GET /boom` → 418, `+error`와 "주전자"
- `GET /no-such-page` → 404, 같은 `+error`
- 서버 로그: `[handleError] app /boom`, `[handleError] framework /no-such-page`
- 데모 로그인 → 303, `HttpOnly` 쿠키. 서명은 환경 변수의 기본 비밀

다음: [study10.md](study10.md) — `adapter-node`와 Docker로 서버를 고정합니다.
