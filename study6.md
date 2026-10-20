# study6 — 고급 1: JWT를 HttpOnly 쿠키에 넣기

비밀번호는 서버의 bcrypt 해시로만 둡니다. 로그인에 성공하면 JWT를 `session_token` 쿠키로 내려주고, 그 쿠키는 JavaScript가 읽지 못합니다. Next의 미들웨어 쿠키, Nuxt의 서버 세션과 같은 자리입니다. 차이는 이 단계에서는 `hooks`가 아니라 각 `load` / `actions`가 쿠키를 직접 읽는다는 점입니다. 요청마다 한곳에서 읽는 일은 [study7.md](study7.md)입니다.

---

## 1. 파일

| 파일 | 하는 일 |
|---|---|
| `#lib/server/users.ts` | `data/users.json`. 가입, 이메일 조회, 비밀번호 대조 |
| `#lib/server/auth.ts` | JWT 서명·검증, 쿠키 설정·삭제, `next` 경로 검사 |
| `+layout.server.ts` | 모든 페이지의 `data.user` |
| `/login`, `/register`, `/logout` | form action |

시드 계정은 파일이 없을 때 한 번 만듭니다.

- 이메일 `demo@example.com`
- 비밀번호 `demo1234`
- 이름 `데모`

쿠키 옵션은 `path=/`, `httpOnly`, `sameSite=lax`, `maxAge` 7일입니다. `secure`는 개발 서버가 아닐 때만 켭니다. 비밀 문자열은 아직 코드 안의 `dev-only-change-me`입니다. 환경 변수로 빼는 일은 study9입니다.

`?next=`는 `/`로 시작하는 같은 사이트 경로만 허용합니다. `//evil.example`처럼 프로토콜 상대 주소는 `/`로 되돌립니다.

글을 쓸 때 쿠키가 있으면 `authorId`와 `authorName`을 그 사용자로 넣습니다. 없으면 여전히 `손님`입니다. 글쓰기 자체를 막는 일은 study7입니다.

---

## 2. 확인

`ts_version/demo` 개발 서버 `http://127.0.0.1:5175`에서 확인했습니다. JS 버전도 같은 구성으로 `npm run build`가 성공했습니다.

- `GET /login` → 200, 본문에 `demo@example.com`
- 틀린 비밀번호 → 400, "맞지 않습니다"
- `POST /login?next=//evil.example` → 303 `Location: /`
- `POST /login?next=/posts` (데모 계정) → 303 `/posts`
- `Set-Cookie`에 `session_token`, `HttpOnly`, `SameSite=Lax`, `Max-Age=604800`. 개발 서버라 `Secure`는 없음
- 그 쿠키로 `GET /` → HTML에 이름 `데모`
- 그 쿠키로 `POST /api/posts` → 201, `authorName`은 `데모`, `authorId`는 `demo-user`
- `POST /logout` → 303 `/`, 쿠키 `Max-Age=0`
- 새 이메일 가입 → 303 `/`, `HttpOnly` 쿠키

`data/users.json`은 실행할 때 생깁니다. 커밋하지 않습니다.

다음: [study7.md](study7.md) — `hooks.server`가 쿠키를 읽고, 글쓰기 경로를 막습니다.
