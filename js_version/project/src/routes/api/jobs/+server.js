import { WORKER_SECRET } from '$app/env/private';
import { storage } from '#lib/server/course/storage.js';
import { mail } from '#lib/server/course/integrations.js';
import { authorized } from '#lib/server/course/service.js';
import { requireValue } from '#lib/server/course/errors.js';
import { apiError } from '#lib/server/course/http.js';
let running = false;
export const POST = async (event) => {
    try {
        const user = event.locals.member;
        authorized(user);
        const id = 'mail-job:' + crypto.randomUUID();
        await (await storage()).insert('receipts', {
            eventId: id,
            payload: JSON.stringify({ to: user.email, status: 'queued', attempts: 0 }),
            createdAt: new Date().toISOString()
        });
        return Response.json({ data: { id } }, { status: 202 });
    }
    catch (error) {
        return apiError(error, event);
    }
};
export const PATCH = async (event) => {
    try {
        requireValue(WORKER_SECRET.length >= 32 && event.request.headers.get('x-worker-secret') === WORKER_SECRET, 403, 'FORBIDDEN', '작업자 인증 실패');
        if (running)
            return Response.json({ data: { busy: true } });
        running = true;
        try {
            const db = await storage();
            for (const row of (await db.all('receipts')).filter((r) => r.eventId.startsWith('mail-job:'))) {
                const job = JSON.parse(row.payload);
                if (job.status === 'done' || job.attempts >= 3)
                    continue;
                try {
                    await mail(job.to, '백그라운드 작업 알림', row.eventId);
                    job.status = 'done';
                }
                catch {
                    job.attempts++;
                    job.status = job.attempts >= 3 ? 'failed' : 'queued';
                }
                await db.patch('receipts', row.id, { payload: JSON.stringify(job) });
            }
            return Response.json({ data: { processed: true } });
        }
        finally {
            running = false;
        }
    }
    catch (error) {
        return apiError(error, event);
    }
};
