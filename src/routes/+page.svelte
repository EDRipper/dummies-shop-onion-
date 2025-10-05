<script lang="ts">
	import type { PageProps } from './$types';
	import ItemCard from '$lib/components/shop/item-card.svelte';

	let { data }: PageProps = $props();
	const { user, items } = data;
</script>

<div class="mx-auto text-center">
	<h1 class="text-4xl font-semibold">Welcome to the shop</h1>
	<p class="text-2xl">
		You have {user.tokens == 0 ? 'no' : user.tokens}
		{user.tokens === 1 ? 'token' : 'tokens'}.
	</p>
	<ul class="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each items as item}
			<ItemCard {item} userTokens={user.tokens} />
		{/each}
	</ul>
</div>
