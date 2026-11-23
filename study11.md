# study11 — DB 확장

## ① 목표 한 줄

같은 API 계약을 유지하며 PostgreSQL·MariaDB·MongoDB 연결을 교체한다.

이 문서는 SvelteKit 하나만 다룬다. 실행 코드: `ts_version/project`·`js_version/project`, 기초 SSR 기존 예제는 `*/demo`다. TypeScript 전체 코드를 싣고 JavaScript는 같은 상대 위치의 `.js`·타입 없는 script로 제공한다. 프로젝트의 심화 기능은 뒤 단계를 위해 미리 존재하지만 해당 단계의 원리와 파일부터 순서대로 학습한다.

## ② 📖 이론

DB 변경은 접속 문자열만 바꾸는 작업이 아니다. 숫자 id 생성·컬럼 대소문자·JSON 표현·외래키·트랜잭션·인덱스가 달라진다. Storage는 여러 창고가 같은 대출 창구를 제공하도록 하는 계약이다.

PostgreSQL은 pg Pool·$1 바인딩·IDENTITY·RETURNING, MariaDB는 mysql2 pool·? 바인딩·AUTO_INCREMENT·insertId, SQLite는 node:sqlite·?·RETURNING을 사용한다. MongoDB는 collection·문서·unique index와 counters collection의 원자적 증가로 숫자 id를 만든다. relational schema의 외래키와 Mongo의 참조 검증은 같은 기능이 아니므로 service가 댓글 대상과 작성자를 검사한다.

현재 실행 코드는 얇은 repository이며 ORM을 강제하지 않는다. ORM을 추가한다면 Prisma의 datasource provider는 postgresql/mysql/mongodb로 분리하고 DB별 schema·migration을 따로 둔다. Mongo의 native ObjectId를 쓰면 API 숫자 id와 별도 매핑이 필요하다. SQL migration을 Mongo에 그대로 적용하지 않는다. 구체적인 선택 설정은 아래 표를 따른다.

## ③ 🛠️ 실기 — 전체 코드와 줄별 설명

1. compose의 db 또는 database-lab 프로필을 켠다.
2. 환경변수 DB_KIND·DATABASE_URL을 바꾸고 **서버를 다시 시작**한다. 연결 Promise는 프로세스 수명 동안 재사용된다.
3. 새 DB에서 API 테스트를 실행한다. 자동 schema 생성은 초기 학습용이며 운영에서는 명시적 migration을 배포 전에 실행한다.
4. 기존 SQLite 파일은 그대로 남는다. 연결 전환만으로 기존 데이터를 이관했다고 주장하지 않는다.
5. 실제 데이터 이관은 읽기 전용 백업 → 회원 → 글 → 댓글 순으로 삽입 → id·관계·시각·총개수 대조 → 원복 계획으로 수행한다. 기존 세션은 이관하지 않고 재로그인시킨다.

실행: 앱 루트에서 `npm ci` 후 `npm run dev`, 배포 산출물은 `npm run build` 후 `npm start`다. 환경 설정은 [study0](study0.md), 실행 결과와 범위는 [검증 기록](docs/verification.md)을 참고한다. 코드 블록은 실제 파일 원문이며 import된 의존 파일은 저장소에 함께 있다.

### DB 연결과 ORM 선택 설정

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

## ④ 🔗 연동 포인트

UI·API·service는 그대로 두고 storage만 바뀐다. 실제 이관은 DB 교체와 별도 작업이다. study12는 동일한 계약 위에서 입력 UI를 확장한다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| PostgreSQL에서 컬럼을 못 찾음 | camelCase를 따옴표 없이 SQL에 사용 | 식별자 quoting 유지 |
| MariaDB INSERT 결과가 비어 있음 | RETURNING 가정 | insertId 사용 |
| Mongo id가 ObjectId가 됨 | API 숫자 id 계약과 저장 id 혼동 | counters의 id 필드 유지 |

## ⑥ 직접 해보기

1. 네 DB에서 동일한 API 테스트를 실행하자.
2. unique 이메일이 동시에 두 번 삽입될 때 409로 정리되는지 확인하자.
3. 테스트 데이터 개수와 관계를 DB에서 직접 조회하자.

## ⑦ ☐ 체크리스트

- [ ] PostgreSQL·MariaDB·MongoDB 연결
- [ ] id·바인딩·인덱스·ORM 설정 차이
- [ ] 전환·이관·원복 구분

**📌 노션 원문 추가 항목** — 문구·괄호·원문 링크를 그대로 보존했다. 원래 다른 저장소 경로를 가리키는 항목도 바꾸지 않았다. 이 문서에서는 학습 확인용 빈 체크로 옮긴다. 현재 검증 여부는 README와 검증 기록을 따른다.

- [ ] SQLite를 [PostgreSQL](https://app.notion.com/p/3d6d7dec5e2e81d0b8e4ed4c09533df6)로 교체

## ⑧ 다음 단계 연결 문장

이 단계의 결과를 [study12](study12.md)에 연결한다. study12는 동일한 계약 위에서 입력 UI를 확장한다.

공식 자료: [SvelteKit 문서](https://svelte.dev/docs/kit). 상세 출처는 [README](README.md)의 공식 자료와 노션 원문 링크를 따른다.
