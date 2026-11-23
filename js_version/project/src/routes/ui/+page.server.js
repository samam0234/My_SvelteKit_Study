import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { fail } from '@sveltejs/kit';
import { postSchema } from '#lib/course/schema.js';
import { write } from '#lib/server/course/service.js';
import { ApiError } from '#lib/server/course/errors.js';
export const load = async () => ({ form: await superValidate(zod4(postSchema)) });
export const actions = {
    default: async ({ request, locals }) => {
        const form = await superValidate(request, zod4(postSchema));
        if (!form.valid)
            return fail(400, { form });
        try {
            await write(form.data, locals.member);
            return { form };
        }
        catch (error) {
            if (error instanceof ApiError)
                return fail(error.status, { form, message: error.message });
            throw error;
        }
    }
};
