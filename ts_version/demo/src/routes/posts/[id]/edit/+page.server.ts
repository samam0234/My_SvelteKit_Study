import { error, fail, redirect } from '@sveltejs/kit';
import { getPost, updatePost } from '#lib/server/posts.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const post = getPost(params.id);
	if (!post) error(404, '글을 찾을 수 없습니다');
	return { post };
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const body = String(form.get('body') ?? '').trim();
		if (!title || !body) return fail(400, { title, body, missing: true });
		const post = updatePost(params.id, { title, body });
		if (!post) error(404, '글을 찾을 수 없습니다');
		redirect(303, `/posts/${post.id}`);
	}
};
