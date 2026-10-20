import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return { renderedAt: new Date().toISOString() };
};
