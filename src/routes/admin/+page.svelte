<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { items } = data;
</script>

<div class="flex flex-col gap-10">
	<section class="boba-panel flex flex-wrap items-center justify-between gap-6 animate-bubble">
		<div class="space-y-2">
			<h1 class="text-3xl font-semibold text-stone-900">Admin Dashboard</h1>
			<p class="text-base text-stone-600">right, let&apos;s do this thing!</p>
			<div class="flex flex-wrap gap-2">
				<span class="boba-badge text-xs uppercase tracking-[0.16em]">Live inventory</span>
				<span class="boba-badge text-xs uppercase tracking-[0.16em]">Instant updates</span>
			</div>
		</div>
		<div class="flex flex-wrap items-center gap-3">
			<a href="/admin/users" class="boba-action motion-pop text-sm md:text-base">View Users</a>
			<a href="/admin/orders" class="boba-action motion-pop text-sm md:text-base">View Orders</a>
			<a href="/admin/new" class="boba-action motion-pop text-sm md:text-base">Add New Item</a>
		</div>
	</section>

	<div class="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
		{#each items as item, index}
			<div
				class="boba-panel-tight animate-bubble motion-pop flex h-full flex-col gap-4 sm:gap-5"
				style:animation-delay={`${index * 0.08}s`}
			>
				<div class="relative overflow-hidden rounded-2xl bg-[#f8e2c1] p-4 shadow-[0_12px_26px_rgba(65,35,20,0.13)]">
					<div class="absolute inset-x-6 -top-6 h-12 rounded-full bg-[#f1c696] opacity-40"></div>
					<img
						src={item.imageUrl}
						alt={item.name}
						class="relative z-10 h-40 w-full rounded-xl object-cover shadow-[0_14px_24px_rgba(65,35,20,0.18)]"
					/>
				</div>
				<div class="flex flex-col gap-2">
					<h3 class="text-xl font-semibold text-stone-900">{item.name}</h3>
					<p class="text-sm leading-relaxed text-stone-600">{item.description}</p>
				</div>
				<div class="flex items-center justify-between">
					<span class="boba-chip text-base">
						<span class="text-lg font-bold">{item.price}</span>
						<span>{item.price === 1 ? 'token' : 'tokens'}</span>
					</span>
					<span class="boba-badge text-xs uppercase tracking-[0.14em]">{item.type}</span>
				</div>
				{#if item.hcbMids && item.hcbMids.length > 0}
					<div class="rounded-2xl bg-[rgba(242,214,172,0.4)] px-4 py-2 text-xs font-medium text-stone-600">
						MIDs: {item.hcbMids.join(', ')}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	{#if items.length === 0}
		<div class="boba-panel text-center animate-bubble">
			<p class="text-stone-600">No items created yet.</p>
			<a href="/admin/new" class="boba-action motion-pop mt-4 inline-flex text-base">
				Create Your First Item
			</a>
		</div>
	{/if}
</div>
