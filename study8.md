# study8 — 고급 3: 브라우저 상태와 서버 전용 모듈

컴포넌트는 서버와 브라우저 양쪽에서 실행됩니다. 비밀은 컴포넌트에 두지 않습니다. `$state`는 브라우저에서만 바뀌는 값이고, `#lib/server`는 서버 번들에만 들어가는 파일입니다.

푸터에 이미 있는 경로는 `$app/state`의 `page.url`입니다. 링크를 눌러도 그 값은 브라우저가 바꿉니다. 서버 `load`를 다시 부르지 않아도 됩니다.

---

## 1. `$state`

홈의 `Counter.svelte`는 룬 `$state(0)`입니다. 첫 HTML의 숫자는 0입니다. "하나 더"는 `onclick`이라 서버로 폼이 나가지 않습니다. 새로고침하면 다시 0입니다. 저장이 필요하면 study4의 form action을 씁니다.

---

## 2. `#lib/server`

`#lib/server/vault.ts`의 문장은 `load-demo`의 서버 load만 import합니다. 화면에 보이는 이유는 load가 문자열을 **값**으로 돌려줬기 때문입니다. 파일 자체는 브라우저 그래프에 없습니다.

그 파일을 `Counter.svelte`에서 import한 뒤 `npm run build`를 하면 빌드가 실패합니다.

```
Cannot import `#lib/server/vault.ts` into code that runs in the browser,
as this could leak sensitive information.
```

확인한 뒤 import는 빼 두었습니다. 비밀번호 해시, JWT 비밀, `users.ts`도 같은 폴더에 있어서 같은 규칙으로 막힙니다.

---

## 3. 확인

개발 서버 `http://127.0.0.1:5175`에서 확인했습니다.

- `GET /` → 200, 본문에 `study8`과 숫자 0
- `GET /load-demo` → 200, 본문에 `vault.ts`
- 컴포넌트가 `#lib/server/vault.ts`를 import하면 빌드 실패. 문구는 위와 같음

다음: [study9.md](study9.md) — 에러 페이지, `handleError`, 환경 변수, `<svelte:head>`입니다.
