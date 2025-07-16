<script lang="ts">
	import type { ShopItem } from '$lib/server/db/schema';
	interface Props {
		item: ShopItem;
	}
	const { item }: Props = $props();

	let isOrdering = $state(false);
	let orderMessage = $state('');

	async function handleBuy() {
		if (isOrdering) return;

		isOrdering = true;
		orderMessage = '';

		try {
			const response = await fetch('/api/order', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ shopItemId: item.id })
			});

			const result = await response.json();

			if (response.ok) {
				orderMessage = result.message || 'Order placed successfully!';
			} else {
				orderMessage = result.error || 'Failed to place order';
			}
		} catch (error) {
			orderMessage = 'Network error. Please try again.';
		} finally {
			isOrdering = false;
		}
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-xs transition hover:shadow-md">
	<img src={item.imageUrl} alt={item.name} class="mb-4 h-48 w-full rounded-md object-cover" />
	<h3 class="text-lg font-semibold">{item.name}</h3>
	<p class="mt-1 text-sm text-gray-600">{item.description}</p>
	<div class="mt-4 flex items-center justify-between">
		<span class="text-lg font-bold">{item.price} tokens</span>
		<button
			onclick={handleBuy}
			disabled={isOrdering}
			class="rounded-full bg-blue-600 px-8 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
		>
			{isOrdering ? 'Ordering...' : 'Buy'}
		</button>
	</div>
	{#if orderMessage}
		<div
			class="mt-2 text-sm {orderMessage.includes('success') ? 'text-green-600' : 'text-red-600'}"
		>
			{orderMessage}
		</div>
	{/if}
</div>
