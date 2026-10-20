import { fail, redirect } from '@sveltejs/kit';
import { readSession } from '#lib/server/auth.js';
import { createPost } from '#lib/server/posts.js';

export const actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const body = String(form.get('body') ?? '').trim();
		if (!title || !body) return fail(400, { title, body, missing: true });
		const user = readSession(cookies);
		const post = createPost({
			title,
			body,
			authorId: user?.id ?? null,
			authorName: user?.name ?? '손님'
		});
		redirect(303, `/posts/${post.id}`);
	}
};
