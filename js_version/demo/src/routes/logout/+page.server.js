import { redirect } from '@sveltejs/kit';
import { clearSession } from '#lib/server/auth.js';

export const actions = {
	default: async ({ cookies }) => {
		clearSession(cookies);
		redirect(303, '/');
	}
};
