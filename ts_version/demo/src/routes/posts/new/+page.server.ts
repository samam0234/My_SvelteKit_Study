import { fail, redirect } from '@sveltejs/kit';
import { createPost } from '#lib/server/posts.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const body = String(form.get('body') ?? '').trim();
		if (!title || !body) return fail(400, { title, body, missing: true });
		const post = createPost({ title, body, authorId: null, authorName: '손님' });
		redirect(303, `/posts/${post.id}`);
	}
};
