import Stripe from 'stripe';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { RESEND_API_KEY, MAIL_FROM, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID, PUBLIC_ORIGIN, UPLOAD_DIR } from '$app/env/private';
import { ApiError, requireValue } from './errors.js';
import { storage } from './storage.js';
export async function mail(to, text, key, fetcher = fetch) {
    requireValue(RESEND_API_KEY && MAIL_FROM, 503, 'NOT_CONFIGURED', '메일 설정이 필요합니다.');
    const response = await fetcher('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + RESEND_API_KEY,
            'Content-Type': 'application/json',
            'Idempotency-Key': key
        },
        body: JSON.stringify({ from: MAIL_FROM, to: [to], subject: '소나무 게시판 알림', text }),
        signal: AbortSignal.timeout(10000)
    });
    requireValue(response.ok, 502, 'UPSTREAM_ERROR', '메일 공급자 요청이 실패했습니다.');
    return response.json();
}
export async function checkout(userId, key) {
    requireValue(STRIPE_SECRET_KEY && STRIPE_PRICE_ID, 503, 'NOT_CONFIGURED', '결제 설정이 필요합니다.');
    requireValue(STRIPE_SECRET_KEY.startsWith('sk_test_'), 503, 'TEST_MODE_REQUIRED', '실습에서는 Stripe 테스트 키만 허용합니다.');
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
        metadata: { userId: String(userId) },
        success_url: PUBLIC_ORIGIN + '/integrations?checkout=returned',
        cancel_url: PUBLIC_ORIGIN + '/integrations'
    }, { idempotencyKey: userId + ':' + key });
    return { url: session.url };
}
export async function webhook(request) {
    requireValue(STRIPE_SECRET_KEY && STRIPE_WEBHOOK_SECRET, 503, 'NOT_CONFIGURED', '웹훅 설정이 필요합니다.');
    let event;
    try {
        event = new Stripe(STRIPE_SECRET_KEY).webhooks.constructEvent(await request.text(), request.headers.get('stripe-signature') ?? '', STRIPE_WEBHOOK_SECRET);
    }
    catch {
        throw new ApiError(400, 'BAD_REQUEST', '웹훅 서명을 확인하세요.');
    }
    const db = await storage();
    if (!(await db.all('receipts')).some((r) => r.eventId === event.id)) {
        try {
            await db.insert('receipts', {
                eventId: event.id,
                payload: JSON.stringify({ type: event.type, object: event.data.object }),
                createdAt: new Date().toISOString()
            });
        }
        catch (error) {
            const dbError = error;
            if (!['23505', 'ER_DUP_ENTRY'].includes(String(dbError.code)) &&
                dbError.code !== 11000 &&
                !String(dbError.message).includes('UNIQUE'))
                throw error;
        }
    }
    // Receipt persistence is deliberately the only effect; never grant a paid entitlement from a success URL.
    return { received: true };
}
export async function upload(file, userId) {
    requireValue(file.size > 0 && file.size <= 100000, 413, 'PAYLOAD_TOO_LARGE', '텍스트 파일은 1~100000바이트입니다.');
    requireValue(/\.(txt|md)$/i.test(file.name), 400, 'VALIDATION_ERROR', 'txt 또는 md만 허용합니다.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    let text;
    try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    }
    catch {
        throw new ApiError(400, 'VALIDATION_ERROR', 'UTF-8 파일이 필요합니다.');
    }
    requireValue(!text.includes('\0'), 400, 'VALIDATION_ERROR', '바이너리 파일은 허용하지 않습니다.');
    const id = userId + '-' + randomUUID() + '.txt';
    await mkdir(resolve(UPLOAD_DIR), { recursive: true });
    await writeFile(join(resolve(UPLOAD_DIR), id), text, { flag: 'wx' });
    return { id, size: file.size };
}
export async function download(id, userId) {
    requireValue(new RegExp('^' + userId + '-[a-f0-9-]{36}\\.txt$').test(id), 404, 'NOT_FOUND', '파일을 찾을 수 없습니다.');
    try {
        return await readFile(join(resolve(UPLOAD_DIR), id), 'utf-8');
    }
    catch {
        throw new ApiError(404, 'NOT_FOUND', '파일을 찾을 수 없습니다.');
    }
}
