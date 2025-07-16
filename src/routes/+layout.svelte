<script lang="ts">
	import '@fontsource-variable/fraunces';
	import '../app.css';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();
</script>

<div class="w-full">
	{#if data.user?.isAdmin}
		<nav class="border-b border-gray-200 bg-white px-4 py-2">
			<div class="flex items-center justify-between">
				<a href="/" class="text-lg font-semibold text-gray-900">Emporium</a>
				<a href="/admin" class="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">
					Admin
				</a>
			</div>
		</nav>
	{/if}
	<main class="w-full px-4 pt-12 pb-3">
		{@render children()}
	</main>
</div>
