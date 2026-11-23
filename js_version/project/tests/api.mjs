import assert from 'node:assert/strict';
const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
let checks = 0;
async function request(path, method = 'GET', body, token, expected = 200, extra = {}) {
	const response = await fetch(base + path, {
		method,
		headers: {
			...(!['GET', 'HEAD'].includes(method) ? { 'Content-Type': 'application/json' } : {}),
			...(token ? { Authorization: 'Bearer ' + token } : {}),
			...extra
		},
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	assert.equal(
		response.status,
		expected,
		method + ' ' + path + ' ' + (await response.clone().text())
	);
	assert.ok(response.headers.get('x-request-id'));
	checks++;
	const data = response.status === 204 ? null : await response.json();
	if (expected >= 400) {
		assert.equal(data.error.requestId, response.headers.get('x-request-id'));
		assert.ok(data.error.code);
	}
	return { data, response };
}
const stamp = crypto.randomUUID();
const account = {
	email: 'a-' + stamp + '@example.com',
	password: 'safe-password-123',
	nickname: '학습자'
};
await request('/health');
await request('/api/auth/signup', 'POST', account, null, 201);
await request('/api/auth/signup', 'POST', account, null, 409);
await request('/api/auth/login', 'POST', { ...account, password: 'wrong-password' }, null, 401);
const { data: login, response: session } = await request('/api/auth/login', 'POST', account);
const token = login.data.accessToken;
assert.match(session.headers.get('set-cookie'), /HttpOnly/i);
await request('/api/auth/me', 'GET', undefined, token);
await request('/api/auth/me', 'GET', undefined, 'fake-token', 401);
await request('/api/posts', 'POST', { title: 'no auth', body: 'body' }, null, 401);
await request('/api/posts', 'POST', { title: '', body: '' }, token, 400);
const result = await request(
	'/api/posts',
	'POST',
	{ title: 'spec-' + stamp, body: '<script>alert(1)</script>', tags: ['study'] },
	token,
	201
);
const id = result.data.data.id;
assert.equal(result.response.headers.get('location'), '/api/posts/' + id);
await request('/api/posts/' + id);
const listing = await request('/api/posts?q=' + stamp + '&limit=99&sort=-commentCount');
assert.equal(listing.data.meta.limit, 50);
assert.equal(listing.data.meta.total, 1);
await request('/api/posts?page=0', 'GET', undefined, null, 400);
await request('/api/posts/abc', 'GET', undefined, null, 400);
await request('/api/unknown', 'GET', undefined, null, 404);
await request('/api/posts/999999999', 'GET', undefined, null, 404);
await request('/api/posts/' + id, 'PATCH', { title: 'changed' }, token);
const other = { ...account, email: 'b-' + stamp + '@example.com' };
await request('/api/auth/signup', 'POST', other, null, 201);
const otherToken = (await request('/api/auth/login', 'POST', other)).data.data.accessToken;
await request('/api/posts/' + id, 'PATCH', { title: 'stolen' }, otherToken, 403);
await request('/api/posts/' + id, 'DELETE', undefined, otherToken, 403);
const comment = (
	await request('/api/posts/' + id + '/comments', 'POST', { body: '댓글' }, token, 201)
).data.data;
await request('/api/posts/' + id + '/comments');
await request('/api/comments/' + comment.id, 'DELETE', undefined, otherToken, 403);
await request('/api/comments/' + comment.id, 'DELETE', undefined, token, 204);
await request('/api/posts/' + id, 'DELETE', undefined, token, 204);
await request('/api/posts/' + id, 'GET', undefined, null, 404);
await request('/api/auth/logout', 'POST', undefined, token, 204);
await request('/api/auth/me', 'GET', undefined, token, 401);
await request('/api/posts', 'POST', { title: 'csrf', body: 'test' }, otherToken, 403, {
	Origin: 'https://evil.invalid'
});
const malformed = await fetch(base + '/api/posts', {
	method: 'POST',
	headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + otherToken },
	body: '{'
});
assert.equal(malformed.status, 400);
checks++;
console.log(JSON.stringify({ checks, base, result: 'passed' }));
