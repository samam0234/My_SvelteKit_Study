import { browser } from '$app/env';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ data }) => {
	return {
		...data,
		ranOn: browser ? 'browser' : 'server'
	};
};
