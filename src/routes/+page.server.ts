import type { PageServerLoad } from './$types';
import { db, shopItems } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	// If DB wasn't initialized (no DATABASE_URL), don't fail the whole page.
	if (!db) {
		return { items: [] };
	}

	try {
		const items = await db.select().from(shopItems).orderBy(shopItems.price);
		return { items };
	} catch (err) {
		// Log the error server-side but return a fallback to avoid a 500.
		// only triggers if the db isnt set up/is down
		// eslint-disable-next-line no-console
		console.error('DB error loading shop items:', err);
		return { items: [] };
	}
};
