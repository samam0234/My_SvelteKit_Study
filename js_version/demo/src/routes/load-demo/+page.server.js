import { serverOnlySentence } from '#lib/server/vault.js';

export function load() {
	return {
		generatedAt: new Date().toISOString(),
		secretNote: '이 문장은 +page.server.js에만 있습니다. 브라우저 번들 소스를 뒤져도 이 파일은 없습니다.',
		serverOnlySentence
	};
}
