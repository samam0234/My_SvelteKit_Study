import { fail, redirect } from '@sveltejs/kit';
import { addEntry, listEntries } from '#lib/server/guestbook.js';

export function load() {
	return { entries: listEntries() };
}

export const actions = {
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
