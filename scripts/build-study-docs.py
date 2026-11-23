"""코드 원문과 번호별 설명을 포함한 SvelteKit 학습 문서를 재생성한다."""
from pathlib import Path
import json, re
ROOT = Path(__file__).resolve().parents[1]
APP = 'ts_version/project/'
def read(path): return (ROOT/path).read_text(encoding='utf-8').strip()
def write(path,text):
    p=ROOT/path; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(text.strip()+'\n',encoding='utf-8')

# Each tuple: title, objective, theory, practical walkthrough, connections, errors, exercises, checks, source files.
lessons = {
0: ('환경 설정', 'Node와 SvelteKit 프로젝트를 준비하고 Git·환경변수를 안전하게 관리한다.',
'''SvelteKit은 `.svelte` 화면을 컴파일하고 파일 경로에서 URL과 서버 요청 처리를 만든다. Node는 서버 실행기, npm은 의존성·명령 실행기, Vite는 개발 중 변경을 전달하는 도구다. 식당에 비유하면 컴포넌트는 접시, 라우트는 주문 창구, load는 서빙 전 준비, API는 다른 손님도 이용하는 주문 규격이다.

이 저장소는 SvelteKit **3**, Svelte **5**, Node **24**를 사용한다. 설치된 정확한 패치 버전은 `npm ls @sveltejs/kit svelte vite`와 lockfile로 확인한다. SvelteKit 3의 설정은 `vite.config.ts`, 어댑터는 `sveltekit({ adapter })`, 공통 경로는 `#lib/파일.js`다. 환경변수는 `src/env.ts`에서 선언한다. 오래된 설정 예제를 섞으면 빌드부터 실패한다.

SSR은 요청 시 HTML 생성, hydration은 전달받은 HTML에 이벤트 연결, rune은 `$state` 같은 컴파일 지시자, adapter는 빌드 결과를 실행 환경에 맞추는 변환기다. `.svelte-kit`은 생성물이라 직접 수정하지 않는다.''',
'''1. Node 24 LTS 설치 후 PowerShell을 다시 열고 아래 명령을 실행한다. VS Code 확장 프로그램은 **Svelte for VS Code**, **ESLint**, **Prettier**를 설치한다.
2. 새 학습 프로젝트는 `npx sv create pine`에서 minimal·TypeScript·npm을 선택한다. 이 저장소를 실행할 때는 다시 생성하지 말고 `npm ci`를 쓴다.
3. `src/routes`는 URL, `src/lib`는 공통 코드, `src/lib/server`는 비밀·DB, `static`은 공개 파일, `src/app.html`은 HTML 골격이다.
4. `.env.example`를 `.env`로 복사하고 실제 값은 로컬에서만 바꾼다. `.env.example`의 `replace-...`는 운영 비밀이 아니다.
5. Git이 없는 새 폴더에서만 `git init`한다. 이미 저장소라면 `git status`로 시작한다.''',
'Git은 복구 지점, lockfile은 설치 재현성, 환경변수 선언은 DB·메일·AI 연결의 계약이다. 공개 변수에 비밀을 넣지 않는다. study1은 같은 개발 서버에서 첫 HTML을 확인한다.',
[('node 명령을 찾지 못함','설치 후 터미널 PATH가 갱신되지 않음','터미널 재시작 후 node -v 확인'),('환경변수가 undefined','선언 없이 읽었거나 다른 폴더의 .env를 수정함','앱 루트 .env와 src/env.ts를 함께 확인하고 재시작')],
['.env.example에 가짜 사이트 이름을 넣고 화면 제목을 바꿔 보자.','git check-ignore로 .env와 build가 제외되는지 확인하자.','폴더 구조를 손으로 그리고 브라우저에 공개되는 파일을 표시하자.'],
['Node·npm·SvelteKit 버전 확인','에디터 확장 설치','Git·.gitignore·.env 준비'], ['vite.config.ts','src/env.ts']),
1: ('Hello World와 기본 문법', '첫 SSR 화면과 템플릿 보간·조건·리스트를 읽고 수정한다.',
'''Svelte 파일은 script(계산), HTML 형태의 템플릿(표시), style(모양)을 한 단위로 묶는다. `{name}`은 값을 텍스트로 표시하며 기본적으로 HTML을 이스케이프한다. `{#if}`는 조건, `{#each ... (id)}`는 식별자가 있는 반복이다. 이름표가 붙은 서랍처럼 key는 항목이 이동해도 같은 DOM 상태를 이어 준다.

`$state(0)`은 반응형 상태이고 `$derived(count * 2)`는 상태에서 계산한 값이다. 일반 `let`만 바꾸면 화면이 갱신된다고 가정하면 안 된다. `onclick`은 DOM 이벤트, `bind:value`는 입력값과 상태 연결이다. `{@html}`은 신뢰하지 않는 입력에 쓰지 않는다.

서버 load가 첫 데이터를 만들면 HTML 소스에 값이 보인다. 유니버설 load도 SSR 시 서버에서 실행될 수 있다. 노션의 ‘서버 load 값만 첫 HTML에 들어간다’는 설명은 너무 좁으므로 이렇게 바로잡는다.''',
'''1. demo를 실행하고 `/`의 서버 시각과 페이지 소스를 비교한다.
2. project의 `/lab`에서 이름을 바꾸고 카운터를 누른다. 이름은 바인딩, 두 배 숫자는 파생 상태다.
3. 브라우저 개발자도구 Elements·Console·Network를 연다. 카운터 클릭마다 API 요청이 생기지 않는지 확인한다.
4. `Hello` 문구를 저장하고 Vite의 HMR로 화면이 바뀌는지 확인한다. HMR은 전체 새로고침과 다르며 일부 상태가 보존될 수 있다.''',
'템플릿은 props·load 결과를 표시하는 출구다. 다음 단계에서 같은 문법을 자식 컴포넌트로 분리하고 서버 데이터도 같은 data prop으로 받는다.',
[('값은 바뀌는데 화면은 그대로','일반 변수에 상태를 저장함','$state로 선언한다'),('페이지 소스와 화면 값이 다름','SSR 이후 브라우저 상태가 바뀜','초기 HTML과 hydration 이후 상태를 나누어 확인한다')],
['카운터가 10 이상이면 메시지를 표시하자.','each 배열의 항목을 바꾸고 key의 역할을 설명하자.'],['첫 화면·페이지 소스·HMR 확인','if·each·보간·bind 사용'],['src/routes/lab/+page.svelte']),
2: ('핵심 구조', '컴포넌트·모듈·레이아웃을 나누고 props와 콜백으로 연결한다.',
'''SvelteKit의 화면 기본 단위는 Svelte 컴포넌트다. 라우트 파일도 컴포넌트지만, 재사용 컴포넌트는 `src/lib/components`에 둔다. 일반 함수는 `.ts`, rune을 포함한 공유 로직은 `.svelte.ts`에 둔다. 서버 모듈은 `src/lib/server`에 둬서 브라우저 import를 막는다.

`$props()`는 부모가 준 입력, 콜백 prop은 자식이 부모에게 알리는 통로다. 컴포넌트를 가전제품으로 보면 props는 설정 버튼, 콜백은 완료 알림, snippet은 본체에 넣는 교체 가능한 내용물이다. `children`은 부모가 넣은 내용을 나타내는 snippet이며 `{@render children?.()}`로 렌더한다.

양방향 바인딩이 필요한 자식 prop만 `$bindable()`로 선언한다. 모든 props를 바인딩하면 변경 주체를 찾기 어려워진다. 레이아웃은 여러 페이지가 공유하는 틀이고 route group `(marketing)`은 URL에 표시되지 않는다.''',
'''1. StudyCard 파일을 먼저 읽고 title·children·onchange의 방향을 표시한다.
2. `/lab`은 카드 배열을 만들고 콜백으로 selected를 변경한다. 부모가 상태의 소유자다.
3. 루트 레이아웃은 children을 렌더하고 공통 링크를 제공한다. `#lib` 별칭은 package.json의 imports에 연결된다.
4. JS 버전은 타입만 제거되고 props·callback·snippet 동작은 같다.''',
'props로 받은 자료를 표시하고, 콜백으로 사용자 의도를 올려 보낸다. 다음 단계에서는 상태가 컴포넌트 수명 동안 어디에 저장되는지 정한다.',
[('자식에서 bind 사용 시 오류','$bindable 선언 없이 부모가 bind 사용','자식에서 허용하거나 콜백으로 바꾼다'),('서버 모듈 import 빌드 오류','화면에서 DB 모듈을 직접 import','서버 load·API를 경유한다')],
['StudyCard에 footer snippet을 추가하자.','선택된 카드만 강조하는 상태를 부모에 두자.','입력 전용 props와 콜백의 방향을 그림으로 그리자.'],['props·callback·children 전달','레이아웃과 일반 컴포넌트 구분'],['src/lib/components/StudyCard.svelte','src/routes/+layout.svelte']),
3: ('데이터 다루기', '반응형 상태·파생 값·로컬 초안을 구분하고 새로고침 후 복원한다.',
'''`$state`는 바뀌는 원본, `$derived`는 원본에서 계산한 값, `$effect`는 외부 시스템과 동기화하는 부수효과에 사용한다. 계산 가능한 값을 별도 상태에 중복 저장하면 서로 어긋난다. 가계부의 원장은 state, 합계는 derived, 종이에 출력하는 일은 effect에 비유할 수 있다.

객체와 배열 상태는 깊은 반응성을 지원한다. 하지만 구조 분해한 일반 값은 원본과 연결이 끊길 수 있다. createDraft는 getter·setter로 현재 상태를 읽고 쓰게 한다. 이 팩터리는 컴포넌트마다 새 인스턴스를 만들며 서버의 모듈 전역에 사용자 상태를 공유하지 않는다. `$state` 자체가 브라우저 전용은 아니며 컴포넌트 초기화는 SSR에서도 일어난다.

localStorage는 브라우저 저장소다. 서버 렌더링에는 window가 없으므로 onMount 안에서 읽는다. 이는 개인 브라우저 초안용이며 비밀번호·인증 토큰·공유 게시글의 원본 저장소가 아니다. 서버 파일 또는 DB는 여러 기기의 데이터를 관리하는 다른 수명이다.''',
'''1. createDraft가 매 호출마다 독립된 text 상태를 만드는지 확인한다.
2. `/lab`에서 초안을 쓰고 저장한 뒤 새로고침한다. onMount가 storage 값을 복원한다.
3. 다른 브라우저나 비공개 창에서는 같은 값이 공유되지 않는다.
4. 브라우저 저장소가 차단된 환경의 예외를 직접 잡아 오류 메시지를 표시하는 연습을 한다.''',
'로컬 초안은 등록 전에만 사용하고, 등록 성공 후 서버 DB를 원본으로 삼는다. 검색 상태는 URL에, 로그인 상태는 서버 세션에 둔다. 다음 단계는 URL과 요청의 수명이다.',
[('localStorage is not defined','SSR에서 브라우저 API 실행','onMount 또는 이벤트에서 실행'),('다른 사용자 상태가 섞임','서버 모듈 전역에 사용자별 state 저장','요청 locals·컴포넌트 팩터리로 격리')],
['초안 삭제 버튼을 만들자.','두 개의 createDraft 인스턴스가 독립적인지 확인하자.','저장 불가 환경에서 try/catch로 안내하자.'],['state·derived·effect 역할 구분','브라우저 저장소 복원','서버 요청 간 사용자 상태 격리'],['src/lib/course/draft.svelte.ts','src/routes/lab/+page.svelte']),
4: ('라우팅과 요청 처리', '동적 URL·쿼리·load·오류 화면이 요청을 처리하는 흐름을 구현한다.',
'''`src/routes/board/+page.svelte`는 `/board`, `[id]` 폴더는 동적 경로, `+page.server.ts`의 load는 페이지 데이터, `+server.ts`는 HTTP 응답이다. 우체국에 비유하면 폴더는 주소, params는 번지, searchParams는 배송 옵션이다.

요청은 hooks → 서버 load 또는 endpoint → DB → 직렬화된 data → 페이지 순서로 흐른다. 페이지 이동은 `<a href>`가 기본이며 필요할 때 goto를 사용한다. 쿼리는 `url.searchParams`에서 읽고 검색어·페이지 크기·내 글 필터를 새 링크에도 유지한다.

서버는 숫자가 아닌 id를 400, 없는 글을 404, 권한 없는 수정을 403으로 나눈다. API는 공통 오류 JSON, 화면은 `+error.svelte`를 사용한다. universal load는 서버와 브라우저에서 실행될 수 있으므로 비밀 코드를 넣지 않는다.''',
'''1. `/board/1`은 `[id]`와 연결되며 id를 positiveId로 먼저 검증한다.
2. `/board?q=문서&page=1&limit=5`를 열어 URL과 결과를 확인한다.
3. `/board/abc`와 없는 숫자 id를 열어 오류 화면을 비교한다.
4. 서버 load에서는 내부 서비스를 직접 부른다. 같은 서버를 불필요하게 HTTP로 재호출할 필요가 없다. 외부 클라이언트는 `/api/posts/:id`를 사용한다.''',
'화면 URL `/board/:id`와 데이터 URL `/api/posts/:id`는 역할이 다르지만 같은 service.post를 사용한다. study5의 폼은 이 데이터 경로에 쓰기 요청을 보낸다.',
[('동적 경로가 404','파일명·폴더 규칙이 잘못됨','[id]/+page.svelte와 서버 파일 위치 확인'),('검색 후 다음 페이지에서 필터가 사라짐','새 링크에 q·mine·limit 누락','URL을 단일 원본으로 유지')],
['sort 쿼리를 선택하는 UI를 추가하자.','숫자가 아닌 id와 없는 숫자 id의 상태를 비교하자.','JS를 꺼도 목록·상세가 보이는지 확인하자.'],['파일·동적·그룹 라우팅','SSR load·query·페이지 이동','오류 페이지와 API 오류 구분'],['src/routes/board/[id]/+page.server.ts','src/routes/+error.svelte']),
5: ('폼·입력·검증', '서버 검증과 중복 제출 방지를 갖춘 글쓰기 폼을 만든다.',
'''HTML form은 브라우저의 기본 요청 방법이다. SvelteKit form action은 FormData를 받고 fail은 오류 상태와 입력 결과를 같은 페이지로 돌려준다. use:enhance는 JavaScript가 있을 때 페이지 전체 이동을 줄이지만, 서버 검증은 항상 남아야 한다. 브라우저 required는 입구 안내판이고 서버 검증은 실제 출입 검사다.

공통 API v1에서 검증 실패는 400 `VALIDATION_ERROR`, JSON 문법 오류도 400이지만 `BAD_REQUEST`다. 422를 쓰는 외부 API가 있다면 같은 입력 오류 UI로 표시하되 이 저장소의 v1 응답을 422로 바꾸지 않는다. 성공은 요청 종류에 따라 200 또는 생성 201이며 form action은 성공 결과를 표시한다.

클라이언트 busy·submitting은 연속 클릭을 막는다. 서버에서 완전한 중복 방지가 필요한 결제·메일은 idempotency key를 추가한다. 클라이언트 잠금은 새 탭이나 재시도를 막는 보안 장치가 아니다.''',
'''1. postSchema는 제목 1~200자, 본문 1~20000자, 태그 10개까지를 검증한다.
2. board action은 FormData를 읽고 service.write를 호출한다. API와 동일한 규칙을 쓴다.
3. enhance는 제출 시작에 잠그고 update 완료 또는 오류 뒤 finally에서 해제한다.
4. API 클라이언트는 response.ok를 검사한다. fetch는 400·422에도 자동으로 reject하지 않는다.
5. JS를 끈 뒤 로그인 쿠키가 있는 상태에서 기본 form POST가 성공하는지 확인한다.''',
'검증 스키마는 API·폼·UI 라이브러리에서 재사용한다. study6은 이 입력을 DB에 넣고 201·Location을 반환한다.',
[('버튼이 계속 비활성','실패 후 잠금 해제 누락','finally에서 submitting=false'),('빈 글이 DB에 저장됨','클라이언트에서만 검증','서버 service에서 스키마 검증')],
['Network에서 required를 우회해 빈 JSON을 보내자.','가짜 422 응답을 만들어 입력 오류 UI로 처리하자.','응답을 느리게 하고 중복 클릭이 막히는지 확인하자.'],['서버 검증·fields 오류 표시','400·422·200/201 구분','중복 제출 잠금과 해제','JS 없는 form 제출'],['src/lib/course/schema.ts','src/routes/board/+page.server.ts','src/routes/board/+page.svelte']),
6: ('DB·API 연동', 'SQLite 저장소로 게시글 CRUD를 만들고 공통 API v1 계약을 지킨다.',
'''DB는 서버가 재시작해도 자료를 보존한다. Storage 인터페이스는 연결 방식을 숨기고 service는 회원·게시글·댓글 규칙을 담당한다. 도서관의 창고(DB)·사서(service)·대출 창구(API)를 나누면 창고를 바꿔도 대출 절차가 유지된다.

기초 실행은 `DB_KIND=sqlite`, `DATABASE_URL=file:data/board.sqlite`다. members(id,email,nickname,passwordHash,createdAt), posts(id,title,body,tags,authorId,createdAt,updatedAt), comments(id,postId,authorId,body,createdAt), sessions, receipts를 만든다. tags는 공통 저장 어댑터에서 JSON 문자열로 저장하고 API는 배열로 돌려준다. 생성·수정 시각은 ISO UTC다.

공통 v1은 `/health`에 접두어가 없고 `/api/posts`·`/api/auth/*`를 사용한다. 목록은 data+meta, 단건은 data, 오류는 error 객체다. 생성 201에는 Location, 삭제 204에는 본문이 없다. 비밀번호 해시와 세션 해시는 응답에 넣지 않는다. SQL 값은 바인딩하고 테이블·컬럼은 allowlist로 제한한다.''',
'''구현 순서: `.env` 연결 설정 → storage 스키마 생성 → service 목록·상세 → 등록 → PATCH 수정 → 댓글·삭제 → 공통 오류 처리.

1. `/board`에서 가입·로그인하고 글을 등록한다.
2. `/api/posts`와 `/api/posts/:id`를 열어 직렬화 결과를 확인한다.
3. 제목만 PATCH해 body와 tags가 유지되는지 확인한다. 생성 schema의 default를 부분 수정에 그대로 쓰면 생략한 태그가 지워질 수 있어 postPatchSchema를 별도로 둔다.
4. 삭제 후 404, 남의 글 수정 403, 빈 제목 400을 확인한다.
5. 서버를 다시 실행해 데이터가 남아 있는지 확인한다.''',
'UI와 API는 같은 service를 호출하므로 규칙이 일치한다. DB 접속 문자열은 환경변수에만 둔다. study7에서 회원·세션을 연결하고 study11에서 DB 어댑터를 바꾼다.',
[('DB 파일이 다른 곳에 생김','서버를 앱 루트가 아닌 폴더에서 실행','project 폴더에서 npm start 실행'),('PATCH가 기존 태그를 지움','생성 스키마의 default([])를 재사용','별도 postPatchSchema로 생략을 보존')],
['curl 또는 REST 클라이언트로 CRUD 한 바퀴를 실행하자.','Location과 삭제 본문 길이를 확인하자.','DB 연결 오류가 클라이언트에 비밀을 노출하지 않는지 확인하자.'],['공통 v1 목록·상세·등록·수정·삭제','환경변수로 접속 분리','SQL 바인딩·응답에서 비밀 제거'],['src/lib/server/course/storage.ts','src/routes/api/[...path]/+server.ts']),
7: ('인증·보안 기초', '가입·로그인·만료·로그아웃과 작성자 권한을 서버에서 검사한다.',
'''인증은 누구인지, 인가는 그 사람이 무엇을 할 수 있는지의 검사다. 비밀번호는 salt를 더한 scrypt 해시로 보관한다. 로그인 시 일정 길이의 해시를 timingSafeEqual로 비교한다. 세션은 무작위 32바이트 토큰을 발급하며 서버 DB에는 SHA-256 해시만 저장한다. 만료는 한 시간이다.

브라우저는 HttpOnly·SameSite=Lax 쿠키를 쓰고 HTTPS에서는 Secure를 켠다. API 클라이언트는 같은 토큰을 Bearer로 보낼 수 있다. hooks가 세션을 확인해 `locals.member`에 넣고 board load가 안전한 사용자 정보만 화면에 전달한다. 로그아웃은 쿠키 삭제와 DB 세션 삭제를 함께 해야 이전 Bearer 토큰도 무효가 된다.

XSS는 출력 이스케이프·신뢰하지 않는 HTML 금지로 줄이고, CSRF는 SvelteKit form 보호·Origin 검사로 막는다. CORS는 출처별 응답 읽기 정책이며 인증을 대신하지 않는다. 쿠키를 사용하는 쓰기 API는 Origin을 확인한다. 운영 프록시에서는 신뢰한 프록시 헤더만 사용하고 요청 제한을 중앙 저장소로 확장한다. 화면에서 버튼을 숨겨도 service가 소유자를 다시 검사해야 한다.''',
'''1. 계정 두 개를 만들고 각자 로그인한다.
2. 첫 계정의 글을 둘째 계정의 토큰으로 수정·삭제하면 403이어야 한다.
3. token을 변조하면 401, 이미 로그아웃한 token도 401이어야 한다.
4. Network의 Set-Cookie에서 HttpOnly·SameSite와 HTTPS Secure를 확인한다.
5. 기존 `/notes`는 이전 JWT 학습 예시로 계정·쿠키가 분리돼 있다. 현재 과정은 `/board`와 `course_session`을 사용한다.''',
'세션 확인 결과는 요청 locals에만 저장하고 공개 캐시로 공유하지 않는다. 같은 출처의 form·API가 쿠키를 공유한다. study8은 이 경계를 폴더와 모듈로 고정한다.',
[('로그인했는데 401','Secure 쿠키를 HTTP에서 사용하거나 만료됨','개발 HTTP와 운영 HTTPS를 구분하고 재로그인'),('남의 글 수정 가능','UI만 검사하고 API 검사를 생략','서버에서 author.id와 user.id 비교')],
['로그아웃 후 기존 Bearer 토큰을 재사용해 보자.','evil.invalid Origin으로 쓰기 요청을 보내자.','본문에 script 태그를 저장하고 텍스트로 보이는지 확인하자.'],['회원가입·로그인·해시·세션 만료','HttpOnly·SameSite·Secure','401·403·CSRF·CORS·XSS 점검'],['src/lib/server/course/service.ts','src/hooks.server.ts']),
8: ('구조화·재사용', 'UI·계약·서버 규칙·저장소를 나누고 개발·운영 설정을 분리한다.',
'''라우트 파일은 입출력, service는 업무 규칙, storage는 저장 동작, schema는 공유 계약이다. 같은 검증을 화면·action·API에서 복사하면 한쪽만 바뀐다. 전기 배선을 벽 속에 모으듯 비밀은 server 폴더에 모으고 공개 schema만 클라이언트에 허용한다.

`#lib/course/schema.js`는 브라우저에서도 쓸 수 있지만 `#lib/server/course/storage.js`는 서버 전용이다. TypeScript 파일을 import할 때 이 저장소의 모듈 규칙에 따라 `.js` 확장자를 쓴다. SvelteKit 3의 env 선언은 사용할 변수와 기본값을 검증하는 문서 역할도 한다.

개발은 로컬 SQLite·HTTP, 심화 운영 예시는 PostgreSQL·HTTPS·비밀 주입으로 구성한다. `.env.example`는 필요한 이름만 공유하고 진짜 값은 GitHub secrets·호스팅 설정에 넣는다. 빌드 시 공개 정적 변수는 번들에 들어갈 수 있으므로 비밀을 public으로 지정하지 않는다.''',
'''1. schema→service→storage의 import 방향을 따라 읽는다.
2. publicUser는 응답 필드를 명시해 해시 유출을 막는다.
3. apiError는 내부 예외를 서버 로그에만 기록하고 클라이언트에는 INTERNAL을 반환한다.
4. `DB_KIND`와 `DATABASE_URL`만 바꿔도 UI와 API가 같은 계약을 유지하도록 설계한다.
5. 개발 기본값을 운영 비밀로 오인하지 말고 `.env.example`의 모든 replace 값을 운영 설정에서 대체한다.''',
'storage 인터페이스는 study11 DB 확장의 교체 지점이다. requestId는 study9 디버깅과 study16 운영 로그를 잇는다.',
[('비밀이 클라이언트 번들에 포함','환경변수를 public으로 선언','서버 전용 선언과 import 경계 확인'),('동일 규칙이 다르게 동작','폼·API에서 검증 코드를 복사','schema와 service를 공유')],
['새 검증 규칙을 schema 한 곳에만 추가하자.','server 모듈을 화면에 import해 빌드가 막히는지 임시 확인 후 되돌리자.'],['폴더 책임·import 방향 정리','개발·운영 환경 분리','공통 오류·검증 재사용'],['src/lib/server/course/http.ts','src/env.ts']),
9: ('테스트·디버깅', '단위·요청 테스트로 동작을 증명하고 requestId로 실패를 찾는다.',
'''단위 테스트는 입력 검증·id 변환·캐시·검색처럼 좁은 규칙을 빠르게 검사한다. 요청 테스트는 실제 HTTP·세션·DB·응답 계약이 연결되는지 검사한다. 단위는 부품 검사, 요청 테스트는 조립 후 시운전이다. 단위만 통과해도 route 경로나 쿠키가 틀릴 수 있다.

Node의 test runner와 assert를 사용하고 Vite가 SvelteKit 가상 환경변수 모듈을 로드한다. AI는 fetcher 함수를 주입해 가짜 스트림으로 바꾼다. Storage 인터페이스도 all·insert·patch·remove를 가진 메모리 객체로 교체할 수 있다. 실제 DB 검사는 별도 테스트 DB를 사용하며 운영 DB에 시험 데이터를 만들지 않는다.

디버깅은 브라우저 Console·Network에서 status와 requestId를 찾고 같은 id의 JSON 서버 로그로 이어 간다. Node inspector는 `node --inspect server.mjs`로 켜고 외부에 디버그 포트를 공개하지 않는다. 비밀번호·token·원문 문서는 로그에 찍지 않는다.''',
'''1. `npm test`로 단위 검사를 실행한다. 부분 수정 테스트는 태그 삭제 회귀를 실제로 발견한 검사다.
2. 별도 서버를 켜고 `BASE_URL`을 지정해 `npm run test:api`를 실행한다.
3. 응답 status뿐 아니라 Location·Set-Cookie·meta·requestId·403·로그아웃 후 401도 확인한다.
4. 실패할 때 테스트를 약하게 만들지 말고 코드의 첫 실패 지점을 고친다. API 테스트는 실제 DB를 사용하고 AI 단위 검사는 mock이므로 검증 범위를 구분한다.''',
'단위 검사는 코드 규칙, HTTP 검사는 서비스 경계, 이후 CI는 같은 명령의 반복 실행을 담당한다. study10은 검사한 코드를 빌드 결과로 실행한다.',
[('테스트가 다른 서버를 검사','BASE_URL 또는 포트 잘못 지정','테스트 출력의 base와 서버 로그 확인'),('mock 통과인데 실제 모델 실패','키·주소·모델 설치는 mock 범위 밖','실제 연결을 별도 수행하고 결과를 구분')],
['권한 비교를 잠시 반대로 바꿔 403 테스트가 실패하는지 확인 후 복원하자.','DB 실패를 던지는 가짜 Storage를 만들자.','브라우저 요청 하나를 requestId로 로그에서 찾아보자.'],['단위·요청·mock 범위 구분','재현 명령·requestId 로그','오류 TOP 10 숙지'],['tests/unit.test.mjs','tests/api.mjs']),
10: ('배포·정리', '프로덕션 빌드를 실행하고 환경변수·DB·HTTPS 점검 순서를 익힌다.',
'''개발 서버는 변경 감지와 디버깅용이고 배포는 빌드 산출물을 실행한다. adapter-node는 Node 실행용 결과를 만든다. `npm run build` 후 일반 HTTP는 `node build`, 이 과정의 WebSocket 확장은 `npm start`의 server.mjs로 실행한다.

도메인은 사람이 읽는 주소, DNS는 주소를 서버에 연결하는 체계, HTTPS는 인증서로 서버 신원을 확인하고 전송을 암호화한다. reverse proxy는 HTTPS를 종료하고 Node로 전달한다. ORIGIN은 브라우저가 보는 외부 주소와 일치해야 form Origin 검사·OAuth callback이 맞는다.

DB는 빌드에 넣지 않고 운영 실행 환경에서 연결한다. SQLite 파일과 업로드는 쓰기 가능한 영속 경로, PostgreSQL은 별도 서비스와 접속 URL을 사용한다. 컨테이너를 지워도 데이터를 유지하려면 volume이 필요하다. 배포 성공의 기준은 빌드 완료가 아니라 외부 주소에서 건강 확인·로그인·CRUD가 되는 것이다.''',
'''1. `npm ci`, `npm run check`(TS), `npm test`, `npm run build`를 실행한다.
2. project 폴더에서 PORT·ORIGIN·DB_KIND·DATABASE_URL을 지정하고 `npm start`한다.
3. `/health`, `/board`, 회원·게시글 API를 확인한다. 외부 서버 배포는 연결된 계정·도메인 설정을 별도로 준비해야 한다.
4. `.env`는 adapter-node가 자동으로 읽는다고 가정하지 않는다. 이 저장소의 start는 Node `--env-file-if-exists=.env`를 사용한다.
5. 로컬 컨테이너 확인과 외부 HTTPS 배포 완료를 구분해 체크한다.''',
'study0~10의 상태·라우트·폼·DB·인증·테스트를 studyMidpoint에서 하나의 작은 서비스로 묶는다. 배포 자동화·백업은 study16에서 확장한다.',
[('운영 form이 403','ORIGIN이 프록시 외부 주소와 불일치','HTTPS 도메인과 ORIGIN을 일치'),('재배포 후 파일 사라짐','컨테이너 임시 디스크 사용','영속 volume과 복구 절차 구성')],
['빌드 산출물에서만 서버를 실행하자.','DB를 잠시 끄고 /health 503을 확인하자.','HTTP와 HTTPS에서 쿠키 Secure 차이를 설명하자.'],['빌드·adapter-node 실행','운영 env·DB·영속 저장소','도메인·HTTPS·배포 후 CRUD 확인'],['Dockerfile','server.mjs']),
11: ('DB 확장', '같은 API 계약을 유지하며 PostgreSQL·MariaDB·MongoDB 연결을 교체한다.',
'''DB 변경은 접속 문자열만 바꾸는 작업이 아니다. 숫자 id 생성·컬럼 대소문자·JSON 표현·외래키·트랜잭션·인덱스가 달라진다. Storage는 여러 창고가 같은 대출 창구를 제공하도록 하는 계약이다.

PostgreSQL은 pg Pool·$1 바인딩·IDENTITY·RETURNING, MariaDB는 mysql2 pool·? 바인딩·AUTO_INCREMENT·insertId, SQLite는 node:sqlite·?·RETURNING을 사용한다. MongoDB는 collection·문서·unique index와 counters collection의 원자적 증가로 숫자 id를 만든다. relational schema의 외래키와 Mongo의 참조 검증은 같은 기능이 아니므로 service가 댓글 대상과 작성자를 검사한다.

현재 실행 코드는 얇은 repository이며 ORM을 강제하지 않는다. ORM을 추가한다면 Prisma의 datasource provider는 postgresql/mysql/mongodb로 분리하고 DB별 schema·migration을 따로 둔다. Mongo의 native ObjectId를 쓰면 API 숫자 id와 별도 매핑이 필요하다. SQL migration을 Mongo에 그대로 적용하지 않는다. 구체적인 선택 설정은 아래 표를 따른다.''',
'''1. compose의 db 또는 database-lab 프로필을 켠다.
2. 환경변수 DB_KIND·DATABASE_URL을 바꾸고 **서버를 다시 시작**한다. 연결 Promise는 프로세스 수명 동안 재사용된다.
3. 새 DB에서 API 테스트를 실행한다. 자동 schema 생성은 초기 학습용이며 운영에서는 명시적 migration을 배포 전에 실행한다.
4. 기존 SQLite 파일은 그대로 남는다. 연결 전환만으로 기존 데이터를 이관했다고 주장하지 않는다.
5. 실제 데이터 이관은 읽기 전용 백업 → 회원 → 글 → 댓글 순으로 삽입 → id·관계·시각·총개수 대조 → 원복 계획으로 수행한다. 기존 세션은 이관하지 않고 재로그인시킨다.''',
'UI·API·service는 그대로 두고 storage만 바뀐다. 실제 이관은 DB 교체와 별도 작업이다. study12는 동일한 계약 위에서 입력 UI를 확장한다.',
[('PostgreSQL에서 컬럼을 못 찾음','camelCase를 따옴표 없이 SQL에 사용','식별자 quoting 유지'),('MariaDB INSERT 결과가 비어 있음','RETURNING 가정','insertId 사용'),('Mongo id가 ObjectId가 됨','API 숫자 id 계약과 저장 id 혼동','counters의 id 필드 유지')],
['네 DB에서 동일한 API 테스트를 실행하자.','unique 이메일이 동시에 두 번 삽입될 때 409로 정리되는지 확인하자.','테스트 데이터 개수와 관계를 DB에서 직접 조회하자.'],['PostgreSQL·MariaDB·MongoDB 연결','id·바인딩·인덱스·ORM 설정 차이','전환·이관·원복 구분'],['src/lib/server/course/storage.ts']),
12: ('프론트·UI 연동', 'Bits UI·Superforms·공유 상태를 SvelteKit 폼과 연결한다.',
'''UI 라이브러리는 다이얼로그의 포커스·키보드 이동 같은 상호작용을 재사용하게 한다. 상태 관리는 입력 원본과 파생 값을 한곳에서 관리한다. 폼 라이브러리는 값·오류·전송 상태를 묶는다. 세 도구는 예쁜 외관만이 아니라 반복되는 상호작용 규칙을 줄이는 역할이다.

이 과정은 Tailwind 스타일, Bits UI Dialog, Superforms의 zod4 adapter를 사용한다. 서버에서 superValidate가 schema를 적용하고 브라우저 superForm이 form·errors·submitting·enhance를 제공한다. 보안 검증은 여전히 서버 service에 남는다. 입력 폼의 성공 200과 API 생성 201은 서로 다른 입출력 계층이다.

SvelteKit 3 호환성을 위해 transitive runed를 0.38.0으로 고정한 override를 package.json에 기록했다. lockfile을 설치 기준으로 삼고 갱신 시 다이얼로그 열기·Esc·포커스 복원을 다시 확인한다. 모듈 전역에 사용자 상태 singleton을 두지 말고 createDraft처럼 인스턴스를 만든다.''',
'''1. `/board`에서 로그인하고 `/ui`를 연다.
2. Dialog를 키보드로 열고 Esc로 닫아 원래 trigger로 포커스가 돌아오는지 확인한다.
3. 빈 제목으로 제출해 서버 오류와 errors 표시를 확인한다.
4. 정상 제목·본문을 저장하고 `/board` 목록에 같은 글이 생기는지 확인한다.
5. 라이브러리를 추가한 뒤 npm ls·타입 검사·빌드로 peer·bundle 영향을 확인한다.''',
'schema와 service를 재사용해 UI 라이브러리를 추가해도 API 규칙을 유지한다. 다음 단계에서는 입력 결과를 외부 서비스와 연결한다.',
[('라이브러리 설치 후 peer 충돌','Kit 2용 하위 의존성 포함','lockfile·runed override 확인 후 상호작용 검사'),('저장 실패가 화면에 안 보임','action message를 표시하지 않음','form.message와 action 결과를 함께 확인')],
['Dialog에 접근성 설명을 추가하자.','서버 오류 메시지를 폼 아래 표시하자.','UI 페이지 방문 전후 Network의 전송 크기를 비교하자.'],['UI·상태·폼 라이브러리 연결','서버 검증 유지','키보드·포커스·전송 잠금'],['src/routes/ui/+page.server.ts','src/routes/ui/+page.svelte','src/lib/course/draft.svelte.ts']),
13: ('외부 서비스 연동', '결제·메일·파일·OAuth를 서버 경계 안에서 안전하게 연결한다.',
'''외부 서비스는 네트워크 실패·중복 요청·서명 확인이라는 새 경계를 만든다. 외부 결제 창에서 돌아왔다고 결제가 확정되는 것은 아니다. 주문서 원본을 확인하듯 공급자가 서명한 webhook을 검증하고 event id로 중복을 막아야 한다.

Stripe는 테스트 키만 허용하고 서버가 정한 price id를 사용한다. 결제 webhook은 파싱 전 원문을 constructEvent에 전달한다. 이 실습은 수신 영수증 저장까지만 수행하며 유료 권한 부여는 구현하지 않는다. Resend는 본인 계정의 이메일에 고정 안내문만 보내고 idempotency key를 사용한다. 발신 도메인 인증·API key는 공급자에서 준비한다.

업로드는 로그인 후 UTF-8 txt/md, 100KB 이하만 받는다. 파일명은 서버가 만들고 공개 static 폴더 밖에 저장한다. 다운로드도 소유자를 검사한다. OAuth는 state·PKCE·고정 callback·HttpOnly 단기 쿠키를 사용하며 GitHub provider id로 계정을 매핑한다. 확인되지 않은 이메일로 기존 계정을 자동 합치지 않는다.''',
'''1. `.env.example`에서 필요한 키 이름을 확인하고 테스트 계정 자격 증명만 로컬에 넣는다.
2. `/integrations`의 버튼은 로그인 계정을 사용한다. 설정이 없으면 503 NOT_CONFIGURED이며 성공을 꾸며내지 않는다.
3. Stripe CLI의 테스트 webhook을 `/api/integrations/webhook`으로 전달하고 같은 event가 한 번만 저장되는지 확인한다.
4. 작은 txt 파일을 올리고 반환 id로 `/api/files/:id`를 조회한다. 다른 계정은 읽을 수 없어야 한다.
5. GitHub OAuth callback을 `PUBLIC_ORIGIN/oauth/github`으로 등록한다. 토큰은 서버에서 교환하고 브라우저에는 앱 세션만 준다.''',
'파일의 텍스트를 study18의 질문 입력으로 사용할 수 있다. 메일은 study15 백그라운드 작업으로 넘긴다. 외부 실호출은 자격 증명을 준비한 뒤 별도 점검하며 코드·mock 결과와 구분한다.',
[('Stripe 서명 오류','JSON 파싱 후 다시 직렬화한 본문 사용','request.text 원문으로 검증'),('OAuth state 불일치','쿠키 만료·다른 callback·재사용','고정 origin·단기 쿠키·일회성 state 확인'),('메일 503','키 또는 발신 주소 미설정','테스트 공급자 설정 후 서버 재시작')],
['변조한 webhook 서명이 400인지 확인하자.','다른 계정으로 파일 URL을 열자.','설정이 없을 때 오류 메시지를 사용자에게 표시하자.'],['테스트 결제·서명·중복 영수증','메일·타임아웃·중복키','파일 크기·UTF-8·소유권','OAuth state·PKCE·callback'],['src/lib/server/course/integrations.ts','src/routes/api/integrations/[kind]/+server.ts','src/routes/oauth/github/+server.ts']),
14: ('API 설계', 'REST 리소스·페이지네이션·오류·OpenAPI 문서를 계약으로 고정한다.',
'''REST는 URL을 동작 이름보다 리소스 이름으로 설계한다. `/api/posts`는 모음, `/api/posts/{id}`는 하나의 글이다. GET은 읽기, POST는 생성, PATCH는 부분 수정, DELETE는 삭제다. 규격화된 소켓처럼 응답 형식이 같아야 클라이언트를 안정적으로 연결할 수 있다.

공통 API 스펙 v1의 버전은 계약 버전이다. 이 저장소에서 `/api/v1` 접두어를 임의로 추가하지 않는다. 호환되지 않는 v2가 필요하면 기존 v1 경로를 유지하며 별도 경로·이관 기간을 설계한다. camelCase, UTC 시각, data·meta·error 규칙을 고정한다.

page는 1부터, limit은 기본 10·최대 50, q는 제목·본문 대소문자 무시 부분 검색, sort는 createdAt·-createdAt·-commentCount다. 오류는 code·message·fields·requestId이고 header의 X-Request-Id와 같은 값을 사용한다. OpenAPI 3 JSON은 `/openapi.json`, 사람이 읽는 문서는 `/api-docs`에 있다.''',
'''1. `/api-docs`에서 13개 method/path 계약을 확인한다.
2. `/openapi.json`을 Swagger Editor에 가져와 schema·인증·오류를 살핀다.
3. API 테스트와 문서의 성공 status·필드를 대조한다.
4. 필드를 추가할 때 schema·직렬화·OpenAPI·테스트를 함께 고친다. 정적 OpenAPI는 자동 동기화되지 않으므로 리뷰가 필요하다.
5. 기존 `/api/posts`와 새 클라이언트를 유지하며 v2 확장안을 문서로 작성한다.''',
'문서는 프론트·MCP 도구·자동 테스트가 따르는 공개 계약이다. 다음 단계는 같은 계약을 유지하면서 지연과 DB 접근 비용을 줄인다.',
[('Swagger와 실제 응답이 다름','정적 스펙만 수정','라우트·schema·테스트 함께 갱신'),('204 파싱에서 예외','빈 본문을 JSON으로 읽음','status 204이면 파싱 생략')],
['응답 schema에 required 필드를 강화하자.','limit=100의 meta.limit이 50인지 검사하자.','v1을 깨지 않는 필드 추가와 깨는 변경을 분류하자.'],['REST·v1 경로·camelCase','페이지네이션·정렬·오류 계약','OpenAPI·Swagger 가져오기'],['src/routes/api-docs/+page.server.ts','src/routes/api-docs/+page.svelte','src/lib/server/course/errors.ts']),
15: ('성능·캐시', '측정·캐시·비동기 작업의 수명과 일관성을 구분한다.',
'''캐시는 다시 계산할 수 있는 결과를 잠시 보관한다. TTL은 보관 기한, 무효화는 원본 변경 후 폐기, single-flight는 같은 요청의 동시 계산을 합치는 것이다. 냉장고처럼 개인 식품과 공용 식품의 구획을 잘못 나누면 사용자 데이터가 새어 나간다. 인증 응답은 no-store로 두고 공개 자료에만 명시적으로 캐시를 붙인다.

ttlCache는 최대 항목 수·만료·실패 제거·중복 Promise 병합을 구현한다. 현재 회원·내 글 API에 자동 적용하지 않는다. 게시글 목록은 회원·댓글을 한 번씩 읽어 목록마다 반복 쿼리하는 N+1을 줄였다. 다만 작은 학습 DB를 가정해 전체 rows를 메모리에서 필터·정렬하므로 대량 데이터의 운영 최적화까지 끝난 것은 아니다. 이후 SQL WHERE·COUNT·LIMIT/OFFSET·인덱스로 내려야 한다.

백그라운드 메일은 receipts에 queued 작업을 저장하고 worker가 재시도한다. 공급자 idempotency key가 재전송 중복을 줄인다. 프로세스 내 running은 단일 인스턴스 전용이다. 여러 웹 인스턴스에는 원자적 lease·SKIP LOCKED 또는 전문 queue를 도입해야 한다. 응답 후 setTimeout만 두는 방식은 서버 종료 때 작업을 잃는다.''',
'''1. `npm run measure`로 30번 순차 요청의 median·p95를 기록한다. 로컬 HTTP 수치와 Lighthouse/CWV를 혼동하지 않는다.
2. 캐시 단위 테스트로 동시 요청 병합·실패 제거·무효화를 확인한다.
3. `POST /api/jobs`는 로그인 본인에게 보낼 고정 알림 작업을 202로 수락한다.
4. WORKER_SECRET 32자 이상을 설정하고 단일 `npm run worker`를 실행한다. 작업은 최대 3회 시도하며 실패 상태를 DB에서 확인한다.
5. 여러 인스턴스 운영 전 DB 측 페이지네이션과 원자적 작업 claim을 구현하고 부하 시험한다.''',
'requestId·duration 로그는 최적화 전후 근거다. study16은 이 로그를 수집하고 배포·백업의 복구 가능성을 확인한다.',
[('다른 사용자 결과가 캐시됨','사용자별 데이터를 공용 키에 저장','개인 데이터 no-store 또는 사용자 키 격리'),('작업이 중복 수행됨','다중 인스턴스에 프로세스 락만 사용','DB 원자 claim·idempotency key·단일 worker 제한')],
['캐시 TTL을 짧게 바꾸고 만료 후 호출 횟수를 확인하자.','원본 갱신 뒤 clear를 누락했을 때 stale 데이터를 재현하자.','PostgreSQL EXPLAIN으로 SQL 페이지네이션 개선안을 작성하자.'],['측정 근거·캐시 TTL·무효화','비동기·영속 작업·재시도','N+1·전체 읽기 한계 인지'],['src/lib/server/course/cache.ts','src/routes/api/jobs/+server.ts','scripts/worker.mjs','scripts/measure.mjs']),
16: ('운영·CI/CD', 'Docker·자동 검증·배포·로그·백업을 점검표로 운영한다.',
'''컨테이너 이미지는 실행 파일·의존성을 묶고 환경변수와 DB volume은 실행 시 주입한다. 멀티 스테이지 빌드는 빌드 도구와 운영 실행물을 나누고 운영 이미지는 node 사용자로 실행한다. 배포는 물건 배송, health check는 도착 확인, backup과 restore는 분실 복구 훈련에 비유할 수 있다.

CI는 push·PR에서 JS·TS demo/project의 설치·검사·테스트·빌드를 수행한다. CD는 workflow_dispatch로 고정 SHA 이미지 생성→GHCR→인증된 배포 webhook→/health 확인을 수행한다. 실제 호스트는 DEPLOY_HOOK·DEPLOY_TOKEN·HEALTH_URL을 구성해야 한다. 파일이 존재하는 것과 GitHub에서 실행되어 배포된 것은 다르다.

운영 로그는 requestId·method·path·status·ms만 기본 기록하고 token·password·문서 본문은 제외한다. health는 DB 읽기까지 검사한다. 백업은 pg_dump custom format으로 만들고 docker cp로 꺼내 PowerShell 이진 리다이렉션 손상을 피한다. 백업 성공은 복구 성공을 보장하지 않아 별도 DB 복원이 필요하다.''',
'''운영 순서는 아래 배포·백업 체크리스트를 따른다. 로컬 compose 예시는 PostgreSQL을 기본으로 실행한다.

1. root `.env.example`를 `.env`로 복사하고 DB_PASSWORD·JWT_SECRET을 바꾼다.
2. `docker compose config`, `docker compose up --build -d` 후 health를 확인한다.
3. 로그를 보고 API 테스트를 외부 노출 주소가 아닌 테스트 환경에 실행한다.
4. `scripts/backup.ps1`로 dump를 만들고 별도 DB에 pg_restore한다.
5. 외부 호스트의 HTTPS·영속 volume·비밀·배포 훅을 준비한 뒤 CD를 수동 실행하고 이전 SHA 이미지로 원복한다.''',
'단일 서비스 운영이 확인된 뒤에만 실시간 연결·worker를 여러 인스턴스로 확장한다. 다음 단계는 HTTP와 다른 수명의 연결이다.',
[('이미지는 healthy인데 로그인 실패','외부 ORIGIN·HTTPS·DB 설정 불일치','배포 후 실제 사용자 흐름 점검'),('백업 파일은 있으나 복원 불가','이진 출력 리다이렉션 손상 또는 복구 미검증','컨테이너 파일 복사·별도 DB restore')],
['별도 restore_test DB에 백업을 복원하고 글 수를 비교하자.','CI에 실패하는 입력을 넣어 빌드가 중단되는지 확인하자.','운영 비밀을 바꾸는 절차와 원복 SHA를 기록하자.'],['Docker 비root·volume·health','Actions 자동 검증·배포 구성','로그·모니터링·백업 복구','외부 배포와 구성 완료 구분'],['Dockerfile','../../.github/workflows/ci.yml','../../.github/workflows/deploy.yml']),
17: ('실시간·확장', 'SSE·WebSocket·파일 처리를 연결하고 종료 시 자원을 해제한다.',
'''일반 HTTP는 한 번 요청하고 한 번 응답한다. SSE는 서버→브라우저 알림을 유지하고 WebSocket은 양방향 메시지를 유지한다. 편지와 전화처럼 연결의 수명이 달라지므로 타임아웃·해제·재접속·인증을 따로 다뤄야 한다.

SSE endpoint는 text/event-stream과 빈 줄로 구분한 data 메시지를 보낸다. 브라우저는 EventSource로 읽고 컴포넌트 해제 때 close한다. 이 샘플은 시간 heartbeat 알림이며 실제 게시글 변경 이벤트라고 표시하지 않는다. WebSocket은 adapter-node에 기본 upgrade route가 없으므로 server.mjs에서 ws upgrade를 처리한다. Origin을 고정하고 최대 메시지 크기를 1KB로 제한한다.

WebSocket 예시는 공개 ping/pong만 제공한다. 개인 알림을 넣으려면 upgrade 단계에서 세션·권한·만료를 검증하고 다중 인스턴스는 공유 pub/sub를 사용한다. 업로드 파일은 static이 아닌 서버 전용 경로에 저장하고 다른 사용자에게 공개하지 않는다. 연결을 계속 열어 두는 기능은 무료 서버리스의 실행 제한과도 맞아야 한다.''',
'''1. build 후 `npm start`를 실행하고 `/realtime`을 연다. Vite dev만으로 custom WebSocket은 켜지지 않는다.
2. SSE 시간 알림과 WebSocket pong 응답을 확인한다.
3. 다른 페이지로 이동할 때 EventSource·WebSocket이 닫히는지 Network에서 확인한다.
4. 다른 Origin의 WebSocket upgrade가 거부되는지 검사한다.
5. 큰 파일·잘못된 인코딩·남의 파일 다운로드가 거부되는지 검사한다.''',
'파일에서 읽은 텍스트를 다음 단계 AI 입력으로 연결할 수 있다. 개인 이벤트에는 현재 로그인 세션의 권한 검사가 추가되어야 한다.',
[('WebSocket 404','Vite 또는 node build만 실행','custom server를 실행하는 npm start 사용'),('프록시 뒤 SSE가 한꺼번에 도착','버퍼링 사용','X-Accel-Buffering과 프록시 buffering 설정 확인')],
['WebSocket ping을 세 번 보내고 응답을 세자.','페이지를 이동하고 열린 연결이 남는지 확인하자.','개인 알림을 위한 인증·재연결 설계를 작성하자.'],['SSE·WebSocket 실제 연결','Origin·크기·종료 처리','파일 인코딩·크기·소유권'],['src/routes/api/events/+server.ts','src/routes/realtime/+page.svelte','server.mjs','src/routes/api/files/[id]/+server.ts']),
18: ('AI 연동·MCP', 'SvelteKit 서버에서 문서 근거 AI 스트림과 읽기 전용 MCP 도구를 제공한다.',
'''모델 API는 서버가 호출하고 화면은 서버의 스트림만 읽는다. 프롬프트는 역할·근거·출력 규칙을 분리한다. 문서 내용은 명령이 아닌 자료로 취급하고, 근거가 없으면 모른다고 답하게 한다. 도서관 사서가 관련 페이지를 골라 답변자에게 주는 과정이 retrieval이며 이 샘플은 단순 단어 일치로 최대 3개 발췌를 고른다. 임베딩 기반 검색과 동일한 품질이라고 주장하지 않는다.

노션 DocuForge의 핵심 요구는 ‘문서를 요약하고 발췌에 근거해 질문에 답하기’다. 이 과정에서는 그 문제를 **SvelteKit 한 프로젝트**의 `/ai`·`/api/ai`·server/ai로 학습한다. 다른 프레임워크를 통합하거나 기존 프로젝트를 수정하지 않는다. txt/md 텍스트 입력만 지원하며 PDF·DOCX 파서와 영속 채팅 기록은 이 미니 예제의 범위 밖이다.

Ollama `/api/chat`의 NDJSON 응답은 네트워크 chunk 경계와 JSON 줄 경계가 다르다. TextDecoderStream과 buffer로 줄을 모아 파싱하고 AbortController로 중단한다. AI_MODE=mock은 명시적 모의 응답이고 live 모드의 실패를 mock 성공으로 숨기지 않는다.

MCP는 모델·호스트가 도구를 발견하고 호출하는 프로토콜이다. SDK v1.32 계열을 고정한 stdio 서버는 search_posts만 공개한다. 클라이언트는 초기화→도구 목록→호출→종료를 수행한다. 이 도구에는 쓰기·비밀 파일 접근 권한이 없다. stdio stdout에 디버그 로그를 섞지 않는다.''',
'''1. Ollama에 사용할 모델을 설치하고 OLLAMA_URL·OLLAMA_MODEL을 확인한다. 모델 이름은 로컬 설치 목록과 맞춘다.
2. `/board`에서 로그인 후 `/ai`에 문서와 질문을 입력한다. 최대 문서 20000자·질문 500자·60초 제한이 있다.
3. Network에서 NDJSON이 점진적으로 전달되는지 확인하고 중단 버튼을 시험한다. AI_MODE=mock으로 UI 계약만 검사할 수도 있다.
4. 발췌 번호와 실제 원문을 사람이 대조한다. 프롬프트만으로 injection이 완전히 차단되는 것은 아니다.
5. 게시판 서버를 켠 뒤 BOARD_ORIGIN을 지정하고 `npm run mcp:client -- 검색어`를 실행한다. MCP 호스트 등록은 별도의 설정이다.''',
'업로드 텍스트→발췌 검색→모델 스트림→화면 표시를 final의 기능에 합친다. MCP는 같은 공개 게시판 API를 재사용하며 모델에 DB 비밀을 넘기지 않는다.',
[('한글 또는 JSON이 깨짐','임의 byte chunk마다 JSON.parse','TextDecoderStream·줄 buffer 사용'),('AI 연결 실패','주소·모델 미설치·타임아웃','실제 모델 목록·서버 로그 확인'),('MCP 프로토콜 오류','stdout에 일반 로그 출력','stderr 사용·SDK 전송 계층 유지')],
['문서에 없는 질문으로 근거 없음 응답을 확인하자.','중간에 응답을 중단하고 새 질문을 보내자.','MCP 클라이언트로 공개 검색 도구를 호출하고 쓰기 도구가 없는지 확인하자.'],['서버 모델 API·근거 프롬프트','NDJSON·UTF-8·취소·타임아웃','MCP 서버·클라이언트·최소 권한','DocuForge 문제를 단일 SvelteKit 예제로 연결'],['src/lib/server/course/ai.ts','src/routes/api/ai/+server.ts','src/routes/ai/+page.svelte','scripts/mcp-server.mjs','scripts/mcp-client.mjs'])
}

def explain(line):
    t=line.strip()
    if not t: return '가독성을 위해 구간을 나누는 빈 줄이다.'
    if t.startswith(('//','# ')): return '이어지는 코드의 제약 또는 의도를 설명하는 주석이다.'
    if t.startswith('import '):
        module=re.search(r"from ['\"]([^'\"]+)",t)
        return ('`'+module.group(1)+'`에서 필요한 '+('타입만 가져와 실행 번들에 넣지 않는다.' if 'import type' in t else '함수·컴포넌트를 가져온다.') ) if module else '부작용 import로 스타일 또는 초기화를 적용한다.'
    if '$state' in t: return '사용자가 바꿀 원본을 반응형 상태로 선언한다. 값 변경이 연결된 화면을 갱신한다.'
    if '$derived' in t: return '원본 상태에서 파생 값을 계산한다. 중복 상태를 따로 저장하지 않는다.'
    if '$props' in t: return '부모 또는 라우터에서 받은 props를 읽는다. 상태의 전달 경계다.'
    if '$effect' in t: return '의존 값이 바뀔 때 외부 상태와 동기화한다. 일반 계산은 derived에 둔다.'
    if 'requireValue(' in t: return '조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다.'
    if 'authorized(' in t: return '로그인한 사용자임을 서버에서 확인한 뒤 쓰기·개인 데이터 접근을 허용한다.'
    if 'AbortSignal' in t: return '취소 또는 제한 시간 신호를 전달해 끝나지 않는 외부 요청을 제한한다.'
    if 'JSON.parse' in t: return '문자열 JSON을 자료로 변환한다. 스트림에서는 완성된 줄인지 먼저 확인해야 한다.'
    if 'JSON.stringify' in t: return '자료를 JSON 문자열로 직렬화해 저장·전송 경계에 맞춘다.'
    if 'Response.json' in t: return 'JSON HTTP 응답을 만든다. status·headers와 본문 계약을 함께 확인한다.'
    if 'cookies.set' in t: return '브라우저 세션 쿠키를 설정한다. path·HttpOnly·SameSite·Secure 수명을 함께 관리한다.'
    if 'cookies.delete' in t: return '설정한 path와 같은 경로의 쿠키를 삭제한다.'
    if '.headers.' in t: return '요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다.'
    if 'redirect(' in t: return 'HTTP 리다이렉트로 다음 URL을 열고 현재 요청 처리를 끝낸다.'
    if 'await ' in t: return '비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다.'
    if 'throw ' in t: return '잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다.'
    if 'catch' in t: return '실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다.'
    if 'finally' in t: return '성공·실패와 관계없이 제출 잠금 또는 연결 자원을 정리한다.'
    if t.startswith('export '): return '이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다.'
    if t.startswith(('const ','let ')): return '현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다.'
    if t.startswith(('if ','if(','else','} else')): return '입력·권한·성공 여부에 따라 실행 경로를 나눈다.'
    if t.startswith(('for ','for(','while ')): return '모음 또는 스트림의 항목을 순서대로 처리한다.'
    if 'return ' in t: return '계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다.'
    if 'CREATE TABLE' in t or 'REFERENCES' in t: return '저장 모델의 컬럼·기본키·관계 제약을 선언한다.'
    if t.startswith(('<script','</script')): return '컴포넌트 스크립트 구간의 경계를 정한다.'
    if '{#if' in t or '{:else}' in t or '{/if}' in t: return '조건에 맞는 UI만 렌더하거나 빈 상태를 표시한다.'
    if '{#each' in t or '{/each}' in t: return 'id/key를 기준으로 목록 항목의 DOM과 상태를 연결한다.'
    if '{@render' in t: return '부모에서 전달한 snippet을 현재 위치에 렌더한다.'
    if 'onsubmit' in t or 'onclick' in t or 'onchange' in t: return '사용자 동작을 함수로 연결한다. 비동기 작업 중 중복 실행 여부를 확인한다.'
    if 'bind:' in t: return '입력 요소와 컴포넌트 상태를 양방향으로 연결한다.'
    if t.startswith('<'): return '화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다.'
    if t.startswith(('FROM ','COPY ','RUN ','ENV ','USER ','CMD ','EXPOSE ','WORKDIR ','HEALTHCHECK')): return '컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다.'
    if t in ['}', '};', '});', '});', '];', '};', ')', ');']: return '앞에서 연 블록·함수·자료 선언을 닫는다.'
    if ':' in t: return '객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다.'
    return '현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다.'

def codefile(path):
    # ../../ is relative to the application directory for the two workflow files.
    actual = str(Path(APP+path))
    code=read(actual)
    suffix=Path(path).suffix
    lang={'.ts':'ts','.mjs':'js','.svelte':'svelte','.yml':'yaml','.json':'json'}.get(suffix,'dockerfile' if path=='Dockerfile' else 'text')
    lines=code.splitlines()
    table='\n'.join(f'| {i} | {explain(line)} |' for i,line in enumerate(lines,1))
    return f'### `{path}` 전체 코드\n\n[실제 파일]({actual.replace(chr(92),"/")}) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.\n\n```{lang}\n{code}\n```\n\n**줄별 설명**\n\n| 줄 | 설명 |\n|---|---|\n{table}\n'

req=json.loads(read('docs/notion-requirements.json'))
mapping={0:[req['sveltekit'][0], req['transition'][0]],4:req['sveltekit'][1:4]+req['transition'][1:3],5:[req['sveltekit'][4],req['transition'][3]],7:[req['sveltekit'][5],req['transition'][4]],10:[req['transition'][6]],11:[req['sveltekit'][8]],16:[req['transition'][6]],'Midpoint':[req['sveltekit'][6]],'Final':[req['sveltekit'][7],req['sveltekit'][9],req['transition'][5],req['transition'][7]]}

setup='''```powershell
node -v
npm -v
# 새 프로젝트에만: npx sv create pine
cd ts_version/project
npm ci
Copy-Item .env.example .env
npm ls @sveltejs/kit svelte vite
npm run dev -- --host 127.0.0.1
```

명령별 설명: 1~2줄은 실행기·패키지 도구 확인, 3줄은 새 폴더 생성 안내, 4줄은 앱 루트 이동, 5줄은 lockfile 설치, 6줄은 로컬 설정 생성, 7줄은 실제 설치 버전 확인, 8줄은 개발 서버 시작이다. 별도 터미널에서 `git status`, `git check-ignore .env`를 실행한다. Git이 없는 새 저장소에서만 `git init`을 하고 `.gitignore`에 node_modules·.svelte-kit·build·.env·DB·업로드·백업을 제외한다.
'''

top10='''### 자주 나는 오류 TOP 10

| 증상 | 원인 | 해결 |
|---|---|---|
| window/localStorage 없음 | SSR에서 브라우저 API | onMount·사용자 이벤트로 이동 |
| 상태 변경 미표시 | 일반 let | $state 선언 |
| props 경고 | 반응형 자료를 한 번만 캡처 | getter·derived 또는 의도적 초기화 주석 |
| bind 실패 | 자식이 $bindable 미선언 | 명시적 허용 또는 콜백 |
| 라우트 404 | +파일·폴더 위치 오류 | src/routes와 동적 경로 확인 |
| import 경계 오류 | 클라이언트가 server 모듈 import | 서버 load/API 경유 |
| env 없음 | 선언·실행 폴더·재시작 누락 | src/env와 .env 확인 |
| form 403 | Origin 불일치 | 외부 도메인과 ORIGIN 일치 |
| 로그인 401 | 만료·Secure·잘못된 쿠키 | 쿠키·HTTPS·세션 DB 확인 |
| 변경 없는 필드 초기화 | 생성 schema default를 PATCH에 재사용 | postPatchSchema 분리 |
'''
dbtable='''### DB 연결과 ORM 선택 설정

| DB_KIND | DATABASE_URL 예시 | 실행 driver·모델 차이 | ORM을 도입할 때 |
|---|---|---|---|
| sqlite | file:data/board.sqlite | DatabaseSync, 로컬 파일·정수 PK | Prisma provider sqlite, 로컬 migration |
| postgres | postgresql://pine:비밀@127.0.0.1:55432/pine | pg Pool, IDENTITY·RETURNING·quoted camelCase | provider postgresql, 전용 migration 디렉터리 |
| mariadb | mysql://pine:비밀@127.0.0.1:53306/pine | mysql2 Pool, AUTO_INCREMENT·insertId | provider mysql, PostgreSQL migration 재사용 금지 |
| mongodb | mongodb://pine:비밀@127.0.0.1:57017/pine?authSource=admin | collection·unique index·숫자 counters | provider mongodb, ObjectId 매핑·replica set 트랜잭션 조건 확인 |

```powershell
# 저장소 root, .env 준비 후
docker compose --profile database-lab up -d db mariadb mongodb
# 앱 터미널 (비밀 값은 실제 로컬 값으로 대체)
$env:DB_KIND='postgres'
$env:DATABASE_URL='postgresql://pine:비밀@127.0.0.1:55432/pine'
npm start
```

1줄은 테스트 DB 기동, 3~4줄은 실행 프로세스 설정, 5줄은 새 연결로 시작이다. 연결 전환은 데이터 이관과 다르다. 운영 migration·Mongo 다중 문서 원자성은 별도 설계가 필요하다.
'''
ops='''### 운영·배포·복구 점검

- [ ] `.env`·키·DB 덤프가 Git에 들어가지 않는지 확인
- [ ] lockfile 설치, 단위·API 검사, 빌드 통과
- [ ] 이미지 비root 실행, 영속 DB·업로드 volume, DB 비공개 접근
- [ ] ORIGIN·PUBLIC_ORIGIN·CORS_ORIGIN·OAuth callback을 실제 HTTPS 주소와 일치
- [ ] `/health` DB 연결, 가입·로그인·CRUD·로그아웃 재검사
- [ ] 로그 requestId·status·지연 수집, 5xx·DB 장애·디스크 경고 알림
- [ ] 백업 retention·암호화·외부 보관, 업로드도 별도 백업
- [ ] 별도 DB에서 `pg_restore` 후 데이터 개수·관계 검증
- [ ] 이전 이미지 SHA·설정으로 rollback 훈련
- [ ] 외부 배포 URL·실행한 Actions run을 기록하고 미실행은 체크하지 않기

```powershell
# root .env 설정 후
docker compose config
docker compose up --build -d
docker compose ps
docker compose logs --tail 50 web
./scripts/backup.ps1
# 복구는 운영 DB가 아닌 별도 restore_test DB에 한다.
docker compose exec -T db createdb -U pine restore_test
docker compose exec -T db pg_restore -U pine -d restore_test /tmp/pine.dump
```

config는 변수·구문 검사, up은 이미지 빌드와 기동, ps는 health, logs는 최근 출력, backup은 custom dump 생성이다. 마지막 두 줄은 복원 연습이며 성공 후 `/tmp/pine.dump` 파일과 생성 DB를 별도로 관리한다. 운영 복원에는 유지보수·원복 계획을 먼저 세운다.
'''

sources='''- [SvelteKit 3 마이그레이션](https://svelte.dev/docs/kit/migrating-to-sveltekit-3)
- [SvelteKit 어댑터](https://svelte.dev/docs/kit/adapters)
- [GitHub OAuth](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [Stripe 웹훅 운영](https://docs.stripe.com/events/manage-webhook-endpoints)
- [Ollama chat API](https://docs.ollama.com/api/chat)
- [MCP SDK v1 서버](https://ts.sdk.modelcontextprotocol.io/server)
'''

def checklist(key, items):
    original=mapping.get(key,[])
    text='\n'.join('- [ ] '+v for v in items)
    if original:
        text+='\n\n**📌 노션 원문 추가 항목** — 문구·괄호·원문 링크를 그대로 보존했다. 원래 다른 저장소 경로를 가리키는 항목도 바꾸지 않았다. 이 문서에서는 학습 확인용 빈 체크로 옮긴다. 현재 검증 여부는 README와 검증 기록을 따른다.\n\n'
        text+='\n'.join(re.sub(r'^- \[[ x]\]', '- [ ]', v) for v in original)
    return text

for n, data in lessons.items():
    title,objective,theory,walk,connection,errors,exercises,checks,files=data
    extra=''
    if n==0: extra=setup
    if n==9: extra=top10
    if n==11: extra=dbtable
    if n in [10,16]: extra=ops
    if n==14: extra='전체 OpenAPI 원문은 [openapi.json](ts_version/project/static/openapi.json)에 있으며 13개 method/path를 기술한다. 공통 v1 원문은 [노션](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e)을 따른다.\n'
    if n==18: extra='DocuForge 요구 원문: [문서 요약·질의응답](https://app.notion.com/p/40bd7dec5e2e818d9c91c6fb26dccc4c). 기존 다중 프레임워크 코드를 연결하는 작업은 하지 않는다.\n'
    nextname='studyMidpoint' if n==10 else 'studyFinal' if n==18 else f'study{n+1}'
    err='\n'.join(f'| {a} | {b} | {c} |' for a,b,c in errors)
    text=f'''# study{n} — {title}

## ① 목표 한 줄

{objective}

이 문서는 SvelteKit 하나만 다룬다. 실행 코드: `ts_version/project`·`js_version/project`, 기초 SSR 기존 예제는 `*/demo`다. TypeScript 전체 코드를 싣고 JavaScript는 같은 상대 위치의 `.js`·타입 없는 script로 제공한다. 프로젝트의 심화 기능은 뒤 단계를 위해 미리 존재하지만 해당 단계의 원리와 파일부터 순서대로 학습한다.

## ② 📖 이론

{theory}

## ③ 🛠️ 실기 — 전체 코드와 줄별 설명

{walk}

실행: 앱 루트에서 `npm ci` 후 `npm run dev`, 배포 산출물은 `npm run build` 후 `npm start`다. 환경 설정은 [study0](study0.md), 실행 결과와 범위는 [검증 기록](docs/verification.md)을 참고한다. 코드 블록은 실제 파일 원문이며 import된 의존 파일은 저장소에 함께 있다.

{extra}

'''+ '\n'.join(codefile(f) for f in files)+f'''
## ④ 🔗 연동 포인트

{connection}

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
{err}

## ⑥ 직접 해보기

'''+ '\n'.join(f'{i}. {v}' for i,v in enumerate(exercises,1))+f'''

## ⑦ ☐ 체크리스트

{checklist(n,checks)}

## ⑧ 다음 단계 연결 문장

이 단계의 결과를 [{nextname}]({nextname}.md)에 연결한다. {connection.split('. ')[-1]}

공식 자료: [SvelteKit 문서](https://svelte.dev/docs/kit). 상세 출처는 [README](README.md)의 공식 자료와 노션 원문 링크를 따른다.
'''
    write(f'study{n}.md',text)

def application(key,title,objective,advanced):
    files=['src/routes/board/+page.server.ts','src/routes/board/+page.svelte','src/routes/board/[id]/+page.svelte']
    if advanced: files=['src/routes/api/[...path]/+server.ts','src/lib/server/course/ai.ts','Dockerfile','server.mjs']
    topics='DB 교체·외부 서비스·AI·운영' if advanced else '라우팅·상태·폼·DB·인증·테스트'
    stages=('''1. midpoint의 가입·세션·CRUD를 기준점으로 테스트한다.
2. study11 storage 어댑터를 PostgreSQL로 바꾸고 API 계약 검사를 다시 실행한다. SQLite 자료 이관은 별도 백업·id 대조 작업이다.
3. study12의 UI 폼을 붙이고 같은 schema·service를 재사용한다.
4. study13의 테스트 결제·메일·업로드·OAuth 키를 공급자 설정에서 준비하고 해당 기능만 연결한다.
5. study14의 OpenAPI와 응답을 대조하고 study15 캐시·작업의 실패 경로를 검사한다.
6. study17 SSE·WebSocket·파일 소유권을 확인하고 study18 문서 AI·읽기 전용 MCP를 붙인다.
7. Docker 이미지→PostgreSQL compose→API·브라우저 검사→백업 복구→Actions 배포 순으로 진행한다.
8. 외부 URL과 공급자 실호출 증거가 없는 항목은 완료 체크하지 않는다.''') if advanced else ('''1. study0의 환경 설정과 study1~3의 `/lab`로 Svelte 문법·props·상태를 익힌다.
2. `/board` 목록→`/board/[id]` 상세를 만들고 load 결과가 SSR HTML에 포함되는지 확인한다.
3. SQLite members·posts·comments·sessions 테이블을 생성한다.
4. 회원가입·로그인·HttpOnly 쿠키·hooks의 locals.member를 연결한다.
5. action으로 글쓰기, 같은 service를 이용하는 API CRUD, 상세 화면 수정·삭제를 연결한다.
6. 두 계정으로 401·403, 빈 값 400, 생성 201·Location, 삭제 204를 확인한다.
7. 단위·요청 검사 후 adapter-node 빌드로 첫 실행을 확인한다. 심화 UI·외부 서비스·AI는 아직 필요하지 않다.''')
    features='''- 회원가입·로그인·로그아웃·세션 만료·작성자 권한
- 게시글 목록·상세·검색·페이지네이션·등록·부분 수정·삭제
- 댓글 목록·등록·본인 댓글 삭제, 내 글만 보기·페이지 크기 선택
- SSR·form action·JSON API·requestId 오류 추적'''
    if advanced: features+='\n- PostgreSQL 기본 운영 구성·MariaDB/MongoDB 교체 어댑터\n- 테스트 결제 영수증·본인 메일·UTF-8 파일·GitHub OAuth 연결 코드\n- 문서 발췌 AI 스트림·공개 검색 MCP·SSE·WebSocket\n- Docker·CI/CD 구성·작업 재시도·백업 복구 절차'
    text=f'''# study{key} — {title}

## ① 목표 한 줄

{objective}

## ② 📖 이론

이 응용은 {topics}을 하나의 **소나무 게시판**으로 연결한다. 화면과 API는 같은 service를 사용하며 권한·검증 규칙을 복사하지 않는다. 레고 부품처럼 각 단계의 계약이 맞아야 조립 후에도 안전하게 동작한다. SvelteKit 외 프레임워크를 함께 사용하거나 비교하지 않는다.

### 목표·기능 목록

{features}

### 폴더 구조

```text
project/
├─ src/routes/board/[id]/      목록·상세 UI와 서버 load/action
├─ src/routes/api/[...path]/   공통 API v1
├─ src/lib/course/            공개 schema·상태
├─ src/lib/server/course/     DB·세션·검증·외부 연동
├─ src/hooks.server.ts        요청별 사용자·로그·CORS
├─ tests/                     단위·HTTP 계약 검사
├─ scripts/                   MCP·측정·worker
├─ static/openapi.json        API 계약
└─ Dockerfile·server.mjs       운영 실행
```

### DB·API 연동 구성도

```mermaid
flowchart LR
  B[브라우저 Svelte 화면] --> L[load와 form action]
  B --> A[SvelteKit API]
  H[hooks 세션 검사] --> L
  H --> A
  L --> S[공통 service와 schema]
  A --> S
  S --> D[Storage: SQLite 또는 PostgreSQL]
  S --> E[외부 서비스·AI: 심화에서 연결]
  M[읽기 전용 MCP: 심화] --> A
```

## ③ 🛠️ 실기 — 단계별 구현 순서·전체 코드

{stages}

구현을 처음부터 따라가려면 위 순서의 study 문서에서 파일을 만든다. 아래는 응용의 진입 파일 전체다. DB·인증 전체 코드는 [study6](study6.md)·[study7](study7.md), API 전체 코드는 [study6](study6.md), 심화 파일은 각 번호 문서에 줄별 설명과 함께 있다. JS와 TS의 경로·기능은 같다.

'''+ '\n'.join(codefile(f) for f in files)+f'''
## ④ 🔗 연동 포인트

화면 `/board/:id`와 API `/api/posts/:id`는 동일한 service.post를 사용한다. 쿠키 세션은 hooks→locals.member→load로 전달한다. DB URL·키는 서버 환경변수에서만 읽고 모델 입력에 넣지 않는다. {'기본 게시판에 study11~18을 차례로 연결한다.' if advanced else 'midpoint는 study0~10의 기능만으로 완성하고 심화 모듈은 아직 호출하지 않는다.'}

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| API와 action 검증이 다름 | 규칙 복사 | schema·service 한 곳에서 검사 |
| 서버 재시작 후 자료 없음 | DB URL·실행 cwd 변경 | 앱 루트·영속 DB 확인 |
| 내 글 필터가 페이지 이동에 풀림 | mine 쿼리 누락 | q·limit·mine·page를 새 링크에도 전달 |
| 외부 연동 503 | 자격 증명 미설정 | env를 준비하고 실제 연결은 별도 검증 |

## ⑥ 직접 해보기

1. 두 계정으로 글·댓글을 만들고 남의 자료 수정·삭제가 거부되는지 확인하자.
2. {'DB 하나를 바꾸고 같은 API 테스트가 통과하는지 확인하자.' if advanced else 'JS를 끄고 로그인 쿠키가 있는 브라우저에서 글을 등록하자.'}
3. {'AI 실패·취소·근거 없는 질문을 재현하고 오류를 기록하자.' if advanced else '빌드 결과로 실행한 뒤 검색·상세·로그아웃 흐름을 반복하자.'}

## ⑦ ☐ 체크리스트 — {'배포' if advanced else '1차 배포'}

{checklist(key,['기능 목록과 실제 경로 대조','가입·로그인·CRUD·권한·실패 경로 확인','단위·API·빌드 통과','DB·환경변수·영속 저장소 점검'])}

{ops}

### {'최종 회고' if advanced else '회고'}

서비스 규칙을 API와 action에서 공유하면서 검증·권한 누락을 줄였다. 부분 수정 테스트로 default 태그가 덮이는 회귀를 잡았고 JS·TS는 같은 원본에서 동작을 맞춘다. 현재 저장소의 실제 검증 결과는 [검증 기록](docs/verification.md)에서 확인한다.

{'남은 운영 과제는 대량 DB 쿼리 pushdown·다중 worker 원자 claim·외부 실서비스 배포다. AI 검색은 단어 일치 실습이며 실제 모델 품질·근거 검토가 필요하다. 코드가 있다고 공급자 실호출·HTTPS 배포·MCP 호스트 등록까지 완료된 것은 아니다.' if advanced else '공개 API와 화면을 하나의 저장소에 두어 요청·DB·응답을 끝까지 관찰할 수 있었다. 다음에는 학습용 SQLite를 서버 DB로 확장하고 외부 서비스 실패 경계를 다룬다.'}

## ⑧ 다음 단계 연결 문장

{'실제 운영 계정·도메인·서비스 키를 준비한 뒤 체크리스트의 미실행 항목을 하나씩 검증하고 결과를 노션에 갱신한다.' if advanced else '[study11](study11.md)에서 같은 API 계약으로 DB 연결을 교체한다.'}

### 노션 항목 반영 누락

SvelteKit 페이지의 학습 목표 7개·추가 항목 3개와 Svelte 페이지의 SvelteKit 이전 체크 8개를 해당 번호에 전부 배치했다. 문서 미배치 항목은 **없음**이다. 원문에 남아 있는 다른 저장소 경로는 문자 그대로 보존했으며 현재 경로는 README의 매핑을 따른다. 범위 밖인 다른 프레임워크 비교·통합은 구현하지 않았다. 실제 외부 배포 등 미실행은 위 체크리스트와 검증 기록에 남겼다.
'''
    write(f'study{key}.md',text)

application('Midpoint','중간 응용: 로그인 게시판','study0~10만으로 로그인·게시판 CRUD·첫 배포 점검을 완성한다.',False)
application('Final','심화 응용: 소나무 게시판 완성','midpoint에 DB 교체·외부 연동·AI·운영 검증을 연결한다.',True)

names=[f'study{i}' for i in range(11)]+['studyMidpoint']+[f'study{i}' for i in range(11,19)]+['studyFinal']
titles={f'study{i}':v[0] for i,v in lessons.items()}|{'studyMidpoint':'중간 응용: 로그인 게시판','studyFinal':'심화 응용: 소나무 게시판'}
rows='\n'.join(f'| [{name}]({name}.md) | {titles[name]} |' for name in names)
write('README.md', f'''# SvelteKit 학습 저장소

SvelteKit 한 프레임워크로 환경 설정부터 로그인 게시판·서버 DB·AI·운영까지 학습한다. [노션 원문](https://app.notion.com/p/3fdd7dec5e2e81cea8e6e8daa94a52e2)을 기준으로 기존 study 파일을 새 커리큘럼에 맞게 덮어썼다. 루트 문서는 study0~18·studyMidpoint·studyFinal 총 21개이며 midpoint/final도 study 접두사를 사용한다.

## 실행

Node 24, npm 11. 각 앱의 package-lock.json이 정확한 설치 버전 기준이다. 현재 과정은 `ts_version/project` 또는 `js_version/project`의 `/board`다. 두 버전은 같은 기능이며 `.agent/sync-course.mjs`로 TS 타입만 제거해 JS를 동기화한다.

{setup}

브라우저에서 `/board`를 열고 새 계정으로 가입한다(비밀번호 10자 이상). `/lab`은 기초 문법·초안, `/ui`는 UI/폼 라이브러리, `/integrations`는 외부 서비스, `/realtime`은 SSE/WebSocket, `/ai`는 문서 AI, `/api-docs`는 OpenAPI다. WebSocket은 `npm run build` 후 `npm start`로 실행한다. 기존 demo의 `/`·`/posts`·방명록, project의 `/notes`는 이전 학습 기록이며 현재 게시판과 계정·쿠키·DB가 분리돼 있다.

## 학습 순서

| 문서 | 주제 |
|---|---|
{rows}

각 문서는 목표 → 이론(용도·개념·비유) → 실기(전체 파일·줄별 설명) → 연동 → 오류 노트 → 연습 2~3개 → 체크리스트 → 다음 단계 순서다. 응용 문서는 기능·폴더·구현 순서·구성도·배포 점검·회고를 포함한다.

## 문서와 코드 연결

| 구간 | 현재 코드 |
|---|---|
| study0~3 | `*/project` vite/env, `/lab`, StudyCard·createDraft; 기존 SSR 예시는 `*/demo` |
| study4~5 | `*/project/src/routes/board`, `[id]`, error, action·schema |
| study6~8·Midpoint | `*/project/src/lib/server/course`, hooks, `/api/[...path]` |
| study9~10 | `*/project/tests`, Dockerfile·server.mjs; demo 빌드도 유지 |
| study11 | storage: SQLite·pg·mysql2·Mongo 어댑터, root compose |
| study12~14 | ui·integrations·oauth·api-docs, static/openapi.json |
| study15~17 | cache·jobs·worker·measure·events·realtime·files, workflows·backup |
| study18·Final | ai·MCP scripts + 전체 게시판·Docker 운영 |

DB 접속 전환은 새 DB 연결을 선택하는 기능이며 기존 SQLite 자료를 자동 이관하지 않는다. 업로드는 UTF-8 txt/md만, 결제는 테스트 키·영수증 저장만 지원한다. worker는 단일 웹 인스턴스 학습용이며 여러 인스턴스의 원자 claim은 별도 구현이 필요하다. AI는 단어 검색 기반 미니 예제이며 PDF 파서·영속 채팅은 포함하지 않는다.

## 검증·운영

```powershell
# project 앱 루트
npm test
npm run build
# TS: npm run check
npm start
# 별도 앱 터미널
$env:BASE_URL='http://localhost:3000'
npm run test:api
npm run measure
$env:BOARD_ORIGIN='http://localhost:3000'
npm run mcp:client -- 문서
```

상세 실행 결과·미실행 범위는 [docs/verification.md](docs/verification.md), 노션 체크 원문은 [docs/notion-requirements.json](docs/notion-requirements.json)이다. 원문 18개 체크 항목은 각 문서의 ‘📌 노션 원문 추가 항목’에 빈 체크로 그대로 배치했으며 **문서 미배치 없음**이다. Svelte 페이지의 다른 저장소 경로가 들어간 원문은 수정하지 않고 현재 대응 위치를 위 표에 안내했다.

Docker·CI/CD·백업 복구·외부 배포 점검은 [study16](study16.md)을 따른다. 공급자 키·OAuth 앱·실제 호스팅 설정이 없는 기능은 설정 미완료를 오류로 반환한다. GitHub Actions 파일과 실제 Actions 실행·배포 성공은 구분한다.

## 공식 자료와 요구 출처

{sources}

- [공통 API 스펙 v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e)
- [Svelte 페이지의 이전 체크리스트](https://app.notion.com/p/3fdd7dec5e2e81b89b69c07abd5d2f81)
- [AI 미니 프로젝트 명단](https://app.notion.com/p/40bd7dec5e2e81dab88fda4b558aa498)
- [DocuForge 요구](https://app.notion.com/p/40bd7dec5e2e818d9c91c6fb26dccc4c)

문서 원문·줄별 설명 갱신: `python scripts/build-study-docs.py`. 코드 수정 후 JS 동기화→검증→문서 생성→노션 갱신 순서로 작업한다.
''')
for version in ['ts_version','js_version']:
    write(f'{version}/project/README.md',f'''# 소나무 게시판 ({version})

현재 21단계 학습의 실행 앱. root [README](../../README.md)·[studyMidpoint](../../studyMidpoint.md)·[studyFinal](../../studyFinal.md)을 따른다.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

`/board`에서 새 계정 가입, `/lab` 기초 실습, `/ui` 폼, `/integrations` 외부 연동, `/ai` 문서 AI. 운영은 `npm run build` 후 `npm start`. 정확한 DB·키 설정·검증 범위는 루트 문서를 따른다. `/notes`는 이전 SQLite 메모 예시로 현재 게시판 계정과 분리돼 있다. 기본 DB는 `data/board.sqlite`다. PostgreSQL 등은 DB_KIND·DATABASE_URL로 전환하며 자동 이관은 하지 않는다.
''')
print('21 study documents and READMEs generated')
