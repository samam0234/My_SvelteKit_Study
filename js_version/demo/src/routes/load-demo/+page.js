import { browser } from '$app/env';

export function load({ data }) {
	return {
		...data,
		ranOn: browser ? 'browser' : 'server'
	};
}
