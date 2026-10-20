import { createPost, listPosts } from '#lib/server/posts.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	return Response.json(listPosts());
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const title = String(body?.title ?? '').trim();
	const text = String(body?.body ?? '').trim();
	if (!title || !text) {
		return Response.json({ message: '제목과 본문이 필요합니다.' }, { status: 400 });
	}
	const post = createPost({ title, body: text, authorId: null, authorName: '손님' });
	return Response.json(post, { status: 201 });
};
