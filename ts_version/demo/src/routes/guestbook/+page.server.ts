import { fail, redirect } from '@sveltejs/kit';
import { addEntry, listEntries } from '#lib/server/guestbook.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return { entries: listEntries() };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const message = String(form.get('message') ?? '').trim();
		if (!name || !message) {
			return fail(400, { name, message, missing: true });
		}
		addEntry({ name, message });
		redirect(303, '/guestbook');
	}
};
