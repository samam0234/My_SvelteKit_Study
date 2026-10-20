import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type Entry = {
	id: string;
	name: string;
	message: string;
	createdAt: string;
};

const file = join(process.cwd(), 'data', 'guestbook.json');

function read(): Entry[] {
	try {
		return JSON.parse(readFileSync(file, 'utf8')) as Entry[];
	} catch {
		return [];
	}
}

function write(entries: Entry[]) {
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, JSON.stringify(entries, null, 2));
}

export function listEntries() {
	return read().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function addEntry(input: { name: string; message: string }) {
	const entry: Entry = {
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
