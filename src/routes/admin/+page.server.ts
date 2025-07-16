import { redirect } from '@sveltejs/kit';
import { db, shopItems } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.isAdmin) {
		throw redirect(302, '/');
	}

	const items = await db.select().from(shopItems);

	return {
		items
	};
};
