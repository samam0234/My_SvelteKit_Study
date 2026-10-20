# study7 — 고급 2: hooks.server와 보호 경로

study6에서는 페이지마다 쿠키를 읽었습니다. 이제는 `src/hooks.server.ts`의 `handle`이 요청마다 한 번 읽고 `event.locals.user`에 넣습니다. `+layout.server`는 그 값을 `data.user`로 넘기기만 합니다. Next의 `middleware.ts`, Nuxt의 server middleware와 같은 자리입니다.

---

## 1. 막히는 주소

로그인하지 않은 요청은 303으로 `/login?next=`에 갑니다.

- `/posts/new`
- `/posts/[id]/edit`
- `/secret`

목록 `/posts`와 상세 `/posts/[id]`는 그대로 공개입니다. `+server`는 리다이렉트하지 않습니다. 쓰기는 401 JSON을 돌려줍니다. 화면 이동과 API 오류를 섞지 않기 위해서입니다.

남의 글은 403입니다. `authorId`가 없는 안내 글만 로그인한 사람이면 고칠 수 있습니다. 상세 화면의 수정·삭제 링크도 `canEdit`가 참일 때만 그립니다.

`hooks`가 막더라도 액션과 API가 다시 확인합니다. 주소 목록을 하나 빠뜨려도 저장 함수 앞에서 한 번 더 걸립니다.

---

## 2. 확인

개발 서버 `http://127.0.0.1:5175`에서 확인했습니다.

- 쿠키 없이 `/posts/new` → 303 `/login?next=%2Fposts%2Fnew`
- 쿠키 없이 `/secret` → 303 `/login?next=%2Fsecret`
- 쿠키 없이 `/posts/welcome/edit` → 303 `/login?next=%2Fposts%2Fwelcome%2Fedit`
- 쿠키 없이 안내 글 HTML에는 수정 링크가 없음
- 데모 계정 로그인 후 `/secret` → 200, 본문에 `데모`
- 쿠키 없이 `POST /api/posts` → 401
- 데모 쿠키로 생성 → 201, 작성자 `데모`
- 다른 계정으로 그 글 `PATCH` → 403, 수정 페이지도 403
- 다른 계정으로 안내 글 `PATCH` → 200 (`authorId`가 없음)

다음: [study8.md](study8.md) — 브라우저 상태와 서버 전용 모듈의 경계입니다.
