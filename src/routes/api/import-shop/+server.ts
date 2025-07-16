import { json } from '@sveltejs/kit';
import { ADMIN_KEY } from '$env/static/private';
import { db, shopItems } from '$lib/server/db';

export async function POST({ request }) {
	if (request.headers.get('Authorization') !== `Bearer ${ADMIN_KEY}`) {
		return json(
			{
				error: 'Pass in an Authorization header.'
			},
			{ status: 401 }
		);
	}

	try {
		const items = await request.json();

		if (!Array.isArray(items)) {
			return json(
				{
					error: 'Expected an array of shop items'
				},
				{ status: 400 }
			);
		}

		const results = await db
			.insert(shopItems)
			.values(items)
			.onConflictDoUpdate({
				target: shopItems.id,
				set: {
					name: shopItems.name,
					description: shopItems.description,
					imageUrl: shopItems.imageUrl,
					price: shopItems.price,
					type: shopItems.type,
					hcbMids: shopItems.hcbMids
				}
			})
			.returning();

		return json({
			success: true,
			message: `Successfully processed ${results.length} items`,
			data: results
		});
	} catch (error) {
		console.error('Error processing shop items:', error);
		return json(
			{
				error: 'Failed to process shop items',
				details: String(error)
			},
			{ status: 500 }
		);
	}
}
