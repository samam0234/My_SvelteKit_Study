import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
let vite, schema, errors, cache, ai, service;
before(async () => {
	vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
	schema = await vite.ssrLoadModule('/src/lib/course/schema.js');
	errors = await vite.ssrLoadModule('/src/lib/server/course/errors.js');
	cache = await vite.ssrLoadModule('/src/lib/server/course/cache.js');
	ai = await vite.ssrLoadModule('/src/lib/server/course/ai.js');
	service = await vite.ssrLoadModule('/src/lib/server/course/service.js');
});
after(async () => {
	await vite?.close();
});
test('가짜 DB를 주입해 검색·페이지·작성자 직렬화를 확인한다', async () => {
	const rows = {
		posts: [
			{
				id: 1,
				title: 'SvelteKit',
				body: '첫 글',
				tags: '[]',
				authorId: 7,
				createdAt: '2026-11-23T00:00:00Z',
				updatedAt: '2026-11-23T00:00:00Z'
			}
		],
		members: [{ id: 7, nickname: '가짜 DB 사용자', passwordHash: 'not-public' }],
		comments: [{ id: 3, postId: 1 }]
	};
	const calls = [];
	const fake = {
		all: async (table) => {
			calls.push(table);
			return rows[table] || [];
		},
		insert: async () => {
			throw new Error('unexpected write');
		},
		patch: async () => {},
		remove: async () => {}
	};
	const result = await service.list(new URLSearchParams('q=SVELTE&limit=1'), null, fake);
	assert.equal(result.meta.total, 1);
	assert.equal(result.data[0].commentCount, 1);
	assert.deepEqual(result.data[0].author, { id: 7, nickname: '가짜 DB 사용자' });
	assert.ok(!JSON.stringify(result).includes('not-public'));
	assert.deepEqual(calls, ['posts', 'members', 'comments']);
});
test('공백 제목·긴 본문·잘못된 tags 거부', () => {
	assert.equal(schema.postSchema.safeParse({ title: ' ', body: '본문' }).success, false);
	assert.equal(
		schema.postSchema.safeParse({ title: '제목', body: 'a'.repeat(20001) }).success,
		false
	);
	assert.equal(
		schema.postSchema.safeParse({ title: '제목', body: '본문', tags: [''] }).success,
		false
	);
});
test('부분 수정에서 생략한 필드는 생성하지 않는다', () => {
	assert.deepEqual(schema.postPatchSchema.parse({ title: ' changed ' }), { title: 'changed' });
});
test('회원 입력 정규화와 비밀번호 길이', () => {
	assert.equal(
		schema.signupSchema.parse({ email: 'A@example.com', nickname: 'a', password: '1234567890' })
			.email,
		'a@example.com'
	);
	assert.equal(
		schema.signupSchema.safeParse({ email: 'bad', nickname: 'a', password: 'short' }).success,
		false
	);
});
test('잘못된 id가 실제 DB 조회까지 내려가지 않는다', () => {
	for (const value of ['0', '-1', 'abc', '1e2', '9007199254740992'])
		assert.throws(() => errors.positiveId(value));
	assert.equal(errors.positiveId('23'), 23);
});
test('캐시는 동시 요청을 합치고 실패는 보관하지 않는다', async () => {
	const c = cache.ttlCache(1000);
	let calls = 0;
	const load = async () => ++calls;
	assert.deepEqual(await Promise.all([c.get('a', load), c.get('a', load)]), [1, 1]);
	c.clear();
	assert.equal(await c.get('a', load), 2);
	await assert.rejects(
		c.get('bad', async () => {
			throw new Error('network');
		})
	);
	assert.equal(await c.get('bad', async () => 3), 3);
});
test('RAG 검색은 질문과 관련된 발췌를 우선한다', () => {
	const sources = ai.retrieve('a'.repeat(700) + '사과 영양 정보', '사과');
	assert.equal(sources[0].index, 2);
	assert.ok(sources.length <= 3);
});
test('AI 공급자를 mock fetch로 바꿔 스트림 계약을 확인한다', async () => {
	let payload;
	const fake = async (_url, options) => {
		payload = JSON.parse(options.body);
		return new Response('{"message":{"content":"답변"},"done":true}\n');
	};
	const response = await ai.ask('사과 문서', '사과', new AbortController().signal, fake);
	assert.match(await response.text(), /답변/);
	assert.equal(payload.stream, true);
	assert.match(payload.messages[0].content, /근거/);
});
