import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { shopItems, shopOrders } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user?.isAdmin) {
		return json({ error: 'Access denied' }, { status: 403 });
	}

	const { userId } = params;

	if (!userId) {
		return json({ error: 'User ID is required' }, { status: 400 });
	}

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
		.where(eq(shopOrders.userId, userId))
		.orderBy(shopOrders.createdAt);

	return json({ orders });
};
