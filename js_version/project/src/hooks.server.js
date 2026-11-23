import { sessionUser } from '#lib/server/course/service.js';
import { CORS_ORIGIN } from '$app/env/private';
import { rateLimit } from '#lib/server/course/rate.js';
import { apiError } from '#lib/server/course/http.js';
import { redirect } from '@sveltejs/kit';
import { readSession } from '#lib/features/auth/server/session.js';
function needsLogin(pathname) {
    if (pathname === '/notes/new')
        return true;
    return /^\/notes\/[^/]+\/edit\/?$/.test(pathname);
}
export const handle = async ({ event, resolve }) => {
    event.locals.requestId = /^[a-zA-Z0-9-]{1,80}$/.test(event.request.headers.get('x-request-id') ?? '')
        ? event.request.headers.get('x-request-id')
        : crypto.randomUUID();
    event.locals.courseToken =
        event.request.headers.get('authorization')?.replace(/^Bearer /, '') ||
            event.cookies.get('course_session');
    event.locals.member = null;
    try {
        if (event.url.pathname.startsWith('/api/') &&
            !['GET', 'HEAD', 'OPTIONS'].includes(event.request.method)) {
            rateLimit(event.getClientAddress() + ':' + event.url.pathname.split('/').slice(0, 3).join('/'), 60);
        }
        event.locals.member = await sessionUser(event.locals.courseToken);
    }
    catch (error) {
        const response = apiError(error, event);
        response.headers.set('X-Request-Id', event.locals.requestId);
        return response;
    }
    const origin = event.request.headers.get('origin');
    const api = event.url.pathname.startsWith('/api/');
    if (api && origin && ![event.url.origin, CORS_ORIGIN].includes(origin))
        return Response.json({
            error: {
                code: 'FORBIDDEN',
                message: '허용되지 않은 출처입니다.',
                fields: {},
                requestId: event.locals.requestId
            }
        }, { status: 403, headers: { 'X-Request-Id': event.locals.requestId } });
    if (api && event.request.method === 'OPTIONS')
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': origin ?? event.url.origin,
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id',
                'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
                Vary: 'Origin',
                'X-Request-Id': event.locals.requestId
            }
        });
    if (api &&
        !['GET', 'HEAD', 'OPTIONS'].includes(event.request.method) &&
        event.cookies.get('course_session') &&
        !event.request.headers.get('authorization') &&
        !origin &&
        event.url.pathname !== '/api/integrations/webhook')
        return Response.json({
            error: {
                code: 'FORBIDDEN',
                message: '쿠키 쓰기 요청에는 Origin이 필요합니다.',
                fields: {},
                requestId: event.locals.requestId
            }
        }, { status: 403, headers: { 'X-Request-Id': event.locals.requestId } });
    event.locals.user = readSession(event.cookies);
    if (!event.locals.user && needsLogin(event.url.pathname)) {
        redirect(303, `/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
    }
    const start = performance.now();
    const response = await resolve(event);
    response.headers.set('X-Request-Id', event.locals.requestId);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (api) {
        response.headers.set('Cache-Control', 'no-store');
        if (origin && [event.url.origin, CORS_ORIGIN].includes(origin)) {
            response.headers.set('Access-Control-Allow-Origin', origin);
            response.headers.set('Access-Control-Allow-Credentials', 'true');
            response.headers.append('Vary', 'Origin');
        }
    }
    console.info(JSON.stringify({
        requestId: event.locals.requestId,
        method: event.request.method,
        path: event.url.pathname,
        status: response.status,
        ms: Math.round(performance.now() - start)
    }));
    return response;
};
export const handleError = ({ event, kind }) => {
    console.error('[handleError]', kind, event.url.pathname);
};
