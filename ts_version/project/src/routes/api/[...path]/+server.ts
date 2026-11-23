import type { RequestHandler } from '@sveltejs/kit';
import * as service from '#lib/server/course/service.js';
import { ApiError, positiveId } from '#lib/server/course/errors.js';
import { apiError, jsonBody } from '#lib/server/course/http.js';
const dispatch: RequestHandler = async (event) => {
	const { request, params, cookies, locals, url } = event;
	const path = (params.path ?? '').split('/'),
		method = request.method,
		user = locals.member;
	const ok = (data: unknown, status = 200, headers = {}) =>
		Response.json({ data }, { status, headers });
	try {
		if (path[0] === 'auth') {
			if (method === 'POST' && path[1] === 'signup')
				return ok(await service.signup(await jsonBody(request)), 201);
			if (method === 'POST' && path[1] === 'login') {
				const result = await service.login(await jsonBody(request));
				cookies.set('course_session', result.accessToken, {
					path: '/',
					httpOnly: true,
					sameSite: 'lax',
					secure: url.protocol === 'https:',
					maxAge: 3600
				});
				return ok(result);
			}
			if (method === 'GET' && path[1] === 'me') {
				service.authorized(user);
				return ok(user);
			}
			if (method === 'POST' && path[1] === 'logout') {
				service.authorized(user);
				await service.revoke(locals.courseToken);
				cookies.delete('course_session', { path: '/' });
				return new Response(null, { status: 204 });
			}
		}
		if (path[0] === 'posts') {
			if (path.length === 1) {
				if (method === 'GET') return Response.json(await service.list(url.searchParams, user));
				if (method === 'POST') {
					const data = await service.write(await jsonBody(request), user);
					return ok(data, 201, { Location: '/api/posts/' + data.id });
				}
			} else {
				const id = positiveId(path[1]);
				if (path.length === 2) {
					if (method === 'GET') return ok(await service.post(id));
					if (method === 'PATCH') return ok(await service.write(await jsonBody(request), user, id));
					if (method === 'DELETE') {
						await service.removePost(id, user);
						return new Response(null, { status: 204 });
					}
				}
				if (path.length === 3 && path[2] === 'comments') {
					if (method === 'GET') return ok(await service.comments(id));
					if (method === 'POST')
						return ok(await service.addComment(id, await jsonBody(request), user), 201);
				}
			}
		}
		if (path[0] === 'comments' && path.length === 2 && method === 'DELETE') {
			await service.removeComment(positiveId(path[1]), user);
			return new Response(null, { status: 204 });
		}
		throw new ApiError(404, 'NOT_FOUND', 'API 경로를 찾을 수 없습니다.');
	} catch (error) {
		return apiError(error, event);
	}
};
export const GET = dispatch,
	POST = dispatch,
	PATCH = dispatch,
	DELETE = dispatch,
	PUT = dispatch;
