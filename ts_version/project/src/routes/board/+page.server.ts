import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { list, write } from '#lib/server/course/service.js';
import { ApiError } from '#lib/server/course/errors.js';
export const load: PageServerLoad = async ({ url, locals }) => ({
	...(await list(url.searchParams, locals.member)),
	member: locals.member,
	mine: url.searchParams.get('mine') === 'true'
});
export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await write(
				{ title: String(form.get('title') ?? ''), body: String(form.get('body') ?? ''), tags: [] },
				locals.member
			);
			return { success: true };
		} catch (error) {
			if (error instanceof ApiError)
				return fail(error.status, { message: error.message, fields: error.fields });
			throw error;
		}
	}
};
