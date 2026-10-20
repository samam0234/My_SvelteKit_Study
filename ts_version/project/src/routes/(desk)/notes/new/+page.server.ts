import { error, fail, redirect } from '@sveltejs/kit';
import { createNote } from '#lib/features/notes/server/notes.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login?next=/notes/new');
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const body = String(form.get('body') ?? '').trim();
		if (!title || !body) return fail(400, { title, body, missing: true });
		const note = createNote({ title, body, authorId: locals.user.id });
		if (!note) error(500, '메모를 저장하지 못했습니다');
		redirect(303, `/notes/${note.id}`);
	}
};
