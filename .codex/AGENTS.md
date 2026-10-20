# Codex 전용 인수인계 문서

공통 규칙은 [../.agent/AGENTS.md](../.agent/AGENTS.md) 및 [../.agent/COMMIT_GUIDE.md](../.agent/COMMIT_GUIDE.md)를 먼저 확인하고 따릅니다.
이 문서에는 Codex를 사용할 때만 해당하는 특이사항을 기록합니다.

## Codex 관련 참고 사항

- JavaScript(`js_version/`)와 TypeScript(`ts_version/`)를 같은 진도로 유지합니다.
- Windows에서 한글 파일 편집은 PowerShell 기본 인코딩을 쓰지 않습니다.
- `hooks.server`에서 인증 리다이렉트는 `redirect(303, ...)`를 throw 합니다. `return`만 하면 페이지가 그대로 렌더됩니다.
