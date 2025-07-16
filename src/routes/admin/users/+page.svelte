<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { users, orders } = data;

	// Group orders by user
	const ordersByUser = orders.reduce(
		(acc, order) => {
			if (!acc[order.userId]) {
				acc[order.userId] = [];
			}
			acc[order.userId].push(order);
			return acc;
		},
		{} as Record<string, typeof orders>
	);

	let selectedUser = $state<string | null>(null);
</script>

<div class="mx-auto max-w-7xl space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold">User Management</h1>
		<a href="/admin" class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
			Back to Admin
		</a>
	</div>

	<!-- Users Overview -->
	<div class="rounded-lg bg-white shadow">
		<div class="border-b border-gray-200 px-6 py-4">
			<h2 class="text-xl font-semibold">Users & Tokens</h2>
		</div>
		<div class="p-6">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								User
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Tokens
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Admin
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Orders
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Actions
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each users as user}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="flex items-center">
										<img src={user.avatarUrl} alt="Avatar" class="h-10 w-10 rounded-full" />
										<div class="ml-4">
											<div class="text-sm font-medium text-gray-900">{user.slackId}</div>
										</div>
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
									>
										{user.tokens} tokens
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									{#if user.isAdmin}
										<span
											class="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800"
										>
											Admin
										</span>
									{:else}
										<span class="text-sm text-gray-500">User</span>
									{/if}
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
									{ordersByUser[user.slackId]?.length || 0} orders
								</td>
								<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
									<button
										onclick={() =>
											(selectedUser = selectedUser === user.slackId ? null : user.slackId)}
										class="text-indigo-600 hover:text-indigo-900"
									>
										{selectedUser === user.slackId ? 'Hide' : 'View'} Orders
									</button>
								</td>
							</tr>
							{#if selectedUser === user.slackId && ordersByUser[user.slackId]}
								<tr>
									<td colspan="5" class="bg-gray-50 px-6 py-4">
										<div class="space-y-2">
											<h4 class="font-medium text-gray-900">Order History</h4>
											<div class="space-y-2">
												{#each ordersByUser[user.slackId] as order}
													<div
														class="flex items-center justify-between rounded border bg-white p-3"
													>
														<div class="flex items-center space-x-4">
															<span class="text-sm font-medium">{order.itemName}</span>
															<span class="text-xs text-gray-500">{order.itemType}</span>
															<span class="text-sm text-gray-600">{order.priceAtOrder} tokens</span>
														</div>
														<div class="flex items-center space-x-2">
															<span
																class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
																{order.status === 'fulfilled'
																	? 'bg-green-100 text-green-800'
																	: order.status === 'rejected'
																		? 'bg-red-100 text-red-800'
																		: 'bg-yellow-100 text-yellow-800'}"
															>
																{order.status}
															</span>
															<span class="text-xs text-gray-500">
																{new Date(order.createdAt).toLocaleDateString()}
															</span>
														</div>
													</div>
												{/each}
											</div>
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<!-- Summary Stats -->
	<div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
		<div class="overflow-hidden rounded-lg bg-white shadow">
			<div class="p-5">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500 text-white"
						>
							👥
						</div>
					</div>
					<div class="ml-5 w-0 flex-1">
						<dl>
							<dt class="truncate text-sm font-medium text-gray-500">Total Users</dt>
							<dd class="text-lg font-medium text-gray-900">{users.length}</dd>
						</dl>
					</div>
				</div>
			</div>
		</div>

		<div class="overflow-hidden rounded-lg bg-white shadow">
			<div class="p-5">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-md bg-green-500 text-white"
						>
							🪙
						</div>
					</div>
					<div class="ml-5 w-0 flex-1">
						<dl>
							<dt class="truncate text-sm font-medium text-gray-500">Total Tokens</dt>
							<dd class="text-lg font-medium text-gray-900">
								{users.reduce((sum, user) => sum + Number(user.tokens), 0)}
							</dd>
						</dl>
					</div>
				</div>
			</div>
		</div>

		<div class="overflow-hidden rounded-lg bg-white shadow">
			<div class="p-5">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<div
							class="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500 text-white"
						>
							📦
						</div>
					</div>
					<div class="ml-5 w-0 flex-1">
						<dl>
							<dt class="truncate text-sm font-medium text-gray-500">Total Orders</dt>
							<dd class="text-lg font-medium text-gray-900">{orders.length}</dd>
						</dl>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
