# study7 — 인증·보안 기초

## ① 목표 한 줄

가입·로그인·만료·로그아웃과 작성자 권한을 서버에서 검사한다.

이 문서는 SvelteKit 하나만 다룬다. 실행 코드: `ts_version/project`·`js_version/project`, 기초 SSR 기존 예제는 `*/demo`다. TypeScript 전체 코드를 싣고 JavaScript는 같은 상대 위치의 `.js`·타입 없는 script로 제공한다. 프로젝트의 심화 기능은 뒤 단계를 위해 미리 존재하지만 해당 단계의 원리와 파일부터 순서대로 학습한다.

## ② 📖 이론

인증은 누구인지, 인가는 그 사람이 무엇을 할 수 있는지의 검사다. 비밀번호는 salt를 더한 scrypt 해시로 보관한다. 로그인 시 일정 길이의 해시를 timingSafeEqual로 비교한다. 세션은 무작위 32바이트 토큰을 발급하며 서버 DB에는 SHA-256 해시만 저장한다. 만료는 한 시간이다.

브라우저는 HttpOnly·SameSite=Lax 쿠키를 쓰고 HTTPS에서는 Secure를 켠다. API 클라이언트는 같은 토큰을 Bearer로 보낼 수 있다. hooks가 세션을 확인해 `locals.member`에 넣고 board load가 안전한 사용자 정보만 화면에 전달한다. 로그아웃은 쿠키 삭제와 DB 세션 삭제를 함께 해야 이전 Bearer 토큰도 무효가 된다.

XSS는 출력 이스케이프·신뢰하지 않는 HTML 금지로 줄이고, CSRF는 SvelteKit form 보호·Origin 검사로 막는다. CORS는 출처별 응답 읽기 정책이며 인증을 대신하지 않는다. 쿠키를 사용하는 쓰기 API는 Origin을 확인한다. 운영 프록시에서는 신뢰한 프록시 헤더만 사용하고 요청 제한을 중앙 저장소로 확장한다. 화면에서 버튼을 숨겨도 service가 소유자를 다시 검사해야 한다.

## ③ 🛠️ 실기 — 전체 코드와 줄별 설명

1. 계정 두 개를 만들고 각자 로그인한다.
2. 첫 계정의 글을 둘째 계정의 토큰으로 수정·삭제하면 403이어야 한다.
3. token을 변조하면 401, 이미 로그아웃한 token도 401이어야 한다.
4. Network의 Set-Cookie에서 HttpOnly·SameSite와 HTTPS Secure를 확인한다.
5. 기존 `/notes`는 이전 JWT 학습 예시로 계정·쿠키가 분리돼 있다. 현재 과정은 `/board`와 `course_session`을 사용한다.

실행: 앱 루트에서 `npm ci` 후 `npm run dev`, 배포 산출물은 `npm run build` 후 `npm start`다. 환경 설정은 [study0](study0.md), 실행 결과와 범위는 [검증 기록](docs/verification.md)을 참고한다. 코드 블록은 실제 파일 원문이며 import된 의존 파일은 저장소에 함께 있다.



### `src/lib/server/course/service.ts` 전체 코드

[실제 파일](ts_version/project/src/lib/server/course/service.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { storage, type Row, type Storage } from './storage.js';
import { ApiError, requireValue } from './errors.js';
import {
	postSchema,
	postPatchSchema,
	signupSchema,
	loginSchema,
	commentSchema
} from '#lib/course/schema.js';
import type { z } from 'zod';
const scrypt = promisify(scryptCallback);
const now = () => new Date().toISOString();
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
	const result = schema.safeParse(data);
	if (!result.success) {
		const fields: Record<string, string[]> = {};
		for (const issue of result.error.issues)
			(fields[String(issue.path[0] ?? 'body')] ??= []).push(issue.message);
		throw new ApiError(400, 'VALIDATION_ERROR', '입력값을 확인하세요.', fields);
	}
	return result.data;
}
export function publicUser(row: Row) {
	return { id: Number(row.id), email: row.email, nickname: row.nickname };
}
export async function signup(data: unknown) {
	const input = parse(signupSchema, data);
	const db = await storage();
	if ((await db.all('members')).some((u) => u.email === input.email))
		throw new ApiError(409, 'EMAIL_TAKEN', '이미 사용 중인 이메일입니다.');
	const salt = randomBytes(16).toString('hex');
	const hash = (await scrypt(input.password, salt, 64)) as Buffer;
	try {
		return publicUser(
			await db.insert('members', {
				email: input.email,
				nickname: input.nickname,
				passwordHash: salt + ':' + hash.toString('hex'),
				createdAt: now()
			})
		);
	} catch (error) {
		const dbError = error as { code?: string | number; message?: string };
		if (
			['23505', 'ER_DUP_ENTRY'].includes(String(dbError.code)) ||
			dbError.code === 11000 ||
			String(dbError.message).includes('UNIQUE')
		)
			throw new ApiError(409, 'EMAIL_TAKEN', '이미 사용 중인 이메일입니다.');
		throw error;
	}
}
export async function createSession(user: ReturnType<typeof publicUser>) {
	const token = randomBytes(32).toString('base64url');
	await (
		await storage()
	).insert('sessions', {
		userId: user.id,
		tokenHash: digest(token),
		expiresAt: new Date(Date.now() + 3600000).toISOString()
	});
	return { user, accessToken: token };
}
export async function login(data: unknown) {
	const input = parse(loginSchema, data);
	const row = (await (await storage()).all('members')).find((u) => u.email === input.email);
	const [salt, expected] = String(row?.passwordHash ?? 'dummy:').split(':');
	const actual = (await scrypt(input.password, salt, 64)) as Buffer;
	const wanted = expected ? Buffer.from(expected, 'hex') : Buffer.alloc(64);
	requireValue(
		row && actual.length === wanted.length && timingSafeEqual(actual, wanted),
		401,
		'INVALID_CREDENTIALS',
		'이메일 또는 비밀번호를 확인하세요.'
	);
	return createSession(publicUser(row));
}
export async function sessionUser(token: string | undefined) {
	if (!token) return null;
	const db = await storage();
	const session = (await db.all('sessions')).find((s) => s.tokenHash === digest(token));
	if (!session || session.expiresAt <= now()) return null;
	const row = (await db.all('members')).find((u) => Number(u.id) === Number(session.userId));
	return row ? publicUser(row) : null;
}
export async function revoke(token: string | undefined) {
	if (!token) return;
	const db = await storage();
	const session = (await db.all('sessions')).find((s) => s.tokenHash === digest(token));
	if (session) await db.remove('sessions', session.id);
}
export type User = Awaited<ReturnType<typeof sessionUser>>;
export function authorized(user: User): asserts user is NonNullable<User> {
	requireValue(user, 401, 'UNAUTHORIZED', '로그인이 필요합니다.');
}
async function decorate(post: Row, members?: Row[], replies?: Row[]) {
	const author = (members ?? (await (await storage()).all('members'))).find(
		(u) => Number(u.id) === Number(post.authorId)
	);
	return {
		id: Number(post.id),
		title: post.title,
		body: post.body,
		tags: JSON.parse(post.tags),
		author: { id: Number(author?.id), nickname: author?.nickname ?? '알 수 없음' },
		commentCount: (replies ?? (await (await storage()).all('comments'))).filter(
			(c) => Number(c.postId) === Number(post.id)
		).length,
		createdAt: post.createdAt,
		updatedAt: post.updatedAt
	};
}
export async function post(id: number) {
	const row = (await (await storage()).all('posts')).find((p) => Number(p.id) === id);
	requireValue(row, 404, 'NOT_FOUND', '게시글을 찾을 수 없습니다.');
	return decorate(row);
}
export async function list(params: URLSearchParams, user: User = null, repository?: Storage) {
	const integer = (key: string, fallback: number) => {
		const raw = params.get(key);
		if (raw === null) return fallback;
		requireValue(
			/^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw)),
			400,
			'BAD_REQUEST',
			key + '는 양의 정수입니다.'
		);
		return Number(raw);
	};
	const page = integer('page', 1),
		limit = Math.min(integer('limit', 10), 50),
		q = params.get('q') ?? '';
	const sort = params.get('sort') ?? '-createdAt';
	requireValue(
		['createdAt', '-createdAt', '-commentCount'].includes(sort),
		400,
		'BAD_REQUEST',
		'지원하지 않는 정렬입니다.'
	);
	if (params.get('mine') === 'true') authorized(user);
	const db = repository ?? (await storage());
	const rows = (await db.all('posts')).filter(
		(p) =>
			(p.title + ' ' + p.body).toLowerCase().includes(q.toLowerCase()) &&
			(params.get('mine') !== 'true' || Number(p.authorId) === user!.id)
	);
	const members = await db.all('members'),
		replies = await db.all('comments');
	const data = await Promise.all(rows.map((row) => decorate(row, members, replies)));
	data.sort((a, b) =>
		sort === '-commentCount'
			? b.commentCount - a.commentCount || b.id - a.id
			: (a.createdAt.localeCompare(b.createdAt) || a.id - b.id) * (sort.startsWith('-') ? -1 : 1)
	);
	return {
		data: data.slice((page - 1) * limit, page * limit),
		meta: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit), q }
	};
}
export async function write(data: unknown, user: User, id?: number) {
	authorized(user);
	if (id !== undefined) {
		const current = await post(id);
		requireValue(current.author.id === user.id, 403, 'FORBIDDEN', '작성자만 수정할 수 있습니다.');
		const input = parse(postPatchSchema, data);
		const changes: Record<string, string> = { updatedAt: now() };
		if (input.title !== undefined) changes.title = input.title;
		if (input.body !== undefined) changes.body = input.body;
		if (input.tags !== undefined) changes.tags = JSON.stringify(input.tags);
		await (await storage()).patch('posts', id, changes);
	} else {
		const input = parse(postSchema, data);
		id = (
			await (
				await storage()
			).insert('posts', {
				...input,
				tags: JSON.stringify(input.tags),
				authorId: user.id,
				createdAt: now(),
				updatedAt: now()
			})
		).id;
	}
	return post(id!);
}
export async function removePost(id: number, user: User) {
	authorized(user);
	requireValue(
		(await post(id)).author.id === user.id,
		403,
		'FORBIDDEN',
		'작성자만 삭제할 수 있습니다.'
	);
	const db = await storage();
	for (const c of (await db.all('comments')).filter((c) => Number(c.postId) === id))
		await db.remove('comments', c.id);
	await db.remove('posts', id);
}
export async function comments(postId: number) {
	await post(postId);
	const db = await storage(),
		members = await db.all('members');
	return (await db.all('comments'))
		.filter((c) => Number(c.postId) === postId)
		.map((c) => ({
			id: Number(c.id),
			body: c.body,
			createdAt: c.createdAt,
			author: {
				id: Number(c.authorId),
				nickname: members.find((u) => Number(u.id) === Number(c.authorId))?.nickname ?? ''
			}
		}));
}
export async function addComment(postId: number, data: unknown, user: User) {
	authorized(user);
	await post(postId);
	const input = parse(commentSchema, data);
	const row = await (
		await storage()
	).insert('comments', { postId, authorId: user.id, body: input.body, createdAt: now() });
	return (await comments(postId)).find((c) => c.id === row.id);
}
export async function removeComment(id: number, user: User) {
	authorized(user);
	const db = await storage(),
		row = (await db.all('comments')).find((c) => Number(c.id) === id);
	requireValue(row, 404, 'NOT_FOUND', '댓글을 찾을 수 없습니다.');
	requireValue(Number(row.authorId) === user.id, 403, 'FORBIDDEN', '작성자만 삭제할 수 있습니다.');
	await db.remove('comments', id);
}
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `node:crypto`에서 필요한 함수·컴포넌트를 가져온다. |
| 2 | `node:util`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | `./storage.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 4 | `./errors.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 5 | 부작용 import로 스타일 또는 초기화를 적용한다. |
| 6 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 7 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 8 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 9 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 10 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 11 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 12 | `zod`에서 필요한 타입만 가져와 실행 번들에 넣지 않는다. |
| 13 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 14 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 15 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 16 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 17 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 18 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 19 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 20 | 모음 또는 스트림의 항목을 순서대로 처리한다. |
| 21 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 22 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 23 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 24 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 25 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 26 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 27 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 28 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 29 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 30 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 31 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 32 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 33 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 34 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 35 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 36 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 37 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 38 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 39 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 40 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 41 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 42 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 43 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 44 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 45 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 46 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 47 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 48 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 49 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 50 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 51 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 52 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 53 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 54 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 55 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 56 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 57 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 58 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 59 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 60 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 61 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 62 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 63 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 64 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 65 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 66 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 67 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 68 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 69 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 70 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 71 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 72 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 73 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 74 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 75 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 76 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 77 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 78 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 79 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 80 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 81 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 82 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 83 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 84 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 85 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 86 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 87 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 88 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 89 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 90 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 91 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 92 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 93 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 94 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 95 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 96 | 로그인한 사용자임을 서버에서 확인한 뒤 쓰기·개인 데이터 접근을 허용한다. |
| 97 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 98 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 99 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 100 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 101 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 102 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 103 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 104 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 105 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 106 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 107 | 문자열 JSON을 자료로 변환한다. 스트림에서는 완성된 줄인지 먼저 확인해야 한다. |
| 108 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 109 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 110 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 111 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 112 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 113 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 114 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 115 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 116 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 117 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 118 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 119 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 120 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 121 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 122 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 123 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 124 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 125 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 126 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 127 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 128 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 129 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 130 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 131 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 132 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 133 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 134 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 135 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 136 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 137 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 138 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 139 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 140 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 141 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 142 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 143 | 로그인한 사용자임을 서버에서 확인한 뒤 쓰기·개인 데이터 접근을 허용한다. |
| 144 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 145 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 146 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 147 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 148 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 149 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 150 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 151 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 152 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 153 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 154 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 155 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 156 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 157 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 158 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 159 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 160 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 161 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 162 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 163 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 164 | 로그인한 사용자임을 서버에서 확인한 뒤 쓰기·개인 데이터 접근을 허용한다. |
| 165 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 166 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 167 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 168 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 169 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 170 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 171 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 172 | 자료를 JSON 문자열로 직렬화해 저장·전송 경계에 맞춘다. |
| 173 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 174 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 175 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 176 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 177 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 178 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 179 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 180 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 181 | 자료를 JSON 문자열로 직렬화해 저장·전송 경계에 맞춘다. |
| 182 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 183 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 184 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 185 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 186 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 187 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 188 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 189 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 190 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 191 | 로그인한 사용자임을 서버에서 확인한 뒤 쓰기·개인 데이터 접근을 허용한다. |
| 192 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 193 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 194 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 195 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 196 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 197 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 198 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 199 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 200 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 201 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 202 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 203 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 204 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 205 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 206 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 207 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 208 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 209 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 210 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 211 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 212 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 213 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 214 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 215 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 216 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 217 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 218 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 219 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 220 | 로그인한 사용자임을 서버에서 확인한 뒤 쓰기·개인 데이터 접근을 허용한다. |
| 221 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 222 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 223 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 224 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 225 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 226 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 227 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 228 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 229 | 로그인한 사용자임을 서버에서 확인한 뒤 쓰기·개인 데이터 접근을 허용한다. |
| 230 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 231 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 232 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 233 | 조건을 서버에서 검사하고 실패하면 지정한 HTTP 상태·오류 코드로 중단한다. |
| 234 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 235 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

### `src/hooks.server.ts` 전체 코드

[실제 파일](ts_version/project/src/hooks.server.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
import { sessionUser } from '#lib/server/course/service.js';
import { CORS_ORIGIN } from '$app/env/private';
import { rateLimit } from '#lib/server/course/rate.js';
import { apiError } from '#lib/server/course/http.js';
import { redirect } from '@sveltejs/kit';
import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { readSession } from '#lib/features/auth/server/session.js';

function needsLogin(pathname: string) {
	if (pathname === '/notes/new') return true;
	return /^\/notes\/[^/]+\/edit\/?$/.test(pathname);
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.requestId = /^[a-zA-Z0-9-]{1,80}$/.test(
		event.request.headers.get('x-request-id') ?? ''
	)
		? event.request.headers.get('x-request-id')!
		: crypto.randomUUID();
	event.locals.courseToken =
		event.request.headers.get('authorization')?.replace(/^Bearer /, '') ||
		event.cookies.get('course_session');
	event.locals.member = null;
	try {
		if (
			event.url.pathname.startsWith('/api/') &&
			!['GET', 'HEAD', 'OPTIONS'].includes(event.request.method)
		) {
			rateLimit(
				event.getClientAddress() + ':' + event.url.pathname.split('/').slice(0, 3).join('/'),
				60
			);
		}
		event.locals.member = await sessionUser(event.locals.courseToken);
	} catch (error) {
		const response = apiError(error, event);
		response.headers.set('X-Request-Id', event.locals.requestId);
		return response;
	}
	const origin = event.request.headers.get('origin');
	const api = event.url.pathname.startsWith('/api/');
	if (api && origin && ![event.url.origin, CORS_ORIGIN].includes(origin))
		return Response.json(
			{
				error: {
					code: 'FORBIDDEN',
					message: '허용되지 않은 출처입니다.',
					fields: {},
					requestId: event.locals.requestId
				}
			},
			{ status: 403, headers: { 'X-Request-Id': event.locals.requestId } }
		);
	if (api && event.request.method === 'OPTIONS')
		return new Response(null, {
			status: 204,
			headers: {
				'Access-Control-Allow-Origin': origin ?? event.url.origin,
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id',
				'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
				Vary: 'Origin',
				'X-Request-Id': event.locals.requestId
			}
		});
	if (
		api &&
		!['GET', 'HEAD', 'OPTIONS'].includes(event.request.method) &&
		event.cookies.get('course_session') &&
		!event.request.headers.get('authorization') &&
		!origin &&
		event.url.pathname !== '/api/integrations/webhook'
	)
		return Response.json(
			{
				error: {
					code: 'FORBIDDEN',
					message: '쿠키 쓰기 요청에는 Origin이 필요합니다.',
					fields: {},
					requestId: event.locals.requestId
				}
			},
			{ status: 403, headers: { 'X-Request-Id': event.locals.requestId } }
		);
	event.locals.user = readSession(event.cookies);
	if (!event.locals.user && needsLogin(event.url.pathname)) {
		redirect(303, `/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}
	const start = performance.now();
	const response = await resolve(event);
	response.headers.set('X-Request-Id', event.locals.requestId);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	if (api) {
		response.headers.set('Cache-Control', 'no-store');
		if (origin && [event.url.origin, CORS_ORIGIN].includes(origin)) {
			response.headers.set('Access-Control-Allow-Origin', origin);
			response.headers.set('Access-Control-Allow-Credentials', 'true');
			response.headers.append('Vary', 'Origin');
		}
	}
	console.info(
		JSON.stringify({
			requestId: event.locals.requestId,
			method: event.request.method,
			path: event.url.pathname,
			status: response.status,
			ms: Math.round(performance.now() - start)
		})
	);
	return response;
};

export const handleError: HandleServerError = ({ event, kind }) => {
	console.error('[handleError]', kind, event.url.pathname);
};
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `#lib/server/course/service.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 2 | `$app/env/private`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | `#lib/server/course/rate.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 4 | `#lib/server/course/http.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 5 | `@sveltejs/kit`에서 필요한 함수·컴포넌트를 가져온다. |
| 6 | `@sveltejs/kit/hooks`에서 필요한 타입만 가져와 실행 번들에 넣지 않는다. |
| 7 | `#lib/features/auth/server/session.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 8 | 가독성을 위해 구간을 나누는 빈 줄이다. |
| 9 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 10 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 11 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 12 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 13 | 가독성을 위해 구간을 나누는 빈 줄이다. |
| 14 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 15 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 16 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 17 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 18 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 19 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 20 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 21 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 22 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 23 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 24 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 25 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 26 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 27 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 28 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 29 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 30 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 31 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 32 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 33 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 34 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 35 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 36 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 37 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 38 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 39 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 40 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 41 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 42 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 43 | JSON HTTP 응답을 만든다. status·headers와 본문 계약을 함께 확인한다. |
| 44 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 45 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 46 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 47 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 48 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 49 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 50 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 51 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 52 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 53 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 54 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 55 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 56 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 57 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 58 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 59 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 60 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 61 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 62 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 63 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 64 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 65 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 66 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 67 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 68 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 69 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 70 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 71 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 72 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 73 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 74 | JSON HTTP 응답을 만든다. status·headers와 본문 계약을 함께 확인한다. |
| 75 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 76 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 77 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 78 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 79 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 80 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 81 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 82 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 83 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 84 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 85 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 86 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 87 | HTTP 리다이렉트로 다음 URL을 열고 현재 요청 처리를 끝낸다. |
| 88 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 89 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 90 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 91 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 92 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 93 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 94 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 95 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 96 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 97 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 98 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 99 | 요청·응답 헤더를 읽거나 설정해 인증·캐시·요청 추적 계약을 전달한다. |
| 100 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 101 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 102 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 103 | 자료를 JSON 문자열로 직렬화해 저장·전송 경계에 맞춘다. |
| 104 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 105 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 106 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 107 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 108 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 109 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 110 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 111 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 112 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 113 | 가독성을 위해 구간을 나누는 빈 줄이다. |
| 114 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 115 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 116 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

## ④ 🔗 연동 포인트

세션 확인 결과는 요청 locals에만 저장하고 공개 캐시로 공유하지 않는다. 같은 출처의 form·API가 쿠키를 공유한다. study8은 이 경계를 폴더와 모듈로 고정한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| 로그인했는데 401 | Secure 쿠키를 HTTP에서 사용하거나 만료됨 | 개발 HTTP와 운영 HTTPS를 구분하고 재로그인 |
| 남의 글 수정 가능 | UI만 검사하고 API 검사를 생략 | 서버에서 author.id와 user.id 비교 |

## ⑥ 직접 해보기

1. 로그아웃 후 기존 Bearer 토큰을 재사용해 보자.
2. evil.invalid Origin으로 쓰기 요청을 보내자.
3. 본문에 script 태그를 저장하고 텍스트로 보이는지 확인하자.

## ⑦ ☐ 체크리스트

- [ ] 회원가입·로그인·해시·세션 만료
- [ ] HttpOnly·SameSite·Secure
- [ ] 401·403·CSRF·CORS·XSS 점검

**📌 노션 원문 추가 항목** — 문구·괄호·원문 링크를 그대로 보존했다. 원래 다른 저장소 경로를 가리키는 항목도 바꾸지 않았다. 이 문서에서는 학습 확인용 빈 체크로 옮긴다. 현재 검증 여부는 README와 검증 기록을 따른다.

- [ ] 인증 쿠키 / hooks
- [ ] hooks / <code>+layout.server.js</code>로 로그인 세션 검사 (→ study7, httpOnly 쿠키 세션)

## ⑧ 다음 단계 연결 문장

이 단계의 결과를 [study8](study8.md)에 연결한다. study8은 이 경계를 폴더와 모듈로 고정한다.

공식 자료: [SvelteKit 문서](https://svelte.dev/docs/kit). 상세 출처는 [README](README.md)의 공식 자료와 노션 원문 링크를 따른다.
