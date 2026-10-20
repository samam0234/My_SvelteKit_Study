import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	error(418, '주전자로는 커피를 내릴 수 없습니다');
};
