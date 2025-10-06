<script lang="ts">
	import '@fontsource-variable/outfit';
	import '../app.css';
	import type { LayoutData } from './$types';
	import { Toaster } from 'svelte-sonner';

	let { children, data }: { children: any; data: LayoutData } = $props();
</script>

<div class="w-full">
	{#if data.user}
		<nav class="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
			<div class="flex items-center justify-between">
				<a href="/" class="text-xl font-semibold text-gray-900">Boba Olympics Shop</a>
				<div class="flex items-center gap-4">
					<div class="flex items-center gap-3">
						<div class="relative group">
							<img
								src={data.user.avatarUrl}
								alt="Profile"
								class="h-8 w-8 rounded-full object-cover ring-2 ring-transparent transition-all duration-200"
								class:ring-amber-400={data.user.isAdmin}
							/>
							{#if data.user.isAdmin}
								<div
									class="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-xs shadow-lg border-2 border-white transition-transform duration-200 group-hover:scale-110"
									title="Administrator"
								>
									<span class="text-white font-bold">★</span>
								</div>
							{/if}
						</div>
						<div class="text-sm">
							<div class="font-medium text-gray-900">
								{data.user.tokens}
								{data.user.tokens === 1 ? 'token' : 'tokens'}
							</div>
							{#if data.user.isAdmin}
								<div class="text-xs text-amber-600 font-medium">Admin</div>
							{/if}
						</div>
					</div>
					<a href="/orders" class="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200">
						Orders
					</a>
					{#if data.user.isAdmin}
						<a
							href="/admin"
							class="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
						>
							Admin
						</a>
					{/if}
				</div>
			</div>
		</nav>
	{/if}
	<main class="w-full px-4 py-6">
		{@render children()}
		<Toaster />
	</main>
</div>
