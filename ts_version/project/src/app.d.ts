import type { User } from '#lib/server/course/service.js';
import type { PublicUser } from '#lib/features/auth/server/users.js';

declare global {
	namespace App {
		interface Locals {
      member: User;
      courseToken: string | undefined;
      requestId: string;
			user: PublicUser | null;
		}
	}
}

export {};
