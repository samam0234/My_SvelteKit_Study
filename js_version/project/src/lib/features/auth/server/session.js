import { dev } from '$app/env';
import { JWT_SECRET } from '$app/env/private';
import jwt from 'jsonwebtoken';

export const SESSION_COOKIE = 'session_token';

export function readSession(cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;
	try {
		const payload = jwt.verify(token, JWT_SECRET);
		if (typeof payload === 'string') return null;
		const { sub, name, email } = payload;
		if (!sub || !name || !email) return null;
		return { id: sub, name, email };
	} catch {
		return null;
	}
}

export function setSession(cookies, user) {
	cookies.set(
		SESSION_COOKIE,
		jwt.sign({ sub: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' }),
		{
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			maxAge: 60 * 60 * 24 * 7
		}
	);
}

export function clearSession(cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function safeNext(value) {
	if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
	return value;
}
