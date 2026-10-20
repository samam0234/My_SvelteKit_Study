import { error, fail, redirect } from '@sveltejs/kit';
import { canEdit, getPost, updatePost } from '#lib/server/posts.js';

export function load({ params, locals }) {
	if (!locals.user) redirect(303, `/login?next=/posts/${params.id}/edit`);
	const post = getPost(params.id);
	if (!post) error(404, '글을 찾을 수 없습니다');
	if (!canEdit(post, locals.user)) error(403, '이 글을 수정할 수 없습니다');
	return { post };
}

export const actions = {
	default: async ({ params, request, locals }) => {
		if (!locals.user) redirect(303, `/login?next=/posts/${params.id}/edit`);
		const current = getPost(params.id);
		if (!current) error(404, '글을 찾을 수 없습니다');
		if (!canEdit(current, locals.user)) error(403, '이 글을 수정할 수 없습니다');
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const body = String(form.get('body') ?? '').trim();
		if (!title || !body) return fail(400, { title, body, missing: true });
		const post = updatePost(params.id, { title, body });
		if (!post) error(404, '글을 찾을 수 없습니다');
		redirect(303, `/posts/${post.id}`);
	}
};
