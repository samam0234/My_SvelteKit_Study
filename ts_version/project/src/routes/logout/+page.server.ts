import { redirect } from '@sveltejs/kit';
import { clearSession } from '#lib/features/auth/server/session.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ cookies }) => {
		clearSession(cookies);
		redirect(303, '/');
	}
};
