import { redirect } from '@sveltejs/kit';
import { db, usersWithTokens, shopOrders, shopItems } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user?.isAdmin) {
		throw redirect(302, '/');
	}

	// Get all users with their token counts
	const users = await db.select().from(usersWithTokens);

	// Get all orders with user and item details
	const orders = await db
		.select({
			id: shopOrders.id,
			userId: shopOrders.userId,
			priceAtOrder: shopOrders.priceAtOrder,
			status: shopOrders.status,
			createdAt: shopOrders.createdAt,
			itemName: shopItems.name,
			itemType: shopItems.type
		})
		.from(shopOrders)
		.leftJoin(shopItems, eq(shopOrders.shopItemId, shopItems.id))
		.orderBy(shopOrders.createdAt);

	return {
		users,
		orders
	};
};
