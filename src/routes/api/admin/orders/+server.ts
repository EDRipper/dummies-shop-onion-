import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { shopOrders } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	try {
		// Check if user is admin
		if (!locals.user?.isAdmin) {
			return json({ error: 'Access denied' }, { status: 403 });
		}

		const { orderId, status } = await request.json();

		if (!orderId || !status) {
			return json({ error: 'Order ID and status are required' }, { status: 400 });
		}

		// Validate status
		if (!['pending', 'fulfilled', 'rejected'].includes(status)) {
			return json({ error: 'Invalid status' }, { status: 400 });
		}

		// Update the order
		const updatedOrder = await db
			.update(shopOrders)
			.set({ status })
			.where(eq(shopOrders.id, orderId))
			.returning();

		if (!updatedOrder.length) {
			return json({ error: 'Order not found' }, { status: 404 });
		}

		return json({
			success: true,
			order: updatedOrder[0],
			message: `Order ${status} successfully`
		});
	} catch (error) {
		console.error('Order update error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
