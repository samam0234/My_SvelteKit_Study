import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ fetch }) => ({
	spec: await (await fetch('/openapi.json')).json()
});
