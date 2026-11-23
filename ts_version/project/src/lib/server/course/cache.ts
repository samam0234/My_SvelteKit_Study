// Public data only. Never put a user's session or private document in this cache.
export function ttlCache<T>(ttlMs: number, maxEntries = 100) {
	const values = new Map<string, { expires: number; value: Promise<T> }>();
	return {
		get(key: string, load: () => Promise<T>) {
			const hit = values.get(key);
			if (hit && hit.expires > Date.now()) return hit.value;
			if (values.size >= maxEntries) values.delete(values.keys().next().value!);
			const value = load().catch((error) => {
				values.delete(key);
				throw error;
			});
			values.set(key, { value, expires: Date.now() + ttlMs });
			return value;
		},
		clear() {
			values.clear();
		}
	};
}
