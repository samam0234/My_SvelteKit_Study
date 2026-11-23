import { ApiError } from './errors.js';
const buckets = new Map();
export function rateLimit(key, limit = 60) {
    const now = Date.now();
    for (const [id, value] of buckets)
        if (value.reset <= now)
            buckets.delete(id);
    let entry = buckets.get(key);
    if (!entry) {
        if (buckets.size >= 2000)
            throw new ApiError(429, 'RATE_LIMITED', '요청이 많습니다. 잠시 후 다시 시도하세요.');
        entry = { count: 0, reset: now + 60000 };
        buckets.set(key, entry);
    }
    if (++entry.count > limit)
        throw new ApiError(429, 'RATE_LIMITED', '1분 후 다시 시도하세요.');
}
