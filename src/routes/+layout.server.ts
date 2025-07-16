import { db, usersWithTokens } from "$lib/server/db";
import { eq } from "drizzle-orm"

export async function load({ locals }) {
	return {
		user: locals.user
	};
}
