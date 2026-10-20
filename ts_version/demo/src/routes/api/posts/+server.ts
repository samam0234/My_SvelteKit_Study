import { readSession } from '#lib/server/auth.js';
import { createPost, listPosts } from '#lib/server/posts.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	return Response.json(listPosts());
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json().catch(() => null);
	const title = String(body?.title ?? '').trim();
	const text = String(body?.body ?? '').trim();
	if (!title || !text) {
		return Response.json({ message: '제목과 본문이 필요합니다.' }, { status: 400 });
	}
	const user = readSession(cookies);
	const post = createPost({
		title,
		body: text,
		authorId: user?.id ?? null,
		authorName: user?.name ?? '손님'
	});
	return Response.json(post, { status: 201 });
};
