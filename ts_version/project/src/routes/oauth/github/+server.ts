import { redirect, type RequestHandler } from '@sveltejs/kit';
import { randomBytes, createHash } from 'node:crypto';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, PUBLIC_ORIGIN } from '$app/env/private';
import { storage } from '#lib/server/course/storage.js';
import { createSession, publicUser } from '#lib/server/course/service.js';
import { requireValue } from '#lib/server/course/errors.js';
import { apiError } from '#lib/server/course/http.js';
export const GET: RequestHandler = async (event) => {
	const { cookies, url } = event;
	let destination: string;
	try {
		requireValue(
			GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET,
			503,
			'NOT_CONFIGURED',
			'GitHub OAuth 앱 설정이 필요합니다.'
		);
		const options = {
			path: '/oauth/github',
			httpOnly: true,
			sameSite: 'lax' as const,
			secure: url.protocol === 'https:',
			maxAge: 600
		};
		const callback = PUBLIC_ORIGIN + '/oauth/github';
		if (!url.searchParams.has('code')) {
			const state = randomBytes(24).toString('base64url'),
				verifier = randomBytes(32).toString('base64url');
			cookies.set('oauth_state', state, options);
			cookies.set('oauth_verifier', verifier, options);
			destination =
				'https://github.com/login/oauth/authorize?' +
				new URLSearchParams({
					client_id: GITHUB_CLIENT_ID,
					redirect_uri: callback,
					state,
					code_challenge: createHash('sha256').update(verifier).digest('base64url'),
					code_challenge_method: 'S256',
					scope: 'read:user'
				});
		} else {
			const verifier = cookies.get('oauth_verifier'),
				state = cookies.get('oauth_state');
			cookies.delete('oauth_state', { path: options.path });
			cookies.delete('oauth_verifier', { path: options.path });
			requireValue(
				state && state === url.searchParams.get('state') && verifier,
				400,
				'BAD_REQUEST',
				'OAuth state를 확인하세요.'
			);
			const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
				method: 'POST',
				headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
				body: JSON.stringify({
					client_id: GITHUB_CLIENT_ID,
					client_secret: GITHUB_CLIENT_SECRET,
					code: url.searchParams.get('code'),
					redirect_uri: callback,
					code_verifier: verifier
				}),
				signal: AbortSignal.timeout(10000)
			});
			const token = await tokenResponse.json();
			requireValue(
				tokenResponse.ok && token.access_token,
				502,
				'UPSTREAM_ERROR',
				'OAuth 토큰 교환 실패'
			);
			const response = await fetch('https://api.github.com/user', {
				headers: {
					Authorization: 'Bearer ' + token.access_token,
					Accept: 'application/vnd.github+json',
					'User-Agent': 'SvelteKitStudy'
				},
				signal: AbortSignal.timeout(10000)
			});
			const profile = await response.json();
			requireValue(
				response.ok && Number.isInteger(profile.id),
				502,
				'UPSTREAM_ERROR',
				'OAuth 사용자 조회 실패'
			);
			const db = await storage(),
				email = 'github-' + profile.id + '@oauth.invalid';
			// A provider-specific identifier avoids linking accounts by an unverified email.
			let row = (await db.all('members')).find((u) => u.email === email);
			if (!row)
				row = await db.insert('members', {
					email,
					nickname: String(profile.login).slice(0, 80),
					passwordHash: 'oauth-only',
					createdAt: new Date().toISOString()
				});
			const session = await createSession(publicUser(row));
			cookies.set('course_session', session.accessToken, { ...options, path: '/', maxAge: 3600 });
			destination = '/board';
		}
	} catch (error) {
		return apiError(error, event);
	}
	redirect(303, destination);
};
