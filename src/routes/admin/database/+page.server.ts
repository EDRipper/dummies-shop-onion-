import { fail, redirect } from '@sveltejs/kit';
import { db, rawUsers, shopItems, shopOrders, payouts, usersWithTokens } from '$lib/server/db';
import { eq, sql } from 'drizzle-orm';
import type { Actions, ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async ({ locals }) => {
	if (!locals.user?.isAdmin) {
		throw redirect(302, '/');
	}

	// Get all users and items for the dropdowns
	const users = await db.select().from(usersWithTokens).orderBy(usersWithTokens.displayName);
	const items = await db.select().from(shopItems).orderBy(shopItems.name);

	return {
		users,
		items
	};
};

export const actions: Actions = {
	executeQuery: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const query = formData.get('query') as string;

		if (!query || !query.trim()) {
			return fail(400, { error: 'Query is required' });
		}

		try {
			// Execute the raw SQL query
			const result = await db.execute(sql.raw(query));
			
			return {
				success: true,
				message: 'Query executed successfully',
				queryResult: {
					data: result.rows || result,
					rowCount: result.rowCount
				}
			};
		} catch (error: any) {
			console.error('SQL Query Error:', error);
			return {
				success: false,
				error: 'SQL execution failed',
				queryResult: {
					error: error.message || 'Unknown database error'
				}
			};
		}
	},

	manageUser: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const action = formData.get('action') as string;

		if (!userId || !action) {
			return fail(400, { error: 'User ID and action are required' });
		}

		try {
			switch (action) {
				case 'toggleAdmin':
					// Get current user status
					const [currentUser] = await db.select().from(rawUsers).where(eq(rawUsers.slackId, userId));
					if (!currentUser) {
						return fail(404, { error: 'User not found' });
					}

					// Toggle admin status
					await db.update(rawUsers)
						.set({ isAdmin: !currentUser.isAdmin })
						.where(eq(rawUsers.slackId, userId));

					return {
						success: true,
						message: `User ${currentUser.isAdmin ? 'demoted from' : 'promoted to'} admin`
					};

				case 'deleteUser':
					// Prevent deleting yourself
					if (userId === locals.user.slackId) {
						return fail(400, { error: 'Cannot delete your own account' });
					}

					// Delete user (this will cascade to related records due to foreign keys)
					await db.delete(rawUsers).where(eq(rawUsers.slackId, userId));

					return {
						success: true,
						message: 'User deleted successfully'
					};

				default:
					return fail(400, { error: 'Invalid action' });
			}
		} catch (error: any) {
			console.error('User management error:', error);
			return fail(500, { error: 'Failed to manage user: ' + error.message });
		}
	},

	manageItem: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const itemId = formData.get('itemId') as string;
		const action = formData.get('action') as string;

		if (!itemId || !action) {
			return fail(400, { error: 'Item ID and action are required' });
		}

		try {
			switch (action) {
				case 'deleteItem':
					// Delete the item (this may cascade to related orders)
					await db.delete(shopItems).where(eq(shopItems.id, itemId));

					return {
						success: true,
						message: 'Item deleted successfully'
					};

				default:
					return fail(400, { error: 'Invalid action' });
			}
		} catch (error: any) {
			console.error('Item management error:', error);
			return fail(500, { error: 'Failed to manage item: ' + error.message });
		}
	},

	backup: async ({ locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Unauthorized' });
		}

		try {
			// Create a simple backup by exporting all data
			const users = await db.select().from(rawUsers);
			const items = await db.select().from(shopItems);
			const orders = await db.select().from(shopOrders);
			const payoutsData = await db.select().from(payouts);

			const backup = {
				timestamp: new Date().toISOString(),
				data: {
					users,
					items,
					orders,
					payouts: payoutsData
				}
			};

			// In a real app, you'd save this to a file or cloud storage
			console.log('Database backup created:', backup);

			return {
				success: true,
				message: 'Backup created successfully (check server logs)'
			};
		} catch (error: any) {
			console.error('Backup error:', error);
			return fail(500, { error: 'Failed to create backup: ' + error.message });
		}
	},

	resetOrders: async ({ locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Unauthorized' });
		}

		try {
			// Delete all orders
			await db.delete(shopOrders);

			return {
				success: true,
				message: 'All orders have been reset'
			};
		} catch (error: any) {
			console.error('Reset orders error:', error);
			return fail(500, { error: 'Failed to reset orders: ' + error.message });
		}
	},

	resetTokens: async ({ locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Unauthorized' });
		}

		try {
			// Delete all payouts (this effectively resets all user tokens to 0)
			await db.delete(payouts);

			return {
				success: true,
				message: 'All user tokens have been reset to 0'
			};
		} catch (error: any) {
			console.error('Reset tokens error:', error);
			return fail(500, { error: 'Failed to reset tokens: ' + error.message });
		}
	}
};
