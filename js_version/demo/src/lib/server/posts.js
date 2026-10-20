import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const file = join(process.cwd(), 'data', 'posts.json');

function seed() {
	const now = new Date().toISOString();
	return [
		{
			id: 'welcome',
			title: 'SvelteKit 게시판에 온 것을 환영합니다',
			body: '이 글은 서버의 JSON 파일에서 읽습니다. 새로고침해도 남습니다.',
			authorId: null,
			authorName: '안내',
			createdAt: now,
			updatedAt: now
		}
	];
}

function read() {
	try {
		return JSON.parse(readFileSync(file, 'utf8'));
	} catch {
		const posts = seed();
		write(posts);
		return posts;
	}
}

function write(posts) {
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, JSON.stringify(posts, null, 2));
}

export function listPosts() {
	return read().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getPost(id) {
	return read().find((post) => post.id === id) ?? null;
}

export function createPost(input) {
	const now = new Date().toISOString();
	const post = { id: randomUUID(), ...input, createdAt: now, updatedAt: now };
	const posts = read();
	posts.push(post);
	write(posts);
	return post;
}

export function updatePost(id, input) {
	const posts = read();
	const post = posts.find((item) => item.id === id);
	if (!post) return null;
	post.title = input.title;
	post.body = input.body;
	post.updatedAt = new Date().toISOString();
	write(posts);
	return post;
}

export function deletePost(id) {
	const posts = read();
	const next = posts.filter((post) => post.id !== id);
	if (next.length === posts.length) return false;
	write(next);
	return true;
}
