export class ApiError extends Error {
    status;
    code;
    fields;
    constructor(status, code, message, fields = {}) {
        super(message);
        this.status = status;
        this.code = code;
        this.fields = fields;
    }
}
export function requireValue(condition, status, code, message) {
    if (!condition)
        throw new ApiError(status, code, message);
}
export function positiveId(value) {
    requireValue(/^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)), 400, 'BAD_REQUEST', '숫자 id가 필요합니다.');
    return Number(value);
}
