<script lang="ts">
	import type { ShopItem } from '$lib/server/db/schema';
	interface Props {
		item: ShopItem;
	}
	const { item }: Props = $props();
</script>

<div class="bg-card h-full rounded-md px-4 py-3 text-center shadow-xs transition hover:shadow-md">
	<p class="mb-2 text-xl font-bold">{item.name}</p>
	{item.description}
	<img
		class="mt-4 aspect-square h-auto max-h-48 w-full rounded-md object-scale-down"
		src={item.imageUrl}
		alt="Image for {item.name}"
	/>
</div>
