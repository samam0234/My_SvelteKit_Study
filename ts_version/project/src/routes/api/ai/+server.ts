import type { RequestHandler } from '@sveltejs/kit';
import { authorized, parse } from '#lib/server/course/service.js';
import { questionSchema } from '#lib/course/schema.js';
import { apiError, jsonBody } from '#lib/server/course/http.js';
import { ask } from '#lib/server/course/ai.js';
export const POST: RequestHandler = async (event) => {
	try {
		authorized(event.locals.member);
		const input = parse(questionSchema, await jsonBody(event.request));
		return await ask(input.text, input.question, event.request.signal);
	} catch (error) {
		return apiError(error, event);
	}
};
