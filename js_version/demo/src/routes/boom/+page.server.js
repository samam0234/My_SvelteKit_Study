import { error } from '@sveltejs/kit';

export function load() {
	error(418, '주전자로는 커피를 내릴 수 없습니다');
}
