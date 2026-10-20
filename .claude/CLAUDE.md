# Claude 전용 인수인계 문서

공통 규칙은 [../.agent/AGENTS.md](../.agent/AGENTS.md) 및 [../.agent/COMMIT_GUIDE.md](../.agent/COMMIT_GUIDE.md)를 먼저 확인하고 따릅니다.
이 문서에는 Claude를 사용할 때만 해당하는 특이사항을 기록합니다.

## Claude 관련 참고 사항

- SvelteKit은 Node.js 위에서 동작합니다. 이 저장소 작업 시점의 확인 버전은 Node `v24.x`, npm `11.x`입니다.
- `sv create`로 만든 하위 폴더에 `.git`이 생기면 지웁니다. 이 저장소가 이미 Git 루트입니다.
- JS와 TS를 동시에 유지합니다. 기능을 추가할 때는 `ts_version/`을 기준으로 구현한 뒤, 타입만 제거해 `js_version/`에 같은 파일을 만듭니다.
- Svelte 5에서는 props를 `let { data, children } = $props()`로 받고, 레이아웃 자식은 `{@render children()}`입니다.
- 서버 전용 모듈은 `src/lib/server`에 두고 `#lib/server/....js`로 import합니다. 클라이언트 컴포넌트가 이 경로를 import하면 빌드가 실패합니다. 그게 의도된 경계입니다.
- SvelteKit 3입니다. `redirect()` / `error()`는 그 자체로 throw 됩니다. API 응답은 `Response.json()`을 씁니다.
- **Windows PowerShell 5.1의 `Get-Content -Raw` / `Set-Content`로 소스 파일을 편집하지 마세요.** 한글이 깨집니다. 파일 수정은 Edit/Write 도구를 씁니다.
- curl로 한글 JSON을 보낼 때는 UTF-8 파일을 `curl --data-binary @file.json`으로 넘깁니다.
- 개발 서버 기본 포트는 5173입니다. JS와 TS를 동시에 띄울 때는 한쪽을 `--port 5174`로 나눕니다.
- 같은 워크스페이스의 Next.js `page.tsx` ≈ `+page.svelte`, Route Handler ≈ `+server.js`, `proxy.ts` ≈ `hooks.server.js`로 비교하면 기존 지식과 연결됩니다.
