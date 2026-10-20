import { error, redirect } from '@sveltejs/kit';
import { canEdit, deletePost, getPost } from '#lib/server/posts.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	const post = getPost(params.id);
	if (!post) error(404, '글을 찾을 수 없습니다');
	return { post, canEdit: canEdit(post, locals.user) };
};

export const actions: Actions = {
	remove: async ({ params, locals }) => {
		if (!locals.user) redirect(303, `/login?next=/posts/${params.id}`);
		const post = getPost(params.id);
		if (!post) error(404, '글을 찾을 수 없습니다');
		if (!canEdit(post, locals.user)) error(403, '이 글을 지울 수 없습니다');
		deletePost(params.id);
		redirect(303, '/posts');
	}
};
