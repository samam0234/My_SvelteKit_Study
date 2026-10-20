import { fail, redirect } from '@sveltejs/kit';
import { safeNext, setSession } from '#lib/server/auth.js';
import { registerUser } from '#lib/server/users.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		if (!name || !email.includes('@') || password.length < 8) {
			return fail(400, { name, email, invalid: true });
		}
		const result = await registerUser({ name, email, password });
		if ('error' in result) return fail(400, { name, email, taken: true });
		setSession(cookies, result.user);
		redirect(303, safeNext(url.searchParams.get('next')));
	}
};
