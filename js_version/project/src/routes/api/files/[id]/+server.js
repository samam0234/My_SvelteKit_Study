import { authorized } from '#lib/server/course/service.js';
import { download } from '#lib/server/course/integrations.js';
import { apiError } from '#lib/server/course/http.js';
export const GET = async (event) => {
    try {
        const user = event.locals.member;
        authorized(user);
        return new Response(await download(event.params.id, user.id), {
            headers: {
                'content-type': 'text/plain; charset=utf-8',
                'Content-Disposition': 'attachment; filename="document.txt"'
            }
        });
    }
    catch (error) {
        return apiError(error, event);
    }
};
