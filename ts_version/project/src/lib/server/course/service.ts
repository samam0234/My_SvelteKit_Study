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
