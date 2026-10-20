import { createPost, listPosts } from '#lib/server/posts.js';

export function GET() {
	return Response.json(listPosts());
}

export async function POST({ request, locals }) {
	if (!locals.user) return Response.json({ message: '로그인이 필요합니다.' }, { status: 401 });
	const body = await request.json().catch(() => null);
	const title = String(body?.title ?? '').trim();
	const text = String(body?.body ?? '').trim();
	if (!title || !text) {
		return Response.json({ message: '제목과 본문이 필요합니다.' }, { status: 400 });
	}
	const post = createPost({
		title,
		body: text,
		authorId: locals.user.id,
		authorName: locals.user.name
	});
	return Response.json(post, { status: 201 });
}
