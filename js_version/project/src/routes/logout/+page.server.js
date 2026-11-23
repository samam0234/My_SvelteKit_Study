import { redirect } from '@sveltejs/kit';
import { clearSession } from '#lib/features/auth/server/session.js';
export const actions = {
    default: async ({ cookies }) => {
        clearSession(cookies);
        redirect(303, '/');
    }
};
