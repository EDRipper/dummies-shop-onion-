<script lang="ts">
	import type { ShopItem } from '$lib/server/db/schema';
	interface Props {
		item: ShopItem;
	}
	const { item }: Props = $props();
</script>

<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
	<img src={item.imageUrl} alt={item.name} class="mb-4 h-48 w-full rounded-md object-cover" />
	<h3 class="text-lg font-semibold">{item.name}</h3>
	<p class="mt-1 text-sm text-gray-600">{item.description}</p>
	<div class="mt-4 flex items-center justify-between">
		<span class="text-lg font-bold">{item.price} tokens</span>
		<span class="rounded-full px-8 py-2 text-white"> Buy </span>
	</div>
</div>
