// See https://svelte.dev/docs/kit/types#app.d.ts

import type { UserWithTokens } from '$lib/server/db';

// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: UserWithTokens;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
