import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	JWT_SECRET: {
		description: '세션 JWT를 서명하는 비밀. 비우면 학습용 기본값을 씁니다.',
		schema: (value) => value || 'dev-only-change-me'
	},
	SITE_NAME: {
		public: true,
		static: true,
		description: '머리말과 title에 보이는 이름. 빌드할 때 값으로 고정됩니다.',
		schema: (value) => value || 'SvelteKit 실습'
	}
});
