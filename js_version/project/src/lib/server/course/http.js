import { ApiError } from './errors.js';
export async function jsonBody(request) {
    if (!request.headers.get('content-type')?.includes('application/json'))
        throw new ApiError(400, 'BAD_REQUEST', 'JSON 본문이 필요합니다.');
    const text = await request.text();
    if (Buffer.byteLength(text) > 65536)
        throw new ApiError(413, 'PAYLOAD_TOO_LARGE', '64KB 이하로 입력하세요.');
    try {
        return JSON.parse(text);
    }
    catch {
        throw new ApiError(400, 'BAD_REQUEST', 'JSON 문법을 확인하세요.');
    }
}
export function apiError(error, event) {
    const known = error instanceof ApiError;
    if (!known)
        console.error(JSON.stringify({
            requestId: event.locals.requestId,
            error: String(error),
            path: event.url.pathname
        }));
    return Response.json({
        error: {
            code: known ? error.code : 'INTERNAL',
            message: known ? error.message : '서버 오류가 발생했습니다.',
            fields: known ? error.fields : {},
            requestId: event.locals.requestId
        }
    }, { status: known ? error.status : 500 });
}
