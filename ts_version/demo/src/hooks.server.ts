import { redirect, type Handle } from '@sveltejs/kit';
import { readSession } from '#lib/server/auth.js';

function needsLogin(pathname: string) {
	if (pathname === '/posts/new' || pathname === '/secret') return true;
	return /^\/posts\/[^/]+\/edit\/?$/.test(pathname);
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = readSession(event.cookies);
	if (!event.locals.user && needsLogin(event.url.pathname)) {
		const next = `${event.url.pathname}${event.url.search}`;
		redirect(303, `/login?next=${encodeURIComponent(next)}`);
	}
	return resolve(event);
};
