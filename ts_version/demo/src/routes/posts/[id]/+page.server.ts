import { error, redirect } from '@sveltejs/kit';
import { deletePost, getPost } from '#lib/server/posts.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const post = getPost(params.id);
	if (!post) error(404, '글을 찾을 수 없습니다');
	return { post };
};

export const actions: Actions = {
	remove: async ({ params }) => {
		deletePost(params.id);
		redirect(303, '/posts');
	}
};
