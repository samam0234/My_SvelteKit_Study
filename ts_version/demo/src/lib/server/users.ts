import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { compare, hash, hashSync } from 'bcryptjs';

export type PublicUser = {
	id: string;
	email: string;
	name: string;
};

type User = PublicUser & {
	passwordHash: string;
	createdAt: string;
};

const file = join(process.cwd(), 'data', 'users.json');

function seed(): User[] {
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

function read(): User[] {
	try {
		return JSON.parse(readFileSync(file, 'utf8')) as User[];
	} catch {
		const users = seed();
		write(users);
		return users;
	}
}

function write(users: User[]) {
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, JSON.stringify(users, null, 2));
}

function toPublic(user: User): PublicUser {
	return { id: user.id, email: user.email, name: user.name };
}

export function findUserByEmail(email: string) {
	const key = email.trim().toLowerCase();
	return read().find((user) => user.email === key) ?? null;
}

export async function registerUser(input: { email: string; name: string; password: string }) {
	const email = input.email.trim().toLowerCase();
	const name = input.name.trim();
	const users = read();
	if (users.some((user) => user.email === email)) return { error: 'taken' as const };
	const user: User = {
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

export async function authenticate(email: string, password: string) {
	const user = findUserByEmail(email);
	if (!user) return null;
	const ok = await compare(password, user.passwordHash);
	if (!ok) return null;
	return toPublic(user);
}
