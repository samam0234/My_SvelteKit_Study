import { randomUUID } from 'node:crypto';
import { ensureDemoUser } from '#lib/features/auth/server/users.js';
import { db } from '#lib/server/db.js';

export type Note = {
	id: string;
	title: string;
	body: string;
	authorId: string;
	authorName: string;
	createdAt: string;
	updatedAt: string;
};

const select = `
	SELECT n.id, n.title, n.body,
		n.author_id AS authorId, u.name AS authorName,
		n.created_at AS createdAt, n.updated_at AS updatedAt
	FROM notes n
	JOIN users u ON u.id = n.author_id
`;

export function listNotes() {
	return db.prepare(`${select} ORDER BY n.created_at DESC`).all() as Note[];
}

export function getNote(id: string) {
	return (db.prepare(`${select} WHERE n.id = ?`).get(id) as Note | undefined) ?? null;
}

export function createNote(input: { title: string; body: string; authorId: string }) {
	const now = new Date().toISOString();
	const id = randomUUID();
	db.prepare(
		'INSERT INTO notes (id, title, body, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
	).run(id, input.title, input.body, input.authorId, now, now);
	return getNote(id);
}

export function updateNote(id: string, input: { title: string; body: string }) {
	const now = new Date().toISOString();
	const result = db.prepare('UPDATE notes SET title = ?, body = ?, updated_at = ? WHERE id = ?').run(
		input.title,
		input.body,
		now,
		id
	);
	if (result.changes === 0) return null;
	return getNote(id);
}

export function deleteNote(id: string) {
	const result = db.prepare('DELETE FROM notes WHERE id = ?').run(id);
	return result.changes > 0;
}

export function canEdit(note: Note, user: { id: string } | null) {
	return !!user && note.authorId === user.id;
}

function seedWelcome() {
	const count = db.prepare('SELECT COUNT(*) AS count FROM notes').get() as { count: number };
	if (count.count > 0) return;
	const authorId = ensureDemoUser();
	const now = new Date().toISOString();
	db.prepare(
		'INSERT INTO notes (id, title, body, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
	).run(
		'welcome',
		'책상 위 첫 메모',
		'이 메모는 SQLite 파일 data/desk.sqlite에 있습니다. demo 게시판의 JSON과는 다른 저장소입니다.',
		authorId,
		now,
		now
	);
}

seedWelcome();
