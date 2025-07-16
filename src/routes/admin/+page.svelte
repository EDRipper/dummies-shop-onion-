<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { items } = data;
</script>

<div class="mx-auto max-w-6xl space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">Admin Dashboard</h1>
		<div class="flex space-x-3">
			<a href="/admin/users" class="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700">
				View Users
			</a>
			<a href="/admin/orders" class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700">
				View Orders
			</a>
			<a href="/admin/new" class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
				Add New Item
			</a>
		</div>
	</div>

	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each items as item}
			<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				<img src={item.imageUrl} alt={item.name} class="mb-4 h-48 w-full rounded-md object-cover" />
				<h3 class="text-lg font-semibold">{item.name}</h3>
				<p class="mt-2 text-sm text-gray-600">{item.description}</p>
				<div class="mt-4 flex items-center justify-between">
					<span class="text-lg font-bold">{item.price} tokens</span>
					<span class="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
						{item.type}
					</span>
				</div>
				{#if item.hcbMids && item.hcbMids.length > 0}
					<p class="mt-2 text-xs text-gray-500">
						MIDs: {item.hcbMids.join(', ')}
					</p>
				{/if}
			</div>
		{/each}
	</div>

	{#if items.length === 0}
		<div class="py-12 text-center">
			<p class="text-gray-500">No items created yet.</p>
			<a
				href="/admin/new"
				class="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
			>
				Create Your First Item
			</a>
		</div>
	{/if}
</div>
