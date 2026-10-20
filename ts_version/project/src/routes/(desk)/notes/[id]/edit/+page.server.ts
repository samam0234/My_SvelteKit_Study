import { error, fail, redirect } from '@sveltejs/kit';
import { canEdit, getNote, updateNote } from '#lib/features/notes/server/notes.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	if (!locals.user) redirect(303, `/login?next=/notes/${params.id}/edit`);
	const note = getNote(params.id);
	if (!note) error(404, '메모를 찾을 수 없습니다');
	if (!canEdit(note, locals.user)) error(403, '이 메모를 수정할 수 없습니다');
	return { note };
};

export const actions: Actions = {
	default: async ({ params, request, locals }) => {
		if (!locals.user) redirect(303, `/login?next=/notes/${params.id}/edit`);
		const current = getNote(params.id);
		if (!current) error(404, '메모를 찾을 수 없습니다');
		if (!canEdit(current, locals.user)) error(403, '이 메모를 수정할 수 없습니다');
		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const body = String(form.get('body') ?? '').trim();
		if (!title || !body) return fail(400, { title, body, missing: true });
		const note = updateNote(params.id, { title, body });
		if (!note) error(404, '메모를 찾을 수 없습니다');
		redirect(303, `/notes/${note.id}`);
	}
};
