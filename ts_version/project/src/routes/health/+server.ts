import type { RequestHandler } from '@sveltejs/kit';
import { storage } from '#lib/server/course/storage.js';
export const GET: RequestHandler = async () => {
	try {
		await (await storage()).all('receipts');
		return Response.json({ status: 'ok' });
	} catch {
		return Response.json({ status: 'unavailable' }, { status: 503 });
	}
};
