import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const file = join(process.cwd(), 'data', 'guestbook.json');

function read() {
	try {
		return JSON.parse(readFileSync(file, 'utf8'));
	} catch {
		return [];
	}
}

function write(entries) {
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, JSON.stringify(entries, null, 2));
}

export function listEntries() {
	return read().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function addEntry(input) {
	const entry = {
		id: randomUUID(),
		name: input.name,
		message: input.message,
		createdAt: new Date().toISOString()
	};
	const entries = read();
	entries.push(entry);
	write(entries);
	return entry;
}
