import assert from 'node:assert/strict';
const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
let checks = 0;
async function api(path, method = 'GET', body, token, status = 200) {
	const response = await fetch(base + path, {
		method,
		headers: {
			'content-type': 'application/json',
			...(token ? { Authorization: 'Bearer ' + token } : {})
		},
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	assert.equal(response.status, status, path + ': ' + (await response.clone().text()));
	checks++;
	return response;
}
async function user(prefix) {
	const account = {
		email: prefix + crypto.randomUUID() + '@example.com',
		nickname: '연동 학습자',
		password: 'integrations-pass-123'
	};
	await api('/api/auth/signup', 'POST', account, null, 201);
	return (await (await api('/api/auth/login', 'POST', account)).json()).data.accessToken;
}
const token = await user('upload-'),
	other = await user('other-');
const form = new FormData();
form.set('file', new File(['문서 원문'], '../../attempt.md', { type: 'text/markdown' }));
const uploaded = await fetch(base + '/api/integrations/upload', {
	method: 'POST',
	headers: { Authorization: 'Bearer ' + token, Origin: base },
	body: form
});
assert.equal(uploaded.status, 201, await uploaded.clone().text());
checks++;
const id = (await uploaded.json()).data.id;
assert.ok(!id.includes('attempt'));
assert.ok(!id.includes('/'));
const file = await api('/api/files/' + id, 'GET', undefined, token);
assert.equal(await file.text(), '문서 원문');
await api('/api/files/' + id, 'GET', undefined, other, 404);
const bad = new FormData();
bad.set('file', new File([new Uint8Array([0xff, 0xfe])], 'binary.txt'));
const invalid = await fetch(base + '/api/integrations/upload', {
	method: 'POST',
	headers: { Authorization: 'Bearer ' + token, Origin: base },
	body: bad
});
assert.equal(invalid.status, 400);
checks++;
await api('/api/integrations/mail', 'POST', { key: crypto.randomUUID() }, token, 503);
await api('/api/integrations/checkout', 'POST', { key: crypto.randomUUID() }, token, 503);
await api('/api/integrations/webhook', 'POST', {}, null, 503);
await api('/oauth/github', 'GET', undefined, null, 503);
await api('/api/jobs', 'POST', undefined, token, 202);
await api('/api/jobs', 'PATCH', undefined, null, 403);
const ai = await api(
	'/api/ai',
	'POST',
	{ text: '근거 문서: SvelteKit 학습', question: '요약' },
	token
);
assert.match(await ai.text(), /모의 응답/);
console.log(
	JSON.stringify({
		base,
		checks,
		result: 'passed',
		scope: 'local files, missing-config errors, queued job, mock AI'
	})
);
