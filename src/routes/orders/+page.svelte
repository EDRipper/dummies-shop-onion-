<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { orders } = data;

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'pending':
				return 'bg-yellow-100 text-yellow-800';
			case 'fulfilled':
				return 'bg-green-100 text-green-800';
			case 'rejected':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}
</script>

<div class="mx-auto max-w-6xl space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Ordered items</h1>
			<p class="mt-1 text-gray-600">View your items currently ordered</p>
		</div>
	</div>

	<div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
		{#if orders.length === 0}
			<div class="py-12 text-center">
				<div class="mb-4 text-6xl text-gray-400">📦</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900">No orders yet</h3>
				<p class="text-gray-500">Orders will appear here once items are purchased!</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Order
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Item
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Price
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Status
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Date
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Notes
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each orders as order}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">
										#{order.id.slice(-8)}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center">
										<img
											src={order.itemImageUrl}
											alt={order.itemName}
											class="mr-3 h-10 w-10 rounded-md object-cover"
										/>
										<div class="text-sm text-gray-900">
											{order.itemName}
										</div>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">
										{order.priceAtOrder} tokens
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex rounded-full px-2 py-1 text-xs font-semibold {getStatusColor(
											order.status
										)}"
									>
										{order.status}
									</span>
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
									{formatDate(order.createdAt)}
								</td>
								<td class="px-6 py-4 text-sm text-gray-500">
									{#if order.memo}
										<div class="max-w-xs">
											<div class="text-xs text-gray-600 italic" title={order.memo}>
												{order.memo}
											</div>
										</div>
									{:else}
										<span class="text-xs text-gray-400">—</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			<div class="flex items-center">
				<div class="text-2xl">📦</div>
				<div class="ml-4">
					<div class="text-2xl font-bold text-gray-900">
						{orders.filter((o) => o.status === 'pending').length}
					</div>
					<div class="text-sm text-gray-500">Pending Orders</div>
				</div>
			</div>
		</div>

		<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			<div class="flex items-center">
				<div class="text-2xl">✅</div>
				<div class="ml-4">
					<div class="text-2xl font-bold text-green-600">
						{orders.filter((o) => o.status === 'fulfilled').length}
					</div>
					<div class="text-sm text-gray-500">Fulfilled Orders</div>
				</div>
			</div>
		</div>

		<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			<div class="flex items-center">
				<div class="text-2xl">❌</div>
				<div class="ml-4">
					<div class="text-2xl font-bold text-red-600">
						{orders.filter((o) => o.status === 'rejected').length}
					</div>
					<div class="text-sm text-gray-500">Rejected Orders</div>
				</div>
			</div>
		</div>
	</div>
</div>
