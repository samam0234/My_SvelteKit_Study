import { readSession } from '#lib/server/auth.js';

export function load({ cookies }) {
	return { user: readSession(cookies) };
}
