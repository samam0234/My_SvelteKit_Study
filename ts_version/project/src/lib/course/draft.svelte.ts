export function createDraft() {
	let text = $state('');
	return {
		get text() {
			return text;
		},
		set text(value: string) {
			text = value;
		},
		get length() {
			return text.length;
		}
	};
}
