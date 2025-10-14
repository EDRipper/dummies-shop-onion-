<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';

	let { form, data }: { form: any; data: any } = $props();

	// State for SQL execution
	let sqlQuery = $state('');
	let queryResult = $state<any>(null);
	let isExecuting = $state(false);

	// State for user management
	let selectedUserId = $state('');
	let isUpdatingUser = $state(false);

	// State for item management
	let selectedItemId = $state('');
	let isUpdatingItem = $state(false);

	// State for backup/restore
	let isBackingUp = $state(false);
	let isRestoring = $state(false);

	$effect(() => {
		if (form?.success) {
			toast.success(form.message || 'Operation completed successfully!', {
				duration: 3000,
			});
		}
		if (form?.error) {
			toast.error(`Error: ${form.error}`, {
				duration: 5000,
			});
		}
		if (form?.queryResult) {
			queryResult = form.queryResult;
		}
	});

	// Preset SQL queries
	const presetQueries = [
		{
			name: 'View All Users',
			query: 'SELECT "slackId", "displayName", "isAdmin", "country", "yswsDbFulfilled" FROM "user" ORDER BY "displayName";'
		},
		{
			name: 'View All Orders',
			query: 'SELECT o.id, o."userId", o.status, o."priceAtOrder", o."createdAt", i.name as "itemName" FROM shop_orders o LEFT JOIN shop_items i ON o."shopItemId" = i.id ORDER BY o."createdAt" DESC LIMIT 20;'
		},
		{
			name: 'View All Items',
			query: 'SELECT * FROM shop_items ORDER BY name;'
		},
		{
			name: 'User Token Summary',
			query: 'SELECT "slackId", "displayName", tokens FROM users_with_tokens ORDER BY tokens DESC;'
		},
		{
			name: 'Payouts Summary',
			query: 'SELECT "userId", SUM(tokens) as total_tokens FROM payouts GROUP BY "userId" ORDER BY total_tokens DESC LIMIT 20;'
		},
		{
			name: 'Recent Activity',
			query: 'SELECT o.id, o."userId", o.status, o."createdAt", u."displayName", i.name FROM shop_orders o LEFT JOIN "user" u ON o."userId" = u."slackId" LEFT JOIN shop_items i ON o."shopItemId" = i.id ORDER BY o."createdAt" DESC LIMIT 10;'
		}
	];

	function setPresetQuery(query: string) {
		sqlQuery = query;
	}

	function clearQuery() {
		sqlQuery = '';
		queryResult = null;
	}

	function formatJsonResult(data: any): string {
		if (!data) return '';
		return JSON.stringify(data, null, 2);
	}
</script>

<div class="flex flex-col gap-8">
	<!-- Header -->
	<section class="boba-panel flex flex-wrap items-center justify-between gap-6 animate-bubble">
		<div class="space-y-2">
			<h1 class="text-3xl font-semibold text-stone-900">Database Management</h1>
			<p class="text-base text-stone-600">Full database control panel - use with caution!</p>
		</div>
		<div class="flex flex-wrap items-center gap-3">
			<a href="/admin" class="boba-action motion-pop text-sm md:text-base">Back to Admin</a>
		</div>
	</section>

	<!-- Quick Actions -->
	<section class="boba-panel animate-bubble" style:animation-delay="0.1s">
		<h2 class="text-xl font-semibold text-stone-900 mb-4">Quick Actions</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			<!-- User Management -->
			<form method="POST" action="?/manageUser" use:enhance class="space-y-3">
				<h3 class="font-medium text-stone-700">User Management</h3>
				<select name="userId" bind:value={selectedUserId} required class="w-full rounded border border-gray-300 px-3 py-2 text-sm">
					<option value="">Select User...</option>
					{#each data.users as user}
						<option value={user.slackId}>{user.displayName || user.slackId} ({user.isAdmin ? 'Admin' : 'User'})</option>
					{/each}
				</select>
				<div class="flex gap-2">
					<button type="submit" name="action" value="toggleAdmin" disabled={!selectedUserId || isUpdatingUser} 
						class="flex-1 rounded bg-blue-600 px-3 py-2 text-xs text-white hover:bg-blue-700 disabled:opacity-50">
						Toggle Admin
					</button>
					<button type="submit" name="action" value="deleteUser" disabled={!selectedUserId || isUpdatingUser}
						class="flex-1 rounded bg-red-600 px-3 py-2 text-xs text-white hover:bg-red-700 disabled:opacity-50">
						Delete User
					</button>
				</div>
			</form>

			<!-- Item Management -->
			<form method="POST" action="?/manageItem" use:enhance class="space-y-3">
				<h3 class="font-medium text-stone-700">Item Management</h3>
				<select name="itemId" bind:value={selectedItemId} required class="w-full rounded border border-gray-300 px-3 py-2 text-sm">
					<option value="">Select Item...</option>
					{#each data.items as item}
						<option value={item.id}>{item.name} - {item.price} tokens</option>
					{/each}
				</select>
				<div class="flex gap-2">
					<button type="submit" name="action" value="deleteItem" disabled={!selectedItemId || isUpdatingItem}
						class="flex-1 rounded bg-red-600 px-3 py-2 text-xs text-white hover:bg-red-700 disabled:opacity-50">
						Delete Item
					</button>
				</div>
			</form>

			<!-- Database Operations -->
			<div class="space-y-3">
				<h3 class="font-medium text-stone-700">Database Operations</h3>
				<form method="POST" action="?/backup" use:enhance class="space-y-2">
					<button type="submit" disabled={isBackingUp} 
						class="w-full rounded bg-green-600 px-3 py-2 text-xs text-white hover:bg-green-700 disabled:opacity-50">
						{isBackingUp ? 'Creating Backup...' : 'Create Backup'}
					</button>
				</form>
				<form method="POST" action="?/resetOrders" use:enhance>
					<button type="submit" onclick={(e) => { if (!confirm('This will delete ALL orders. Are you sure?')) e.preventDefault(); }}
						class="w-full rounded bg-orange-600 px-3 py-2 text-xs text-white hover:bg-orange-700">
						Reset All Orders
					</button>
				</form>
				<form method="POST" action="?/resetTokens" use:enhance>
					<button type="submit" onclick={(e) => { if (!confirm('This will reset ALL user tokens to 0. Are you sure?')) e.preventDefault(); }}
						class="w-full rounded bg-red-600 px-3 py-2 text-xs text-white hover:bg-red-700">
						Reset All Tokens
					</button>
				</form>
			</div>
		</div>
	</section>

	<!-- SQL Query Interface -->
	<section class="boba-panel animate-bubble" style:animation-delay="0.2s">
		<div class="flex flex-wrap items-center justify-between gap-4 mb-6">
			<h2 class="text-xl font-semibold text-stone-900">SQL Query Interface</h2>
			<div class="flex gap-2">
				<button onclick={() => clearQuery()} class="boba-action text-sm">Clear</button>
			</div>
		</div>

		<!-- Preset Queries -->
		<div class="mb-4">
			<span class="block text-sm font-medium text-stone-700 mb-2">Preset Queries:</span>
			<div class="flex flex-wrap gap-2">
				{#each presetQueries as preset}
					<button 
						onclick={() => setPresetQuery(preset.query)}
						class="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
					>
						{preset.name}
					</button>
				{/each}
			</div>
		</div>

		<!-- Query Input -->
		<form method="POST" action="?/executeQuery" use:enhance class="space-y-4">
			<div>
				<label for="query" class="block text-sm font-medium text-stone-700 mb-2">SQL Query:</label>
				<textarea
					name="query"
					bind:value={sqlQuery}
					placeholder="SELECT * FROM &quot;user&quot; LIMIT 10;"
					rows="6"
					class="w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					required
				></textarea>
			</div>
			
			<div class="flex gap-3">
				<button type="submit" disabled={!sqlQuery.trim() || isExecuting} 
					class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50">
					{isExecuting ? 'Executing...' : 'Execute Query'}
				</button>
				<div class="text-xs text-stone-500 flex items-center">
					⚠️ Be careful with UPDATE, DELETE, and DROP commands
				</div>
			</div>
		</form>

		<!-- Query Results -->
		{#if queryResult}
			<div class="mt-6 space-y-4">
				<h3 class="text-lg font-medium text-stone-800">Query Results:</h3>
				
				{#if queryResult.error}
					<div class="rounded bg-red-50 border border-red-200 p-4">
						<p class="text-red-800 font-medium">Error:</p>
						<pre class="text-red-700 text-sm mt-1">{queryResult.error}</pre>
					</div>
				{:else if queryResult.data}
					<div class="rounded bg-green-50 border border-green-200 p-4">
						<p class="text-green-800 font-medium mb-2">
							Success: {Array.isArray(queryResult.data) ? queryResult.data.length : 1} row(s) affected
						</p>
						
						{#if Array.isArray(queryResult.data) && queryResult.data.length > 0}
							<!-- Table view for SELECT results -->
							<div class="overflow-x-auto">
								<table class="min-w-full divide-y divide-gray-200">
									<thead class="bg-gray-50">
										<tr>
											{#each Object.keys(queryResult.data[0]) as column}
												<th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{column}</th>
											{/each}
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-200">
										{#each queryResult.data as row}
											<tr>
												{#each Object.values(row) as value}
													<td class="px-3 py-2 text-sm text-gray-900">
														{typeof value === 'object' ? JSON.stringify(value) : String(value)}
													</td>
												{/each}
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{:else}
							<!-- JSON view for other results -->
							<pre class="text-green-700 text-sm bg-white p-3 rounded border overflow-auto">{formatJsonResult(queryResult.data)}</pre>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</section>

	<!-- Database Schema Info -->
	<section class="boba-panel animate-bubble" style:animation-delay="0.3s">
		<h2 class="text-xl font-semibold text-stone-900 mb-4">Database Schema</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div>
				<h3 class="font-medium text-stone-700 mb-2">Tables:</h3>
				<ul class="space-y-1 text-sm text-stone-600">
					<li>• <code>user</code> - User accounts and admin status</li>
					<li>• <code>shop_items</code> - Items available in the shop</li>
					<li>• <code>shop_orders</code> - Order history</li>
					<li>• <code>payouts</code> - Token payouts to users</li>
				</ul>
			</div>
			<div>
				<h3 class="font-medium text-stone-700 mb-2">Views:</h3>
				<ul class="space-y-1 text-sm text-stone-600">
					<li>• <code>users_with_tokens</code> - Users with calculated token balances</li>
				</ul>
			</div>
		</div>
	</section>
</div>
