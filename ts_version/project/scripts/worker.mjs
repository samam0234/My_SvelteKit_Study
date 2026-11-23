const base = process.env.BOARD_ORIGIN || 'http://127.0.0.1:3000';
if ((process.env.WORKER_SECRET || '').length < 32) throw new Error('WORKER_SECRET 32자 이상 필요');
async function tick() {
	try {
		const response = await fetch(base + '/api/jobs', {
			method: 'PATCH',
			headers: { 'x-worker-secret': process.env.WORKER_SECRET, 'content-type': 'application/json' },
			signal: AbortSignal.timeout(30000)
		});
		console.log(JSON.stringify({ worker: response.status }));
	} catch (error) {
		console.error(String(error));
	}
}
await tick();
setInterval(tick, 10000);
