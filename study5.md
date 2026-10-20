# study5 — 실습 5: API 라우트와 게시판 CRUD

Notion 마지막 목표인 **게시판을 SvelteKit 하나로** 만드는 실습입니다. 화면은 form action, 다른 클라이언트를 위한 문은 `+server`입니다. 둘 다 `#lib/server/posts.ts`의 JSON 파일을 진실로 씁니다.

---

## 1. 화면

| URL | 하는 일 |
|---|---|
| `/posts` | `load`가 목록 |
| `/posts/new` | `actions.default`가 생성 후 상세로 `redirect(303)` |
| `/posts/[id]` | 상세. `actions.remove`가 삭제 |
| `/posts/[id]/edit` | 수정 |

없는 id는 `error(404, '글을 찾을 수 없습니다')`입니다. 아직 `+error.svelte`가 없으므로 SvelteKit 기본 에러 화면이 나옵니다. 우리 에러 페이지는 study9입니다.

첫 실행 때 `data/posts.json`이 없으면 안내 글 하나를 만듭니다. 작성자 이름은 일단 `손님`입니다. 로그인과 작성자 연결은 study6입니다.

---

## 2. `+server`는 HTTP 핸들러

```
src/routes/api/posts/+server.ts       GET, POST     /api/posts
src/routes/api/posts/[id]/+server.ts  GET, PATCH, DELETE
```

```ts
export const GET: RequestHandler = () => Response.json(listPosts());
```

SvelteKit 3에서 `json()` 헬퍼는 더 이상 쓰지 않습니다. `Response.json()`이 표준입니다.

화면의 "등록" 버튼은 이 API를 부르지 않습니다. 폼이 `actions`로 바로 저장소를 부릅니다. API는 `curl`이나 나중에 분리할 다른 프론트가 두드릴 문입니다. 저장 함수가 하나라서 둘의 결과가 같습니다.

| | form action | `+server` |
|---|---|---|
| 본문 | `FormData` | JSON |
| 실패 | `fail()` → 페이지의 `form` | HTTP 상태 + JSON |
| 성공 이동 | `redirect(303)` | 클라이언트가 알아서 |

---

## 3. 확인

`ts_version/demo`를 `npm run build`한 뒤 `http://127.0.0.1:4173` preview에서 확인했습니다. JS 버전도 같은 파일 구성으로 `npm run build`가 성공했습니다.

- `GET /posts` → 200. HTML에 안내 글 제목 `SvelteKit 게시판에 온 것을 환영합니다`와 작성자 `안내`
- `POST /api/posts` JSON `{ "title": "API", "body": "from curl" }` → 201. 작성자 이름은 아직 `손님`
- `GET /api/posts/missing-id` → 404 JSON `{ "message": "글을 찾을 수 없습니다." }`
- `GET /posts/missing-id` → 404
- `/posts/new` 폼(`Origin` + `Accept: text/html`) → 303, `Location`이 `/posts/<id>`

`data/posts.json`은 실행할 때 생깁니다. 커밋하지 않습니다.

다음: [study6.md](study6.md) — 그 글에 로그인한 사람을 붙입니다.
