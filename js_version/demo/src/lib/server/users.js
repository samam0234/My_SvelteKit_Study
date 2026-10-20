import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { compare, hash, hashSync } from 'bcryptjs';

const file = join(process.cwd(), 'data', 'users.json');

function seed() {
	return [
		{
			id: 'demo-user',
			email: 'demo@example.com',
			name: '데모',
			passwordHash: hashSync('demo1234', 10),
			createdAt: new Date().toISOString()
		}
	];
}

function read() {
	try {
		return JSON.parse(readFileSync(file, 'utf8'));
	} catch {
		const users = seed();
		write(users);
		return users;
	}
}

function write(users) {
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, JSON.stringify(users, null, 2));
}

function toPublic(user) {
	return { id: user.id, email: user.email, name: user.name };
}

export function findUserByEmail(email) {
	const key = email.trim().toLowerCase();
	return read().find((user) => user.email === key) ?? null;
}

export async function registerUser(input) {
	const email = input.email.trim().toLowerCase();
	const name = input.name.trim();
	const users = read();
	if (users.some((user) => user.email === email)) return { error: 'taken' };
	const user = {
		id: randomUUID(),
		email,
		name,
		passwordHash: await hash(input.password, 10),
		createdAt: new Date().toISOString()
	};
	users.push(user);
	write(users);
	return { user: toPublic(user) };
}

export async function authenticate(email, password) {
	const user = findUserByEmail(email);
	if (!user) return null;
	const ok = await compare(password, user.passwordHash);
	if (!ok) return null;
	return toPublic(user);
}
