import type { PageServerLoad } from './$types';
import { db, shopItems } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	return {
		items: await db.select().from(shopItems).orderBy(shopItems.price)
	};
};
