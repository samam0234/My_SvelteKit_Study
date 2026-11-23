import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	WORKER_SECRET: { schema: (value: string | undefined) => value || '' },
	DB_KIND: { schema: (value: string | undefined) => value || 'sqlite' },
	DATABASE_URL: { schema: (value: string | undefined) => value || 'file:data/board.sqlite' },
	CORS_ORIGIN: { schema: (value: string | undefined) => value || 'http://localhost:5173' },
	OLLAMA_URL: { schema: (value: string | undefined) => value || 'http://127.0.0.1:11434' },
	OLLAMA_MODEL: { schema: (value: string | undefined) => value || 'gemma4:12b' },
	AI_MODE: { schema: (value: string | undefined) => value || 'live' },
	RESEND_API_KEY: { schema: (value: string | undefined) => value || '' },
	MAIL_FROM: { schema: (value: string | undefined) => value || '' },
	STRIPE_SECRET_KEY: { schema: (value: string | undefined) => value || '' },
	STRIPE_WEBHOOK_SECRET: { schema: (value: string | undefined) => value || '' },
	STRIPE_PRICE_ID: { schema: (value: string | undefined) => value || '' },
	GITHUB_CLIENT_ID: { schema: (value: string | undefined) => value || '' },
	GITHUB_CLIENT_SECRET: { schema: (value: string | undefined) => value || '' },
	PUBLIC_ORIGIN: { schema: (value: string | undefined) => value || 'http://localhost:5173' },
	UPLOAD_DIR: { schema: (value: string | undefined) => value || 'data/uploads' },
	JWT_SECRET: {
		description: '세션 JWT 서명 비밀',
		schema: (value: string | undefined) => value || 'dev-only-change-me'
	},
	SITE_NAME: {
		public: true,
		static: true,
		description: '사이트 이름',
		schema: (value: string | undefined) => value || '소나무 게시판'
	}
});
