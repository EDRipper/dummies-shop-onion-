<script lang="ts">
	import type { ShopItem } from '$lib/server/db/schema';
	import confetti from 'canvas-confetti';
	import { invalidateAll } from '$app/navigation';

	interface Props {
		item: ShopItem;
		userTokens: number;
	}
	const { item, userTokens }: Props = $props();

	let isOrdering = $state(false);
	let orderMessage = $state('');

	const canAfford = $derived(userTokens >= item.price);

	async function handleBuy() {
		if (isOrdering || !canAfford) return;

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
				// Trigger confetti effect
				confetti({
					particleCount: 100,
					spread: 70,
					origin: { y: 0.6 }
				});
				// Refresh data to update token count
				window.location.reload();
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

<div
	class="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-xs transition hover:shadow-md"
>
	<img src={item.imageUrl} alt={item.name} class="mb-4 h-48 w-full rounded-md object-cover" />
	<h3 class="text-lg font-semibold">{item.name}</h3>
	<p class="mt-1 flex-1 text-sm text-gray-600">{item.description}</p>
	<div class="mt-4 flex items-center justify-between">
		<span class="text-lg font-bold">{item.price} tokens</span>
		<button
			onclick={handleBuy}
			disabled={isOrdering || !canAfford}
			class="rounded-full px-8 py-2 text-white transition-colors disabled:cursor-not-allowed {canAfford &&
			!isOrdering
				? 'bg-blue-600 hover:bg-blue-700'
				: 'bg-gray-400'}"
		>
			{isOrdering ? 'Ordering...' : !canAfford ? 'Not enough tokens' : 'Buy'}
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
