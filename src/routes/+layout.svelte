<script lang="ts">
	import '@fontsource-variable/fraunces';
	import '../app.css';
	import type { LayoutData } from './$types';
	import { Toaster } from 'svelte-sonner';

	let { children, data }: { children: any; data: LayoutData } = $props();
</script>

<div class="w-full">
	{#if data.user}
		<nav class="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
			<div class="flex items-center justify-between">
				<a href="/" class="text-xl font-bold text-gray-900">Emporium</a>
				<div class="flex items-center gap-4">
					<div class="flex items-center gap-3">
						<div class="relative">
							<img
								src={data.user.avatarUrl}
								alt="Profile"
								class="h-8 w-8 rounded-full object-cover"
							/>
							{#if data.user.isAdmin}
								<div
									class="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-xs"
								>
									⚡
								</div>
							{/if}
						</div>
						<div class="text-sm">
							<div class="font-medium text-gray-900">
								{data.user.tokens}
								{data.user.tokens === 1 ? 'token' : 'tokens'}
							</div>
						</div>
					</div>
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
