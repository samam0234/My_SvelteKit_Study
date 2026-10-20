import { listNotes } from '#lib/features/notes/server/notes.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return { notes: listNotes() };
};
