import { authorized } from '#lib/server/course/service.js';
import { ApiError, requireValue } from '#lib/server/course/errors.js';
import { apiError, jsonBody } from '#lib/server/course/http.js';
import { checkout, mail, upload, webhook } from '#lib/server/course/integrations.js';
export const POST = async (event) => {
    try {
        if (event.params.kind === 'webhook')
            return Response.json(await webhook(event.request));
        const user = event.locals.member;
        authorized(user);
        if (event.params.kind === 'upload') {
            const length = Number(event.request.headers.get('content-length'));
            requireValue(length > 0 && length <= 120000, 413, 'PAYLOAD_TOO_LARGE', '업로드 요청은 120KB 이하입니다.');
            const file = (await event.request.formData()).get('file');
            requireValue(file instanceof File, 400, 'VALIDATION_ERROR', 'file 필드가 필요합니다.');
            return Response.json({ data: await upload(file, user.id) }, { status: 201 });
        }
        const data = await jsonBody(event.request);
        requireValue(typeof data.key === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(data.key), 400, 'VALIDATION_ERROR', '8~80자의 중복 방지 key가 필요합니다.');
        if (event.params.kind === 'checkout')
            return Response.json({ data: await checkout(user.id, data.key) });
        if (event.params.kind === 'mail')
            return Response.json({
                data: await mail(user.email, '게시판 연결 확인 메일입니다.', user.id + ':' + data.key)
            });
        throw new ApiError(404, 'NOT_FOUND', '연동 경로를 찾을 수 없습니다.');
    }
    catch (error) {
        return apiError(error, event);
    }
};
