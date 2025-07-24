<script lang="ts">
	import type { PageProps } from './$types';
	import ItemCard from '$lib/components/shop/item-card.svelte';

	let { data }: PageProps = $props();
	const { user, items } = data;
</script>

<div class="mx-auto text-center">
	<h1 class="text-4xl font-bold">Welcome to the Emporium</h1>
	<p class="text-2xl">
		You have {user.tokens == 0 ? 'no' : user.tokens}
		{user.tokens === 1 ? 'token' : 'tokens'}.
	</p>
	<h2>Shop closed temporarily.</h2>
	<p>We have to fix some issues. We'll let everyone know when we reopen!</p>
</div>
