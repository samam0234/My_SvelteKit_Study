# study17 — 실시간·확장

## ① 목표 한 줄

SSE·WebSocket·파일 처리를 연결하고 종료 시 자원을 해제한다.

이 문서는 SvelteKit 하나만 다룬다. 실행 코드: `ts_version/project`·`js_version/project`, 기초 SSR 기존 예제는 `*/demo`다. TypeScript 전체 코드를 싣고 JavaScript는 같은 상대 위치의 `.js`·타입 없는 script로 제공한다. 프로젝트의 심화 기능은 뒤 단계를 위해 미리 존재하지만 해당 단계의 원리와 파일부터 순서대로 학습한다.

## ② 📖 이론

일반 HTTP는 한 번 요청하고 한 번 응답한다. SSE는 서버→브라우저 알림을 유지하고 WebSocket은 양방향 메시지를 유지한다. 편지와 전화처럼 연결의 수명이 달라지므로 타임아웃·해제·재접속·인증을 따로 다뤄야 한다.

SSE endpoint는 text/event-stream과 빈 줄로 구분한 data 메시지를 보낸다. 브라우저는 EventSource로 읽고 컴포넌트 해제 때 close한다. 이 샘플은 시간 heartbeat 알림이며 실제 게시글 변경 이벤트라고 표시하지 않는다. WebSocket은 adapter-node에 기본 upgrade route가 없으므로 server.mjs에서 ws upgrade를 처리한다. Origin을 고정하고 최대 메시지 크기를 1KB로 제한한다.

WebSocket 예시는 공개 ping/pong만 제공한다. 개인 알림을 넣으려면 upgrade 단계에서 세션·권한·만료를 검증하고 다중 인스턴스는 공유 pub/sub를 사용한다. 업로드 파일은 static이 아닌 서버 전용 경로에 저장하고 다른 사용자에게 공개하지 않는다. 연결을 계속 열어 두는 기능은 무료 서버리스의 실행 제한과도 맞아야 한다.

## ③ 🛠️ 실기 — 전체 코드와 줄별 설명

1. build 후 `npm start`를 실행하고 `/realtime`을 연다. Vite dev만으로 custom WebSocket은 켜지지 않는다.
2. SSE 시간 알림과 WebSocket pong 응답을 확인한다.
3. 다른 페이지로 이동할 때 EventSource·WebSocket이 닫히는지 Network에서 확인한다.
4. 다른 Origin의 WebSocket upgrade가 거부되는지 검사한다.
5. 큰 파일·잘못된 인코딩·남의 파일 다운로드가 거부되는지 검사한다.

실행: 앱 루트에서 `npm ci` 후 `npm run dev`, 배포 산출물은 `npm run build` 후 `npm start`다. 환경 설정은 [study0](study0.md), 실행 결과와 범위는 [검증 기록](docs/verification.md)을 참고한다. 코드 블록은 실제 파일 원문이며 import된 의존 파일은 저장소에 함께 있다.



### `src/routes/api/events/+server.ts` 전체 코드

[실제 파일](ts_version/project/src/routes/api/events/+server.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
import type { RequestHandler } from '@sveltejs/kit';
export const GET: RequestHandler = ({ request }) => {
	let timer: ReturnType<typeof setInterval> | undefined;
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		start(controller) {
			const send = () =>
				controller.enqueue(
					encoder.encode('data: ' + JSON.stringify({ time: new Date().toISOString() }) + '\n\n')
				);
			send();
			timer = setInterval(send, 10000);
			request.signal.addEventListener(
				'abort',
				() => {
					clearInterval(timer);
					try {
						controller.close();
					} catch {
						/* The browser may have already cancelled the stream. */
					}
				},
				{ once: true }
			);
		},
		cancel() {
			clearInterval(timer);
		}
	});
	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'X-Accel-Buffering': 'no'
		}
	});
};
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `@sveltejs/kit`에서 필요한 타입만 가져와 실행 번들에 넣지 않는다. |
| 2 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 3 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 4 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 5 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 6 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 7 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 8 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 9 | 자료를 JSON 문자열로 직렬화해 저장·전송 경계에 맞춘다. |
| 10 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 11 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 12 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 13 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 14 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 15 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 16 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 17 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 18 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 19 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 20 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 21 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 22 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 23 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 24 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 25 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 26 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 27 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 28 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 29 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 30 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 31 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 32 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 33 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 34 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 35 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 36 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 37 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

### `src/routes/realtime/+page.svelte` 전체 코드

[실제 파일](ts_version/project/src/routes/realtime/+page.svelte) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```svelte
<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	let time = $state('연결 중'),
		socketStatus = $state('연결 중');
	onMount(() => {
		const events = new EventSource('/api/events');
		events.onmessage = (event) => (time = JSON.parse(event.data).time);
		const socket = new WebSocket(
			`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`
		);
		socket.onopen = () => {
			socketStatus = '연결됨';
			socket.send('ping');
		};
		socket.onmessage = (event) => (socketStatus = event.data);
		socket.onerror = () => (socketStatus = '운영 서버: npm start로 WebSocket을 실행하세요.');
		return () => {
			events.close();
			socket.close();
		};
	});
</script>

<h1>실시간 연결</h1>
<p>SSE 알림: {time}</p>
<p>WebSocket: {socketStatus}</p>
<a href={resolve('/board')}>게시판</a>
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | 컴포넌트 스크립트 구간의 경계를 정한다. |
| 2 | `$app/paths`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | `svelte`에서 필요한 함수·컴포넌트를 가져온다. |
| 4 | 사용자가 바꿀 원본을 반응형 상태로 선언한다. 값 변경이 연결된 화면을 갱신한다. |
| 5 | 사용자가 바꿀 원본을 반응형 상태로 선언한다. 값 변경이 연결된 화면을 갱신한다. |
| 6 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 7 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 8 | 문자열 JSON을 자료로 변환한다. 스트림에서는 완성된 줄인지 먼저 확인해야 한다. |
| 9 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 10 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 11 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 12 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 13 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 14 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 15 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 16 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 17 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 18 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 19 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 20 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 21 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 22 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 23 | 컴포넌트 스크립트 구간의 경계를 정한다. |
| 24 | 가독성을 위해 구간을 나누는 빈 줄이다. |
| 25 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 26 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 27 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |
| 28 | 화면의 의미 있는 HTML 요소·폼·안내 문구를 렌더한다. 값 보간은 기본 이스케이프된다. |

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

### `src/routes/api/files/[id]/+server.ts` 전체 코드

[실제 파일](ts_version/project/src/routes/api/files/[id]/+server.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
import type { RequestHandler } from '@sveltejs/kit';
import { authorized } from '#lib/server/course/service.js';
import { download } from '#lib/server/course/integrations.js';
import { apiError } from '#lib/server/course/http.js';
export const GET: RequestHandler = async (event) => {
	try {
		const user = event.locals.member;
		authorized(user);
		return new Response(await download(event.params.id!, user.id), {
			headers: {
				'content-type': 'text/plain; charset=utf-8',
				'Content-Disposition': 'attachment; filename="document.txt"'
			}
		});
	} catch (error) {
		return apiError(error, event);
	}
};
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `@sveltejs/kit`에서 필요한 타입만 가져와 실행 번들에 넣지 않는다. |
| 2 | `#lib/server/course/service.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | `#lib/server/course/integrations.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 4 | `#lib/server/course/http.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 5 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 6 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 7 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 8 | 로그인한 사용자임을 서버에서 확인한 뒤 쓰기·개인 데이터 접근을 허용한다. |
| 9 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 10 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 11 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 12 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 13 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 14 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 15 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 16 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 17 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 18 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

## ④ 🔗 연동 포인트

파일에서 읽은 텍스트를 다음 단계 AI 입력으로 연결할 수 있다. 개인 이벤트에는 현재 로그인 세션의 권한 검사가 추가되어야 한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| WebSocket 404 | Vite 또는 node build만 실행 | custom server를 실행하는 npm start 사용 |
| 프록시 뒤 SSE가 한꺼번에 도착 | 버퍼링 사용 | X-Accel-Buffering과 프록시 buffering 설정 확인 |

## ⑥ 직접 해보기

1. WebSocket ping을 세 번 보내고 응답을 세자.
2. 페이지를 이동하고 열린 연결이 남는지 확인하자.
3. 개인 알림을 위한 인증·재연결 설계를 작성하자.

## ⑦ ☐ 체크리스트

- [ ] SSE·WebSocket 실제 연결
- [ ] Origin·크기·종료 처리
- [ ] 파일 인코딩·크기·소유권

## ⑧ 다음 단계 연결 문장

이 단계의 결과를 [study18](study18.md)에 연결한다. 개인 이벤트에는 현재 로그인 세션의 권한 검사가 추가되어야 한다.

공식 자료: [SvelteKit 문서](https://svelte.dev/docs/kit). 상세 출처는 [README](README.md)의 공식 자료와 노션 원문 링크를 따른다.
