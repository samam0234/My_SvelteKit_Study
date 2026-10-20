import { listNotes } from '#lib/features/notes/server/notes.js';

export function load() {
	return { notes: listNotes() };
}
