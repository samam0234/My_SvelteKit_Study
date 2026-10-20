import { hash, compare, hashSync } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { db } from '#lib/server/db.js';

export function ensureDemoUser() {
	const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@example.com');
	if (existing) return existing.id;
	const id = 'demo-user';
	db.prepare(
		'INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
	).run(id, 'demo@example.com', '데모', hashSync('demo1234', 10), new Date().toISOString());
	return id;
}

function toPublic(row) {
	return { id: row.id, email: row.email, name: row.name };
}

export async function registerUser(input) {
	const email = input.email.trim().toLowerCase();
	const name = input.name.trim();
	const taken = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
	if (taken) return { error: 'taken' };
	const user = { id: randomUUID(), email, name };
	db.prepare(
		'INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
	).run(user.id, email, name, await hash(input.password, 10), new Date().toISOString());
	return { user };
}

export async function authenticate(email, password) {
	const row = db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?').get(
		email.trim().toLowerCase()
	);
	if (!row) return null;
	const ok = await compare(password, row.password_hash);
	if (!ok) return null;
	return toPublic(row);
}

ensureDemoUser();
