import { dev } from '$app/env';
import { JWT_SECRET } from '$app/env/private';
import type { Cookies } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import type { PublicUser } from './users.js';

export const SESSION_COOKIE = 'session_token';

type TokenPayload = {
	sub: string;
	name: string;
	email: string;
};

export function signToken(user: PublicUser) {
	return jwt.sign({ sub: user.id, name: user.name, email: user.email }, JWT_SECRET, {
		expiresIn: '7d'
	});
}

export function readSession(cookies: Cookies): PublicUser | null {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;
	try {
		const payload = jwt.verify(token, JWT_SECRET);
		if (typeof payload === 'string') return null;
		const { sub, name, email } = payload as TokenPayload;
		if (!sub || !name || !email) return null;
		return { id: sub, name, email };
	} catch {
		return null;
	}
}

export function setSession(cookies: Cookies, user: PublicUser) {
	cookies.set(SESSION_COOKIE, signToken(user), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: 60 * 60 * 24 * 7
	});
}

export function clearSession(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

/** 오픈 리다이렉트를 막습니다. 같은 사이트의 경로만 허용합니다. */
export function safeNext(value: string | null) {
	if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
		return '/';
	}
	return value;
}
