<script lang="ts">
	import type { PageProps } from './$types';
	import ItemCard from '$lib/components/shop/item-card.svelte';

	let { data }: PageProps = $props();
	const { user, items } = data;
</script>

<div class="flex flex-col gap-10">
	<section class="boba-panel text-center animate-bubble">
		<div class="mx-auto flex max-w-3xl flex-col gap-1">
			<h1 class="text-3xl font-semibold animate-floaty">welcome to the store!</h1>
			<p class="boba-subtitle">
				you have {user.tokens == 0 ? 'no' : user.tokens}
				{user.tokens === 1 ? 'token' : 'tokens'} to spend.
			</p>
		</div>
	</section>

	<ul class="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
		{#each items as item, index}
			<ItemCard {item} userTokens={user.tokens} appearanceDelay={index * 0.09} />
		{/each}
	</ul>
</div>
