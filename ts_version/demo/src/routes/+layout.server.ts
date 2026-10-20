import { readSession } from '#lib/server/auth.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies }) => {
	return { user: readSession(cookies) };
};
