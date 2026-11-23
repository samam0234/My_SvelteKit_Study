export class ApiError extends Error {
	constructor(
		public status: number,
		public code: string,
		message: string,
		public fields: Record<string, string[]> = {}
	) {
		super(message);
	}
}
export function requireValue(
	condition: unknown,
	status: number,
	code: string,
	message: string
): asserts condition {
	if (!condition) throw new ApiError(status, code, message);
}
export function positiveId(value: string) {
	requireValue(
		/^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)),
		400,
		'BAD_REQUEST',
		'숫자 id가 필요합니다.'
	);
	return Number(value);
}
