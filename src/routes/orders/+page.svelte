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
				return 'bg-[#f7d8a7] text-[#7a4b21]';
			case 'fulfilled':
				return 'bg-[#d5f5d4] text-[#2f7d43]';
			case 'rejected':
				return 'bg-[#f6c4c0] text-[#963135]';
			default:
				return 'bg-[#ead2b2] text-[#5b3522]';
		}
	}
</script>

<div class="flex flex-col gap-10">
	<section class="boba-panel animate-bubble">
		<div class="flex flex-col gap-2">
			<h1 class="text-3xl font-semibold text-stone-900">Ordered items</h1>
			<p class="text-base text-stone-600">View your items currently ordered</p>
		</div>
	</section>

	<section class="boba-panel-tight animate-bubble">
		{#if orders.length === 0}
			<div class="flex flex-col items-center gap-3 py-10">
				<div class="text-6xl">📦</div>
				<h3 class="text-xl font-semibold text-stone-900">No orders yet</h3>
				<p class="text-sm text-stone-600">Orders will appear here once items are purchased!</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-[#ead2b2]">
					<thead class="bg-[rgba(242,214,172,0.35)] text-left uppercase tracking-wide text-xs text-stone-600">
						<tr>
							<th class="px-6 py-3">Order</th>
							<th class="px-6 py-3">Item</th>
							<th class="px-6 py-3">Price</th>
							<th class="px-6 py-3">Status</th>
							<th class="px-6 py-3">Date</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[#ead2b2]">
						{#each orders as order}
							<tr class="transition hover:bg-[rgba(244,213,178,0.4)]">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-semibold text-stone-900">
										#{order.id.slice(-8)}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center gap-3">
										<div class="h-12 w-12 overflow-hidden rounded-xl bg-[#f8e2c1]">
											<img
												src={order.itemImageUrl}
												alt={order.itemName}
												class="h-full w-full object-cover"
											/>
										</div>
										<div class="text-sm font-medium text-stone-800">
											{order.itemName}
										</div>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="boba-chip text-xs sm:text-sm">
										<span class="text-base font-bold">{order.priceAtOrder}</span>
										<span>tokens</span>
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex rounded-full px-3 py-1 text-xs font-semibold {getStatusColor(
											order.status
										)}"
									>
										{order.status}
									</span>
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-stone-600">
									{formatDate(order.createdAt)}
								</td>
							</tr>
							{#if order.memo}
								<tr class="bg-[rgba(244,213,178,0.35)]">
									<td colspan="5" class="px-6 py-3">
										<div class="text-sm text-stone-600 italic">
											<span class="font-medium text-stone-700">Note:</span> {order.memo}
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<section class="grid grid-cols-1 gap-6 md:grid-cols-3">
		<div class="boba-panel-tight flex items-center gap-4 animate-bubble" style:animation-delay="0.05s">
			<div class="text-3xl">📦</div>
			<div>
				<div class="text-2xl font-semibold text-stone-900">
					{orders.filter((o) => o.status === 'pending').length}
				</div>
				<div class="text-sm text-stone-600">Pending Orders</div>
			</div>
		</div>
		<div class="boba-panel-tight flex items-center gap-4 animate-bubble" style:animation-delay="0.1s">
			<div class="text-3xl">✅</div>
			<div>
				<div class="text-2xl font-semibold text-emerald-600">
					{orders.filter((o) => o.status === 'fulfilled').length}
				</div>
				<div class="text-sm text-stone-600">Fulfilled Orders</div>
			</div>
		</div>
		<div class="boba-panel-tight flex items-center gap-4 animate-bubble" style:animation-delay="0.15s">
			<div class="text-3xl">❌</div>
			<div>
				<div class="text-2xl font-semibold text-rose-600">
					{orders.filter((o) => o.status === 'rejected').length}
				</div>
				<div class="text-sm text-stone-600">Rejected Orders</div>
			</div>
		</div>
	</section>
</div>
