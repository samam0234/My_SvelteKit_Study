import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	JWT_SECRET: {
		description: '세션 JWT 서명 비밀',
		schema: (value) => value || 'dev-only-change-me'
	},
	SITE_NAME: {
		public: true,
		static: true,
		description: '사이트 이름',
		schema: (value) => value || '소나무 책상'
	}
});
