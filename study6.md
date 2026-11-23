# study6 — DB·API 연동

## ① 목표 한 줄

SQLite 저장소로 게시글 CRUD를 만들고 공통 API v1 계약을 지킨다.

이 문서는 SvelteKit 하나만 다룬다. 실행 코드: `ts_version/project`·`js_version/project`, 기초 SSR 기존 예제는 `*/demo`다. TypeScript 전체 코드를 싣고 JavaScript는 같은 상대 위치의 `.js`·타입 없는 script로 제공한다. 프로젝트의 심화 기능은 뒤 단계를 위해 미리 존재하지만 해당 단계의 원리와 파일부터 순서대로 학습한다.

## ② 📖 이론

DB는 서버가 재시작해도 자료를 보존한다. Storage 인터페이스는 연결 방식을 숨기고 service는 회원·게시글·댓글 규칙을 담당한다. 도서관의 창고(DB)·사서(service)·대출 창구(API)를 나누면 창고를 바꿔도 대출 절차가 유지된다.

기초 실행은 `DB_KIND=sqlite`, `DATABASE_URL=file:data/board.sqlite`다. members(id,email,nickname,passwordHash,createdAt), posts(id,title,body,tags,authorId,createdAt,updatedAt), comments(id,postId,authorId,body,createdAt), sessions, receipts를 만든다. tags는 공통 저장 어댑터에서 JSON 문자열로 저장하고 API는 배열로 돌려준다. 생성·수정 시각은 ISO UTC다.

공통 v1은 `/health`에 접두어가 없고 `/api/posts`·`/api/auth/*`를 사용한다. 목록은 data+meta, 단건은 data, 오류는 error 객체다. 생성 201에는 Location, 삭제 204에는 본문이 없다. 비밀번호 해시와 세션 해시는 응답에 넣지 않는다. SQL 값은 바인딩하고 테이블·컬럼은 allowlist로 제한한다.

## ③ 🛠️ 실기 — 전체 코드와 줄별 설명

구현 순서: `.env` 연결 설정 → storage 스키마 생성 → service 목록·상세 → 등록 → PATCH 수정 → 댓글·삭제 → 공통 오류 처리.

1. `/board`에서 가입·로그인하고 글을 등록한다.
2. `/api/posts`와 `/api/posts/:id`를 열어 직렬화 결과를 확인한다.
3. 제목만 PATCH해 body와 tags가 유지되는지 확인한다. 생성 schema의 default를 부분 수정에 그대로 쓰면 생략한 태그가 지워질 수 있어 postPatchSchema를 별도로 둔다.
4. 삭제 후 404, 남의 글 수정 403, 빈 제목 400을 확인한다.
5. 서버를 다시 실행해 데이터가 남아 있는지 확인한다.

실행: 앱 루트에서 `npm ci` 후 `npm run dev`, 배포 산출물은 `npm run build` 후 `npm start`다. 환경 설정은 [study0](study0.md), 실행 결과와 범위는 [검증 기록](docs/verification.md)을 참고한다. 코드 블록은 실제 파일 원문이며 import된 의존 파일은 저장소에 함께 있다.



### `src/lib/server/course/storage.ts` 전체 코드

[실제 파일](ts_version/project/src/lib/server/course/storage.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { DATABASE_URL, DB_KIND } from '$app/env/private';

export type Row = {
	id: number;
	email: string;
	nickname: string;
	passwordHash: string;
	title: string;
	body: string;
	tags: string;
	authorId: number;
	postId: number;
	createdAt: string;
	updatedAt: string;
	tokenHash: string;
	userId: number;
	expiresAt: string;
	eventId: string;
	payload: string;
};
type RowInput = Record<string, string | number>;
export type Table = 'members' | 'posts' | 'comments' | 'sessions' | 'receipts';
const columns: Record<Table, string[]> = {
	members: ['email', 'nickname', 'passwordHash', 'createdAt'],
	posts: ['title', 'body', 'tags', 'authorId', 'createdAt', 'updatedAt'],
	comments: ['postId', 'authorId', 'body', 'createdAt'],
	sessions: ['tokenHash', 'userId', 'expiresAt'],
	receipts: ['eventId', 'payload', 'createdAt']
};
export interface Storage {
	all(table: Table): Promise<Row[]>;
	insert(table: Table, value: RowInput): Promise<Row>;
	patch(table: Table, id: number, value: RowInput): Promise<void>;
	remove(table: Table, id: number): Promise<void>;
}
export async function connect(kind: string, url: string): Promise<Storage> {
	if (kind === 'mongodb') {
		const client = new MongoClient(url);
		await client.connect();
		const db = client.db();
		await db.collection('members').createIndex({ email: 1 }, { unique: true });
		await db.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true });
		await db.collection('receipts').createIndex({ eventId: 1 }, { unique: true });
		return {
			async all(table) {
				return db
					.collection<Row>(table)
					.find({}, { projection: { _id: 0 } })
					.toArray();
			},
			async insert(table, value) {
				const counter = await db
					.collection<{ _id: string; value: number }>('counters')
					.findOneAndUpdate(
						{ _id: table },
						{ $inc: { value: 1 } },
						{ upsert: true, returnDocument: 'after' }
					);
				const row = { ...value, id: Number(counter!.value) };
				await db.collection(table).insertOne({ ...row });
				return row as Row;
			},
			async patch(table, id, value) {
				await db.collection(table).updateOne({ id }, { $set: value });
			},
			async remove(table, id) {
				await db.collection(table).deleteOne({ id });
			}
		};
	}
	let query: (sql: string, args?: (string | number)[]) => Promise<unknown>;
	if (kind === 'postgres') {
		const pool = new pg.Pool({ connectionString: url, max: 5 });
		query = async (sql, args = []) => {
			let index = 0;
			return (
				await pool.query(
					sql.replace(/\?/g, () => '$' + ++index),
					args
				)
			).rows;
		};
	} else if (kind === 'mariadb') {
		const pool = mysql.createPool(url);
		query = async (sql, args = []) => (await pool.execute(sql, args))[0];
	} else if (kind === 'sqlite') {
		const file = url.replace(/^file:/, '');
		mkdirSync(dirname(file), { recursive: true });
		const db = new DatabaseSync(file);
		db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
		query = async (sql, args = []) => {
			const statement = db.prepare(sql);
			return /^(SELECT|.*RETURNING)/is.test(sql) ? statement.all(...args) : statement.run(...args);
		};
	} else throw new Error('DB_KIND must be sqlite, postgres, mariadb, mongodb');
	const quote = (name: string) => (kind === 'mariadb' ? '`' + name + '`' : '"' + name + '"');
	const id =
		kind === 'postgres'
			? 'INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY'
			: kind === 'mariadb'
				? 'INTEGER PRIMARY KEY AUTO_INCREMENT'
				: 'INTEGER PRIMARY KEY AUTOINCREMENT';
	const defs: Record<Table, string> = {
		members: `email VARCHAR(254) NOT NULL UNIQUE, nickname VARCHAR(80) NOT NULL, ${quote('passwordHash')} TEXT NOT NULL, ${quote('createdAt')} TEXT NOT NULL`,
		posts: `title VARCHAR(200) NOT NULL, body TEXT NOT NULL, tags TEXT NOT NULL, ${quote('authorId')} INTEGER NOT NULL REFERENCES members(id), ${quote('createdAt')} TEXT NOT NULL, ${quote('updatedAt')} TEXT NOT NULL`,
		comments: `${quote('postId')} INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE, ${quote('authorId')} INTEGER NOT NULL REFERENCES members(id), body TEXT NOT NULL, ${quote('createdAt')} TEXT NOT NULL`,
		sessions: `${quote('tokenHash')} VARCHAR(64) NOT NULL UNIQUE, ${quote('userId')} INTEGER NOT NULL REFERENCES members(id), ${quote('expiresAt')} TEXT NOT NULL`,
		receipts: `${quote('eventId')} VARCHAR(255) NOT NULL UNIQUE, payload TEXT NOT NULL, ${quote('createdAt')} TEXT NOT NULL`
	};
	for (const table of Object.keys(defs) as Table[])
		await query(`CREATE TABLE IF NOT EXISTS ${table} (id ${id}, ${defs[table]})`);
	function checked(table: Table, value: RowInput) {
		if (
			!columns[table] ||
			!Object.keys(value).length ||
			Object.keys(value).some((k) => !columns[table].includes(k))
		)
			throw new Error('Unknown column');
		return Object.keys(value);
	}
	return {
		async all(table) {
			if (!columns[table]) throw new Error('Unknown table');
			return (await query(`SELECT * FROM ${table}`)) as Row[];
		},
		async insert(table, value) {
			const keys = checked(table, value);
			const sql = `INSERT INTO ${table} (${keys.map(quote).join(',')}) VALUES (${keys.map(() => '?').join(',')})`;
			const result = (await query(
				sql + (kind === 'mariadb' ? '' : ' RETURNING id'),
				Object.values(value)
			)) as Row[] & { insertId: number };
			return { ...value, id: Number(kind === 'mariadb' ? result.insertId : result[0].id) } as Row;
		},
		async patch(table, id, value) {
			const keys = checked(table, value);
			await query(`UPDATE ${table} SET ${keys.map((k) => quote(k) + '=?').join(',')} WHERE id=?`, [
				...Object.values(value),
				id
			]);
		},
		async remove(table, id) {
			if (!columns[table]) throw new Error('Unknown table');
			await query(`DELETE FROM ${table} WHERE id=?`, [id]);
		}
	};
}
let connection: Promise<Storage> | undefined;
export function storage() {
	return (connection ??= connect(DB_KIND, DATABASE_URL));
}
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `node:fs`에서 필요한 함수·컴포넌트를 가져온다. |
| 2 | `node:path`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | `node:sqlite`에서 필요한 함수·컴포넌트를 가져온다. |
| 4 | `pg`에서 필요한 함수·컴포넌트를 가져온다. |
| 5 | `mysql2/promise`에서 필요한 함수·컴포넌트를 가져온다. |
| 6 | `mongodb`에서 필요한 함수·컴포넌트를 가져온다. |
| 7 | `$app/env/private`에서 필요한 함수·컴포넌트를 가져온다. |
| 8 | 가독성을 위해 구간을 나누는 빈 줄이다. |
| 9 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 10 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 11 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 12 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 13 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 14 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 15 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 16 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 17 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 18 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 19 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 20 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 21 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 22 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 23 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 24 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 25 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 26 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 27 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 28 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 29 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 30 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 31 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 32 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 33 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 34 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 35 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 36 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 37 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 38 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 39 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 40 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 41 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 42 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 43 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 44 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 45 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 46 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 47 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 48 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 49 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 50 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 51 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 52 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 53 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 54 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 55 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 56 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 57 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 58 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 59 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 60 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 61 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 62 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 63 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 64 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 65 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 66 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 67 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 68 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 69 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 70 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 71 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 72 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 73 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 74 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 75 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 76 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 77 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 78 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 79 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 80 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 81 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 82 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 83 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 84 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 85 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 86 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 87 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 88 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 89 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 90 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 91 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 92 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 93 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 94 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 95 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 96 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 97 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 98 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 99 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 100 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 101 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 102 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 103 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 104 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 105 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 106 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 107 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 108 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 109 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 110 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 111 | 저장 모델의 컬럼·기본키·관계 제약을 선언한다. |
| 112 | 저장 모델의 컬럼·기본키·관계 제약을 선언한다. |
| 113 | 저장 모델의 컬럼·기본키·관계 제약을 선언한다. |
| 114 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 115 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 116 | 모음 또는 스트림의 항목을 순서대로 처리한다. |
| 117 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 118 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 119 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 120 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 121 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 122 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 123 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 124 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 125 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 126 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 127 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 128 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 129 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 130 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 131 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 132 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 133 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 134 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 135 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 136 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 137 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 138 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 139 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 140 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 141 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 142 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 143 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 144 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 145 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 146 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 147 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 148 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 149 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 150 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 151 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 152 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 153 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 154 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 155 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 156 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 157 | 앞에서 연 블록·함수·자료 선언을 닫는다. |

### `src/routes/api/[...path]/+server.ts` 전체 코드

[실제 파일](ts_version/project/src/routes/api/[...path]/+server.ts) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```ts
import type { RequestHandler } from '@sveltejs/kit';
import * as service from '#lib/server/course/service.js';
import { ApiError, positiveId } from '#lib/server/course/errors.js';
import { apiError, jsonBody } from '#lib/server/course/http.js';
const dispatch: RequestHandler = async (event) => {
	const { request, params, cookies, locals, url } = event;
	const path = (params.path ?? '').split('/'),
		method = request.method,
		user = locals.member;
	const ok = (data: unknown, status = 200, headers = {}) =>
		Response.json({ data }, { status, headers });
	try {
		if (path[0] === 'auth') {
			if (method === 'POST' && path[1] === 'signup')
				return ok(await service.signup(await jsonBody(request)), 201);
			if (method === 'POST' && path[1] === 'login') {
				const result = await service.login(await jsonBody(request));
				cookies.set('course_session', result.accessToken, {
					path: '/',
					httpOnly: true,
					sameSite: 'lax',
					secure: url.protocol === 'https:',
					maxAge: 3600
				});
				return ok(result);
			}
			if (method === 'GET' && path[1] === 'me') {
				service.authorized(user);
				return ok(user);
			}
			if (method === 'POST' && path[1] === 'logout') {
				service.authorized(user);
				await service.revoke(locals.courseToken);
				cookies.delete('course_session', { path: '/' });
				return new Response(null, { status: 204 });
			}
		}
		if (path[0] === 'posts') {
			if (path.length === 1) {
				if (method === 'GET') return Response.json(await service.list(url.searchParams, user));
				if (method === 'POST') {
					const data = await service.write(await jsonBody(request), user);
					return ok(data, 201, { Location: '/api/posts/' + data.id });
				}
			} else {
				const id = positiveId(path[1]);
				if (path.length === 2) {
					if (method === 'GET') return ok(await service.post(id));
					if (method === 'PATCH') return ok(await service.write(await jsonBody(request), user, id));
					if (method === 'DELETE') {
						await service.removePost(id, user);
						return new Response(null, { status: 204 });
					}
				}
				if (path.length === 3 && path[2] === 'comments') {
					if (method === 'GET') return ok(await service.comments(id));
					if (method === 'POST')
						return ok(await service.addComment(id, await jsonBody(request), user), 201);
				}
			}
		}
		if (path[0] === 'comments' && path.length === 2 && method === 'DELETE') {
			await service.removeComment(positiveId(path[1]), user);
			return new Response(null, { status: 204 });
		}
		throw new ApiError(404, 'NOT_FOUND', 'API 경로를 찾을 수 없습니다.');
	} catch (error) {
		return apiError(error, event);
	}
};
export const GET = dispatch,
	POST = dispatch,
	PATCH = dispatch,
	DELETE = dispatch,
	PUT = dispatch;
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | `@sveltejs/kit`에서 필요한 타입만 가져와 실행 번들에 넣지 않는다. |
| 2 | `#lib/server/course/service.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 3 | `#lib/server/course/errors.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 4 | `#lib/server/course/http.js`에서 필요한 함수·컴포넌트를 가져온다. |
| 5 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 6 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 7 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 8 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 9 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 10 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 11 | JSON HTTP 응답을 만든다. status·headers와 본문 계약을 함께 확인한다. |
| 12 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 13 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 14 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 15 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 16 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 17 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 18 | 브라우저 세션 쿠키를 설정한다. path·HttpOnly·SameSite·Secure 수명을 함께 관리한다. |
| 19 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 20 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 21 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 22 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 23 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 24 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 25 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 26 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 27 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 28 | 로그인한 사용자임을 서버에서 확인한 뒤 쓰기·개인 데이터 접근을 허용한다. |
| 29 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 30 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 31 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 32 | 로그인한 사용자임을 서버에서 확인한 뒤 쓰기·개인 데이터 접근을 허용한다. |
| 33 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 34 | 설정한 path와 같은 경로의 쿠키를 삭제한다. |
| 35 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 36 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 37 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 38 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 39 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 40 | JSON HTTP 응답을 만든다. status·headers와 본문 계약을 함께 확인한다. |
| 41 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 42 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 43 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 44 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 45 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 46 | 현재 구간에서 사용할 값을 선언한다. const는 재대입하지 않고 let은 재대입을 허용한다. |
| 47 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 48 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 49 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 50 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 51 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 52 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 53 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 54 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 55 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 56 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 57 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 58 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 59 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 60 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 61 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 62 | 입력·권한·성공 여부에 따라 실행 경로를 나눈다. |
| 63 | 비동기 작업이 끝날 때까지 기다린다. 다음 단계가 결과를 받기 전에 진행하지 않는다. |
| 64 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 65 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 66 | 잘못된 흐름을 예외로 중단한다. 가장 가까운 오류 처리 경계가 응답으로 바꾼다. |
| 67 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 68 | 계산 결과 또는 응답을 호출자에게 돌려주고 현재 함수를 마친다. |
| 69 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 70 | 앞에서 연 블록·함수·자료 선언을 닫는다. |
| 71 | 이 선언을 외부에 공개한다. 라우트 파일은 SvelteKit이 이름을 기준으로 호출한다. |
| 72 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 73 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 74 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 75 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |

## ④ 🔗 연동 포인트

UI와 API는 같은 service를 호출하므로 규칙이 일치한다. DB 접속 문자열은 환경변수에만 둔다. study7에서 회원·세션을 연결하고 study11에서 DB 어댑터를 바꾼다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| DB 파일이 다른 곳에 생김 | 서버를 앱 루트가 아닌 폴더에서 실행 | project 폴더에서 npm start 실행 |
| PATCH가 기존 태그를 지움 | 생성 스키마의 default([])를 재사용 | 별도 postPatchSchema로 생략을 보존 |

## ⑥ 직접 해보기

1. curl 또는 REST 클라이언트로 CRUD 한 바퀴를 실행하자.
2. Location과 삭제 본문 길이를 확인하자.
3. DB 연결 오류가 클라이언트에 비밀을 노출하지 않는지 확인하자.

## ⑦ ☐ 체크리스트

- [ ] 공통 v1 목록·상세·등록·수정·삭제
- [ ] 환경변수로 접속 분리
- [ ] SQL 바인딩·응답에서 비밀 제거

## ⑧ 다음 단계 연결 문장

이 단계의 결과를 [study7](study7.md)에 연결한다. study7에서 회원·세션을 연결하고 study11에서 DB 어댑터를 바꾼다.

공식 자료: [SvelteKit 문서](https://svelte.dev/docs/kit). 상세 출처는 [README](README.md)의 공식 자료와 노션 원문 링크를 따른다.
