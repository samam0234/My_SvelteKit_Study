import type { PublicUser } from '#lib/features/auth/server/users.js';

declare global {
	namespace App {
		interface Locals {
			user: PublicUser | null;
		}
	}
}

export {};
