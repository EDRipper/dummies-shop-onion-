<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { ShopItem } from '$lib/server/db/schema';
	import confetti from 'canvas-confetti';

	interface Props {
		item: ShopItem;
		userTokens: number;
		appearanceDelay?: number;
	}
	const { item, userTokens, appearanceDelay = 0 }: Props = $props();

	let isOrdering = $state(false);
	let orderMessage = $state('');
	let availableTokens = $state(userTokens);
	const canAfford = $derived(availableTokens >= item.price);

	$effect(() => {
		availableTokens = userTokens;
	});

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
				availableTokens = result.remainingTokens ?? availableTokens - item.price;
				confetti({
					particleCount: 100,
					spread: 70,
					origin: { y: 0.6 }
				});
				await invalidateAll();
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
	class="boba-panel-tight motion-pop animate-bubble flex h-full flex-col gap-5 sm:gap-6"
	style:animation-delay={`${appearanceDelay}s`}
>
	<div class="relative overflow-hidden rounded-2xl bg-[#f9e4c5] p-4 shadow-[0_12px_24px_rgba(91,53,34,0.12)]">
		<div class="absolute -left-6 -top-6 h-16 w-16 rounded-full bg-[#f7c978] opacity-60"></div>
		<div class="absolute -right-4 top-8 h-12 w-12 rounded-full bg-[#f1b986] opacity-50"></div>
		<img
			src={item.imageUrl}
			alt={item.name}
			class="relative z-10 h-44 w-full rounded-xl object-cover shadow-[0_14px_24px_rgba(91,53,34,0.2)]"
		/>
	</div>
	<div class="flex flex-col gap-2">
		<h3 class="text-xl font-semibold text-stone-900">{item.name}</h3>
		<p class="flex-1 text-sm leading-relaxed text-stone-600">{item.description}</p>
	</div>
	<div class="flex items-center justify-between">
		<span class="boba-chip text-base">
			<span class="text-lg font-bold">{item.price}</span>
			<span>{item.price === 1 ? 'token' : 'tokens'}</span>
		</span>
		<button
			onclick={handleBuy}
			disabled={isOrdering || !canAfford}
			class="boba-action motion-pop text-sm sm:text-base"
		>
			{isOrdering ? 'Ordering...' : !canAfford ? 'Not enough tokens' : 'Buy'}
		</button>
	</div>
	{#if orderMessage}
		<div
			class="mt-2 text-sm {orderMessage.includes('success') ? 'text-emerald-600' : 'text-red-600'}"
		>
			{orderMessage}
		</div>
	{/if}
</div>
