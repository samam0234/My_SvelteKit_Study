import { defineEnvVars } from '@sveltejs/kit/env';
export const variables = defineEnvVars({
    WORKER_SECRET: { schema: (value) => value || '' },
    DB_KIND: { schema: (value) => value || 'sqlite' },
    DATABASE_URL: { schema: (value) => value || 'file:data/board.sqlite' },
    CORS_ORIGIN: { schema: (value) => value || 'http://localhost:5173' },
    OLLAMA_URL: { schema: (value) => value || 'http://127.0.0.1:11434' },
    OLLAMA_MODEL: { schema: (value) => value || 'gemma4:12b' },
    AI_MODE: { schema: (value) => value || 'live' },
    RESEND_API_KEY: { schema: (value) => value || '' },
    MAIL_FROM: { schema: (value) => value || '' },
    STRIPE_SECRET_KEY: { schema: (value) => value || '' },
    STRIPE_WEBHOOK_SECRET: { schema: (value) => value || '' },
    STRIPE_PRICE_ID: { schema: (value) => value || '' },
    GITHUB_CLIENT_ID: { schema: (value) => value || '' },
    GITHUB_CLIENT_SECRET: { schema: (value) => value || '' },
    PUBLIC_ORIGIN: { schema: (value) => value || 'http://localhost:5173' },
    UPLOAD_DIR: { schema: (value) => value || 'data/uploads' },
    JWT_SECRET: {
        description: '세션 JWT 서명 비밀',
        schema: (value) => value || 'dev-only-change-me'
    },
    SITE_NAME: {
        public: true,
        static: true,
        description: '사이트 이름',
        schema: (value) => value || '소나무 게시판'
    }
});
