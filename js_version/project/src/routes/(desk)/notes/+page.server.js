import { listNotes } from '#lib/features/notes/server/notes.js';
export const load = () => {
    return { notes: listNotes() };
};
