import { deletePost, getPost, updatePost } from '#lib/server/posts.js';

export function GET({ params }) {
	const post = getPost(params.id);
	if (!post) return Response.json({ message: '글을 찾을 수 없습니다.' }, { status: 404 });
	return Response.json(post);
}

export async function PATCH({ params, request }) {
	const body = await request.json().catch(() => null);
	const title = String(body?.title ?? '').trim();
	const text = String(body?.body ?? '').trim();
	if (!title || !text) {
		return Response.json({ message: '제목과 본문이 필요합니다.' }, { status: 400 });
	}
	const post = updatePost(params.id, { title, body: text });
	if (!post) return Response.json({ message: '글을 찾을 수 없습니다.' }, { status: 404 });
	return Response.json(post);
}

export function DELETE({ params }) {
	if (!deletePost(params.id)) {
		return Response.json({ message: '글을 찾을 수 없습니다.' }, { status: 404 });
	}
	return new Response(null, { status: 204 });
}
