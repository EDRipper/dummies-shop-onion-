<script lang="ts">
	import '@fontsource-variable/fraunces';
	import '../app.css';

	let { children } = $props();
</script>

<main class="w-full px-4 pt-12 pb-3">
	{@render children()}
</main>
