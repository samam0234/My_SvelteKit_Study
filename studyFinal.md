# studyFinal — 소나무 책상

demo 게시판을 복사하지 않았습니다. 주소, 색, 저장소, 폴더가 다릅니다.

| | demo | project |
|---|---|---|
| 주소 | `/posts` | `/notes` |
| 색 | ember | pine |
| 저장 | `data/*.json` | `node:sqlite`의 `data/desk.sqlite` |
| 폴더 | `src/lib/server` | `src/lib/features/*/server` |
| 쓰는 문 | form action과 `+server` | form action만. 공개 REST 없음 |
| 라우트 그룹 | `(marketing)` 한 곳 | `(marketing)`과 `(desk)` |

시드 계정은 같습니다. `demo@example.com` / `demo1234`. 첫 메모 "책상 위 첫 메모"의 작성자는 그 계정입니다.

---

## 1. 조립한 것

- `(marketing)/+page.svelte`는 `/`입니다. 괄호는 URL에 없습니다. `/about`도 같은 그룹입니다.
- `(desk)` 레이아웃은 메모 화면에만 "책상"을 붙입니다. 주소는 `/notes`입니다.
- `hooks.server`가 쿠키를 읽어 `locals.user`에 넣습니다. `/notes/new`와 `/notes/[id]/edit`는 로그인 없으면 `/login?next=`로 갑니다.
- 남의 메모는 403입니다. 상세의 수정·삭제 링크도 작성자에게만 보입니다.
- `src/env.ts`의 `SITE_NAME` 기본값은 `소나무 책상`입니다. `JWT_SECRET`은 비공개입니다.
- `+error.svelte`가 404를 그립니다.
- `adapter-node`와 `Dockerfile`은 study10과 같습니다. `node build`로 뜹니다.

SQLite 파일은 커밋하지 않습니다. `data/.gitkeep`만 있습니다.

---

## 2. 확인

`ts_version/project` 개발 서버 `http://127.0.0.1:5180`에서 확인했습니다. JS 버전도 `npm run build`가 성공했습니다.

- `GET /` → 본문에 `소나무 책상`. 스캐폴드의 "Welcome to SvelteKit"는 없음
- `GET /about` → 본문에 `(marketing)`, 주소는 `/about`
- `GET /notes` → `책상 위 첫 메모`, 레이아웃 문구 `책상`
- 쿠키 없이 `/notes/new` → 303 `/login?next=%2Fnotes%2Fnew`
- 틀린 비밀번호 → 400, "맞지 않습니다"
- 데모 로그인 `?next=/notes` → 303 `/notes`, `HttpOnly` 쿠키
- 그 쿠키로 안내 메모 HTML에 `/notes/welcome/edit`
- 메모 폼 제출 → 303 `/notes/<id>`
- 빈 폼 → 400, "모두 적어"
- 다른 계정으로 `/notes/welcome/edit` → 403
- `/notes/missing-id` → 404
- `/api/notes` → 404. 공개 API를 만들지 않았습니다

실행:

```powershell
cd ts_version/project
npm install
npm run dev
```

JS는 `js_version/project`에서 같은 명령입니다. 포트를 나누려면 `npm run dev -- --port 5181`입니다.
