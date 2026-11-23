# 소나무 게시판 (js_version)

현재 21단계 학습의 실행 앱. root [README](../../README.md)·[studyMidpoint](../../studyMidpoint.md)·[studyFinal](../../studyFinal.md)을 따른다.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

`/board`에서 새 계정 가입, `/lab` 기초 실습, `/ui` 폼, `/integrations` 외부 연동, `/ai` 문서 AI. 운영은 `npm run build` 후 `npm start`. 정확한 DB·키 설정·검증 범위는 루트 문서를 따른다. `/notes`는 이전 SQLite 메모 예시로 현재 게시판 계정과 분리돼 있다. 기본 DB는 `data/board.sqlite`다. PostgreSQL 등은 DB_KIND·DATABASE_URL로 전환하며 자동 이관은 하지 않는다.
