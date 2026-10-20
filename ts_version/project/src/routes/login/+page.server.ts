import { fail, redirect } from '@sveltejs/kit';
import { safeNext, setSession } from '#lib/features/auth/server/session.js';
import { authenticate } from '#lib/features/auth/server/users.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const user = await authenticate(email, password);
		if (!user) return fail(400, { email, invalid: true });
		setSession(cookies, user);
		redirect(303, safeNext(url.searchParams.get('next')));
	}
};
