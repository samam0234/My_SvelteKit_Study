import { error, redirect } from '@sveltejs/kit';
import { canEdit, deleteNote, getNote } from '#lib/features/notes/server/notes.js';
export const load = ({ params, locals }) => {
    const note = getNote(params.id);
    if (!note)
        error(404, '메모를 찾을 수 없습니다');
    return { note, canEdit: canEdit(note, locals.user) };
};
export const actions = {
    remove: async ({ params, locals }) => {
        if (!locals.user)
            redirect(303, `/login?next=/notes/${params.id}`);
        const note = getNote(params.id);
        if (!note)
            error(404, '메모를 찾을 수 없습니다');
        if (!canEdit(note, locals.user))
            error(403, '이 메모를 지울 수 없습니다');
        deleteNote(params.id);
        redirect(303, '/notes');
    }
};
