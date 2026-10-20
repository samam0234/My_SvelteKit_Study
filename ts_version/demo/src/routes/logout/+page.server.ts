import { redirect } from '@sveltejs/kit';
import { clearSession } from '#lib/server/auth.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ cookies }) => {
		clearSession(cookies);
		redirect(303, '/');
	}
};
