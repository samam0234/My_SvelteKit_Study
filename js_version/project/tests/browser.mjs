import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
let checks = 0;
const errors = [];
try {
	const context = await browser.newContext();
	const page = await context.newPage();
	page.on('pageerror', (error) => errors.push(String(error)));
	await page.goto(base + '/lab');
	await page.getByRole('button', { name: '0 × 2 = 0' }).click();
	await page.getByRole('button', { name: '1 × 2 = 2' }).waitFor();
	checks++;
	await page.getByLabel('로컬 초안').fill('브라우저 초안');
	await page.getByRole('button', { name: '이 브라우저에 저장' }).click();
	await page.reload();
	assert.equal(await page.getByLabel('로컬 초안').inputValue(), '브라우저 초안');
	checks++;
	await page.goto(base + '/board');
	const stamp = crypto.randomUUID();
	await page.getByLabel('이메일', { exact: true }).fill('browser-' + stamp + '@example.com');
	await page.getByLabel('비밀번호', { exact: true }).fill('browser-password-123');
	await page.getByLabel('닉네임', { exact: true }).fill('브라우저 학습자');
	await page.getByRole('button', { name: '회원가입', exact: true }).click();
	await page.getByRole('status').filter({ hasText: '가입했습니다' }).waitFor();
	checks++;
	await page.getByLabel('비밀번호', { exact: true }).fill('browser-password-123');
	await page.getByRole('button', { name: '로그인', exact: true }).click();
	await page.getByLabel('제목', { exact: true }).waitFor();
	checks++;
	const title = '브라우저 글 ' + stamp;
	await page.getByLabel('제목', { exact: true }).fill(title);
	await page.getByLabel('본문', { exact: true }).fill('<script>window.xss=1</script> 본문');
	await page.getByRole('button', { name: '글 등록', exact: true }).click();
	await page.getByRole('link', { name: title, exact: true }).click();
	await page.getByRole('heading', { name: title }).waitFor();
	assert.equal(await page.evaluate(() => window.xss), undefined);
	checks++;
	await page.getByLabel('댓글', { exact: true }).fill('브라우저 댓글');
	await page.getByRole('button', { name: '댓글 등록', exact: true }).click();
	await page.getByText('브라우저 학습자: 브라우저 댓글', { exact: false }).waitFor();
	checks++;
	await page.getByLabel('제목', { exact: true }).fill(title + ' 수정');
	await page.getByRole('button', { name: '수정', exact: true }).click();
	await page.getByRole('heading', { name: title + ' 수정', exact: true }).waitFor();
	checks++;
	await page.goto(base + '/ui');
	await page.getByRole('button', { name: '입력 도움말' }).click();
	await page.getByRole('dialog').waitFor();
	await page.keyboard.press('Escape');
	await page.getByRole('dialog').waitFor({ state: 'hidden' });
	checks++;
	await page.getByLabel('제목', { exact: true }).fill('폼 라이브러리 ' + stamp);
	await page.getByLabel('본문', { exact: true }).fill('서버 검증 재사용');
	await page.getByRole('button', { name: '저장', exact: true }).click();
	await page.waitForTimeout(300);
	await page.goto(base + '/board?q=' + encodeURIComponent('폼 라이브러리 ' + stamp));
	await page.getByRole('link', { name: '폼 라이브러리 ' + stamp, exact: true }).waitFor();
	checks++;
	await page.goto(base + '/ai');
	await page
		.getByLabel('문서', { exact: true })
		.fill('SvelteKit은 한 프로젝트에서 화면과 API를 연결한다.');
	await page.getByRole('button', { name: '질문 보내기' }).click();
	await page.getByText('[모의 응답]', { exact: false }).waitFor();
	checks++;
	await page.goto(base + '/realtime');
	await page.getByText('pong', { exact: false }).waitFor();
	checks++;
	await page.waitForFunction(() => !document.body.innerText.includes('SSE 알림: 연결 중'));
	checks++;
	await page.goto(base + '/api-docs');
	await page.getByRole('heading', { name: '공통 API 스펙 v1', exact: true }).waitFor();
	checks++;
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(base + '/board');
	assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
	checks++;
	fs.mkdirSync('../../docs/screenshots', { recursive: true });
	await page.screenshot({ path: '../../docs/screenshots/board-mobile.png', fullPage: true });
	// HTML form actions also work without client JavaScript once the session exists.
	const nojs = await browser.newContext({
		javaScriptEnabled: false,
		storageState: await context.storageState()
	});
	const plain = await nojs.newPage();
	await plain.goto(base + '/board');
	await plain.getByLabel('제목', { exact: true }).fill('JS 없음 ' + stamp);
	await plain.getByLabel('본문', { exact: true }).fill('기본 HTML form action');
	await Promise.all([
		plain.waitForURL(base + '/board'),
		plain.getByRole('button', { name: '글 등록', exact: true }).click()
	]);
	await plain.getByRole('link', { name: 'JS 없음 ' + stamp, exact: true }).waitFor();
	checks++;
	assert.deepEqual(errors, []);
	console.log(JSON.stringify({ base, checks, pageErrors: errors.length, result: 'passed' }));
} finally {
	await browser.close();
}
