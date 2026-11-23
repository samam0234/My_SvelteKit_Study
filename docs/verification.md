# 검증 기록 — 2026-11-23 (Asia/Seoul)

검증 대상은 SvelteKit 단일 소나무 게시판이다. 실제 공급자 결제·메일 전송·OAuth 승인·실제 모델 호출·외부 서비스 배포는 수행하지 않았다. 모든 숫자는 아래 명령의 관측 결과다.

| 구분 | 결과 | 확인 범위 |
|---|---|---|
| 문서 구조 | 21개 통과 | study0~18·studyMidpoint·studyFinal, 각 8개 공통 섹션·전체 코드·줄별 설명·연습 2~3개 |
| 노션 원문 | 18/18 배치 | SvelteKit 목표 7개·추가 3개, 연결된 Svelte 페이지의 이전 체크 8개. 중복 배치는 개수에 더하지 않음 |
| TS project | 타입 오류 0·경고 0 | `npm run check` |
| TS demo | 타입 오류 0·경고 0 | 기존 실습의 Kit 3.4 호환성 |
| JS·TS demo/project | 네 앱 빌드 통과 | `npm run build`, adapter-node |
| project 단위 | JS·TS 각 8개 통과 | 입력·PATCH 생략·id·캐시·RAG·mock AI·주입한 mock DB |
| 공통 API v1 | 네 DB에서 각 31항목 통과 | SQLite·PostgreSQL·MariaDB·MongoDB의 회원·세션·글·댓글·소유권·오류·헤더 |
| 최종 브라우저 | JS·TS 각 15항목 통과 | Chromium, TS+PostgreSQL·JS+MongoDB, pageerror 0 |
| 연동 경계 | JS·TS 각 15항목 통과 | 로컬 파일 업로드·UTF-8·소유권, 키 미설정 503, 작업 202, worker 권한, mock AI 스트림 |
| MCP | JS·TS 실제 stdio 왕복 성공 | 초기화·도구 목록·search_posts 호출·게시판 API 연결·종료 |
| Docker | TS 이미지 빌드·healthy | 비root Node 실행·PostgreSQL 연결, 이미지의 API 검사 31항목 통과 |
| 백업 복구 | 별도 DB 복원 성공 | pg_dump custom format → docker cp → pine_restore_course DB에 pg_restore, 당시 게시글 4개 확인 |
| npm audit | 알려진 취약점 0 | project 설치·audit 및 demo 패치 후 검사. Kit 3.4·adapter-node 6.0.5 등 lockfile 기준 |
| 정적 분석 | 새 TS 기능 파일 ESLint 통과 | server/course·schema·새 route·hooks·env. 이전 전체 앱의 lint 통과를 주장하지 않음 |
| GitHub Actions | 네 matrix job 모두 success | [course-ci 첫 원격 실행](https://github.com/samam0234/My_SvelteKit_Study/actions/runs/45176121604), 코드 커밋 f278814에서 JS·TS demo/project 설치·검사·테스트·빌드와 project API·브라우저 검사 통과 |

브라우저 검사는 카운터·localStorage 복원·가입·로그인·글 등록·XSS 텍스트 이스케이프·댓글·수정·Bits Dialog 열기/Esc·Superforms 저장·AI mock·SSE·WebSocket·API 문서·390px 화면 폭·JS 없는 form action을 포함한다. 병렬 조건을 하나의 테스트 항목으로 묶은 곳이 있어 개별 기능 수와 스크립트 checks 값은 다를 수 있다.

## 실행 명령

```powershell
python scripts/verify-docs.py
cd ts_version/project
npm run check
npm test
npm run build
$env:BASE_URL='http://127.0.0.1:5184'
npm run test:api
npm run test:browser
node tests/integrations.mjs
$env:BOARD_ORIGIN='http://127.0.0.1:5184'
npm run mcp:client -- 문서
npm run measure
```

DB별로 별도 서버를 시작하고 BASE_URL을 바꿨다. SQLite는 TS 5183, PostgreSQL은 TS 5184, MariaDB는 TS 5185, MongoDB는 JS 5186을 사용했다. 마지막 브라우저·연동 검사는 5184·5186에서 수행했다. AI_MODE=mock을 해당 서버에 지정했다. 운영 이미지의 3000 포트는 실제 모델 호출 없이 API만 검사했다.

성능 참고값: 로컬 순차 GET 30회에서 PostgreSQL median 약 2.65ms·p95 약 4.00ms, MongoDB median 약 3.24ms·p95 약 4.47ms를 관측했다. 서로 다른 DB 자료·로컬 실행 상태이므로 DB 성능 비교 자료가 아니며 Lighthouse·CWV·부하 시험도 아니다.

## 검증 중 수정한 문제

- 생성 스키마의 tags 기본값이 PATCH에서 기존 태그를 지울 수 있어 postPatchSchema와 명시적 변경 필드를 분리했다.
- 목록 조회의 회원·댓글 조회를 한 번씩 수행하고 mock DB 테스트로 호출 순서를 확인했다.
- MCP SDK의 기본 자식 환경에는 BOARD_ORIGIN이 없어서 API 연결이 실패했다. 필요한 공개 주소만 명시적으로 전달하고 isError를 종료 코드에 반영했다.
- worker PATCH에 JSON Content-Type을 지정해 SvelteKit의 form CSRF 경계와 의도한 서버 요청을 맞췄다.
- 모바일 헤더와 select 폭을 조정하고 레이아웃이 현재 게시판 로그인 상태를 표시하도록 연결했다.

## 미실행·운영 전 추가 작업

- Stripe 실제 테스트 Checkout·서명 이벤트 실전송, Resend 실메일, GitHub OAuth 실제 승인은 계정·키·발신 도메인 설정 후 별도 검증한다. 실금전 결제는 코드에서 허용하지 않는다.
- 실제 Ollama 모델 생성·답변 품질 평가는 미실행이다. mock 스트림과 주입한 fetch로 계약·취소 코드 경계를 확인했다.
- MCP 호스트 등록은 미실행이며 저장소의 SDK 클라이언트로 프로토콜 왕복만 확인했다.
- 원격 CI는 push 후 네 job 모두 통과했다. 배포 workflow·GHCR push·외부 HTTPS 배포·실제 도메인 연결은 미실행이다.
- DB 연결 전환을 검증했으며 기존 SQLite 사용자 자료의 자동 이관은 구현하지 않았다. 이관은 백업·키 보존·관계 대조·원복을 포함하는 별도 절차다.
- 전체 rows를 읽는 학습용 storage의 대량 쿼리 pushdown·인덱스 튜닝, 다중 인스턴스 worker의 원자적 claim, MongoDB 다중 문서 transaction은 운영 규모에 맞게 추가한다.
- PDF·DOCX 파싱·영속 채팅은 DocuForge 요구를 참고하는 이 미니 예제의 범위 밖이다.

문서에 넣지 못한 노션 체크 항목은 **없음**이다. 비교·다른 프레임워크 통합은 수행하지 않았다. 원문 체크의 다른 저장소 경로는 그대로 보존하고 현재 코드 대응은 README에 별도로 안내했다.
