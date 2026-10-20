# study3 — 실습 3: load로 데이터 포치

Notion 학습 목표의 **load 함수로 데이터 포치**입니다. Next의 서버 컴포넌트 `await`, Nuxt의 `useAsyncData`와 같은 자리입니다.

---

## 1. 서버 load와 유니버설 load는 같이 둘 수 있다

`/load-demo`에는 파일이 세 개입니다.

| 파일 | 언제 도나 |
|---|---|
| `+page.server.ts` | 항상 서버. DB, 비밀, 쿠키 |
| `+page.ts` | 첫 요청은 서버. 링크 이동 때는 브라우저에서 다시 돌 수 있음 |
| `+page.svelte` | `data`를 그리기만 함 |

서버 load가 먼저 끝나고, 그 반환값이 유니버설 load의 `data` 인자로 들어옵니다.

```ts
import { browser } from '$app/env';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ data }) => {
	return { ...data, ranOn: browser ? 'browser' : 'server' };
};
```

`browser`는 `$app/env`에 있습니다. SvelteKit 2의 `$app/environment`는 이름이 바뀌었습니다.

비밀 문장 `secretNote`는 서버 파일에만 적혀 있습니다. 유니버설 load는 그 문자열을 **값으로만** 전달합니다. 서버 파일 자체는 브라우저 번들에 포함되지 않습니다. 반대로 비밀을 `+page.ts`에 적으면 그 코드가 브라우저로 갑니다.

---

## 2. 외부 API는 서버 fetch

`/external`은 [JSONPlaceholder](https://jsonplaceholder.typicode.com)에서 글 5개의 제목만 가져옵니다.

```ts
export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5');
	const posts = await res.json();
	return { posts: posts.map((post) => ({ id: post.id, title: post.title })) };
};
```

여기 `fetch`는 브라우저 `fetch`를 감싼 것입니다. 서버에서 우리 앱의 `+server`를 부를 때도 이 `fetch`를 씁니다. 쿠키가 이어지고, 요청이 한 줄로 기록됩니다.

이 페이지의 데이터는 **우리 DB가 아닙니다.** 다음 실습의 방명록과 study5 게시판은 우리 파일이 진실이고, 이 페이지는 바깥 서비스를 서버가 대신 읽는 예입니다.

---

## 3. 확인

- `/load-demo` 첫 HTML의 `ranOn`은 `server`
- 같은 HTML에 `secretNote` 문장이 들어 있음 (load 반환값이라 화면에 보이는 것이 맞음. 파일 경로는 번들에 없음)
- `/external` HTML에 외부 글 제목이 5개. 브라우저가 jsonplaceholder로 나가지 않아도 제목이 보임
- `/about`에서 "load" 링크를 눌러 이동하면 `ranOn`이 `browser`가 될 수 있음

다음: [study4.md](study4.md) — 폼으로 서버에 기록을 남깁니다.
