# study4 — 실습 4: form actions

Notion이 **form actions / API 라우트**를 한 줄에 적습니다. 이번 실습은 그중 폼입니다. HTTP API는 게시판과 함께 study5에서 엽니다.

방명록은 `data/guestbook.json`에 쌓입니다. 이 파일은 Git에 넣지 않습니다. `data/.gitkeep`만 커밋합니다.

---

## 1. 액션은 `+page.server`에 있다

```ts
import { fail, redirect } from '@sveltejs/kit';
import { addEntry, listEntries } from '#lib/server/guestbook.js';

export const load = () => ({ entries: listEntries() });

export const actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const message = String(form.get('message') ?? '').trim();
		if (!name || !message) return fail(400, { name, message, missing: true });
		addEntry({ name, message });
		redirect(303, '/guestbook');
	}
};
```

- import 경로 `#lib/server/guestbook.js`는 SvelteKit 3 규칙입니다. 파일은 `.ts`여도 import 확장자는 `.js`입니다.
- `fail()`은 검증 실패입니다. 페이지가 다시 그려지고 `form` prop으로 입력값과 메시지가 돌아옵니다.
- `redirect()`는 호출 즉시 예외를 던집니다. 성공 뒤에는 목록 load가 다시 돌아 방금 쓴 글이 보입니다.
- `#lib/server` 아래 파일은 컴포넌트가 import하면 빌드가 실패합니다. JSON을 읽고 쓰는 코드가 브라우저로 새지 않습니다.

화면은 평범한 폼입니다.

```svelte
<form method="POST" use:enhance>
	<input name="name" />
	<textarea name="message"></textarea>
	<button>남기기</button>
</form>
```

`use:enhance`(`$app/forms`)가 없으면 브라우저가 전통적인 폼 제출(전체 새로고침)을 합니다. 있어도 서버 액션은 같습니다. JS를 끄면 enhance만 빠지고 저장은 됩니다. 이걸 점진적 향상이라고 합니다.

Next의 Server Action과 같은 자리이고, 차이는 SvelteKit 액션이 **항상 `FormData`** 라는 점입니다. JSON을 받고 싶으면 study5의 `+server`를 씁니다.

---

## 2. 확인

- 빈 폼 제출 → 400, `missing` 메시지, 페이지에 남음
- 이름과 메시지를 채우고 제출 → 303 `/guestbook`, 목록에 보임
- `data/guestbook.json`이 생김

다음: [study5.md](study5.md) — 같은 방식으로 게시판 CRUD와 `+server` API를 만듭니다.
