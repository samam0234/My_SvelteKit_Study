import { performance } from 'node:perf_hooks';
const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
const durations = [];
for (let i = 0; i < 30; i++) {
	const start = performance.now();
	const response = await fetch(base + '/api/posts?limit=10');
	if (!response.ok) throw new Error('HTTP ' + response.status);
	await response.arrayBuffer();
	durations.push(performance.now() - start);
}
durations.sort((a, b) => a - b);
console.log(
	JSON.stringify({
		samples: 30,
		medianMs: durations[15],
		p95Ms: durations[28],
		note: '로컬 순차 HTTP 측정. Lighthouse/CWV 또는 부하 시험 결과가 아님.'
	})
);
