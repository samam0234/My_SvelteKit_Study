import { redirect, type Handle, type HandleServerError } from '@sveltejs/kit';
import { readSession } from '#lib/features/auth/server/session.js';

function needsLogin(pathname: string) {
	if (pathname === '/notes/new') return true;
	return /^\/notes\/[^/]+\/edit\/?$/.test(pathname);
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = readSession(event.cookies);
	if (!event.locals.user && needsLogin(event.url.pathname)) {
		redirect(303, `/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}
	return resolve(event);
};

export const handleError: HandleServerError = ({ event, kind }) => {
	console.error('[handleError]', kind, event.url.pathname);
};
