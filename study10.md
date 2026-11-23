# study10 — 배포·정리

## ① 목표 한 줄

프로덕션 빌드를 실행하고 환경변수·DB·HTTPS 점검 순서를 익힌다.

이 문서는 SvelteKit 하나만 다룬다. 실행 코드: `ts_version/project`·`js_version/project`, 기초 SSR 기존 예제는 `*/demo`다. TypeScript 전체 코드를 싣고 JavaScript는 같은 상대 위치의 `.js`·타입 없는 script로 제공한다. 프로젝트의 심화 기능은 뒤 단계를 위해 미리 존재하지만 해당 단계의 원리와 파일부터 순서대로 학습한다.

## ② 📖 이론

개발 서버는 변경 감지와 디버깅용이고 배포는 빌드 산출물을 실행한다. adapter-node는 Node 실행용 결과를 만든다. `npm run build` 후 일반 HTTP는 `node build`, 이 과정의 WebSocket 확장은 `npm start`의 server.mjs로 실행한다.

도메인은 사람이 읽는 주소, DNS는 주소를 서버에 연결하는 체계, HTTPS는 인증서로 서버 신원을 확인하고 전송을 암호화한다. reverse proxy는 HTTPS를 종료하고 Node로 전달한다. ORIGIN은 브라우저가 보는 외부 주소와 일치해야 form Origin 검사·OAuth callback이 맞는다.

DB는 빌드에 넣지 않고 운영 실행 환경에서 연결한다. SQLite 파일과 업로드는 쓰기 가능한 영속 경로, PostgreSQL은 별도 서비스와 접속 URL을 사용한다. 컨테이너를 지워도 데이터를 유지하려면 volume이 필요하다. 배포 성공의 기준은 빌드 완료가 아니라 외부 주소에서 건강 확인·로그인·CRUD가 되는 것이다.

## ③ 🛠️ 실기 — 전체 코드와 줄별 설명

1. `npm ci`, `npm run check`(TS), `npm test`, `npm run build`를 실행한다.
2. project 폴더에서 PORT·ORIGIN·DB_KIND·DATABASE_URL을 지정하고 `npm start`한다.
3. `/health`, `/board`, 회원·게시글 API를 확인한다. 외부 서버 배포는 연결된 계정·도메인 설정을 별도로 준비해야 한다.
4. `.env`는 adapter-node가 자동으로 읽는다고 가정하지 않는다. 이 저장소의 start는 Node `--env-file-if-exists=.env`를 사용한다.
5. 로컬 컨테이너 확인과 외부 HTTPS 배포 완료를 구분해 체크한다.

실행: 앱 루트에서 `npm ci` 후 `npm run dev`, 배포 산출물은 `npm run build` 후 `npm start`다. 환경 설정은 [study0](study0.md), 실행 결과와 범위는 [검증 기록](docs/verification.md)을 참고한다. 코드 블록은 실제 파일 원문이며 import된 의존 파일은 저장소에 함께 있다.

### 운영·배포·복구 점검

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


### `Dockerfile` 전체 코드

[실제 파일](ts_version/project/Dockerfile) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build && npm prune --omit=dev --ignore-scripts
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json /app/server.mjs ./
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 2 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 3 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 4 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 5 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 6 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 7 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 8 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 9 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 10 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 11 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 12 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 13 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 14 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 15 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 16 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 17 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |

### `server.mjs` 전체 코드

[실제 파일](ts_version/project/server.mjs) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```js
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { handler } from './build/handler.js';
const origin = process.env.ORIGIN || 'http://localhost:3000';
const server = createServer(handler),
	sockets = new WebSocketServer({ noServer: true, maxPayload: 1024 });
server.on('upgrade', (request, socket, head) => {
	if (request.url !== '/ws' || request.headers.origin !== origin) {
		socket.destroy();
		return;
	}
	sockets.handleUpgrade(request, socket, head, (ws) => {
		ws.on('error', console.error);
		ws.on('message', (data) => {
			if (data.toString() === 'ping')
				ws.send(JSON.stringify({ type: 'pong', at: new Date().toISOString() }));
		});
	});
});
server.listen(Number(process.env.PORT || 3000), '0.0.0.0');
for (const signal of ['SIGINT', 'SIGTERM'])
	process.on(signal, () => {
		for (const ws of sockets.clients) ws.close();
		server.close(() => process.exit(0));
	});
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `node:http`에서 필요한 함수·컴포넌트를 가져온다. |
| 2 | `ws`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | `./build/handler.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 4 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 5 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 6 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 7 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 8 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 9 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 10 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 11 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 12 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 13 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 14 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 15 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 16 | 자료를 JSON 문자열로 직렬화해 저장·전송 경계에 맞춘다. |
| 17 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 18 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 19 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 20 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 21 | 모음 또는 스트림의 항목을 순서대로 처리한다. |
| 22 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 23 | 모음 또는 스트림의 항목을 순서대로 처리한다. |
| 24 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 25 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

## ④ 🔗 연동 포인트

study0~10의 상태·라우트·폼·DB·인증·테스트를 studyMidpoint에서 하나의 작은 서비스로 묶는다. 배포 자동화·백업은 study16에서 확장한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| 운영 form이 403 | ORIGIN이 프록시 외부 주소와 불일치 | HTTPS 도메인과 ORIGIN을 일치 |
| 재배포 후 파일 사라짐 | 컨테이너 임시 디스크 사용 | 영속 volume과 복구 절차 구성 |

## ⑥ 직접 해보기

1. 빌드 산출물에서만 서버를 실행하자.
2. DB를 잠시 끄고 /health 503을 확인하자.
3. HTTP와 HTTPS에서 쿠키 Secure 차이를 설명하자.

## ⑦ ☐ 체크리스트

- [ ] 빌드·adapter-node 실행
- [ ] 운영 env·DB·영속 저장소
- [ ] 도메인·HTTPS·배포 후 CRUD 확인

**📌 노션 원문 추가 항목** — 문구·괄호·원문 링크를 그대로 보존했다. 원래 다른 저장소 경로를 가리키는 항목도 바꾸지 않았다. 이 문서에서는 학습 확인용 빈 체크로 옮긴다. 현재 검증 여부는 README와 검증 기록을 따른다.

- [ ] adapter를 골라 배포 (→ study10, study17) — adapter-node 선택·Docker 이미지·로컬 컨테이너 확인까지 완료, <b>외부 배포는 아직</b>

## ⑧ 다음 단계 연결 문장

이 단계의 결과를 [studyMidpoint](studyMidpoint.md)에 연결한다. 배포 자동화·백업은 study16에서 확장한다.

공식 자료: [SvelteKit 문서](https://svelte.dev/docs/kit). 상세 출처는 [README](README.md)의 공식 자료와 노션 원문 링크를 따른다.
