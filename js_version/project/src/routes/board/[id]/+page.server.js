import { error } from '@sveltejs/kit';
import { post, comments } from '#lib/server/course/service.js';
import { ApiError, positiveId } from '#lib/server/course/errors.js';
export const load = async ({ params, locals }) => {
    try {
        const id = positiveId(params.id);
        return { post: await post(id), comments: await comments(id), member: locals.member };
    }
    catch (caught) {
        if (caught instanceof ApiError)
            error(caught.status, caught.message);
        throw caught;
    }
};
