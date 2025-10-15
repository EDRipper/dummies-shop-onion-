	<script lang="ts">
		import { onMount } from 'svelte';

		let container: HTMLDivElement | null = null;
		let rect = { left: 0, top: 0, width: 0, height: 0 };
		let mouse = { x: 0, y: 0 };
		let raf: number | null = null;

		const eyePositions = [
			{ rx: 0.35	, ry: 0.39 },//left eye
			{ rx: 0.55, ry: 0.37 }//right eye
		];

		const pupils: { x: number; y: number }[] = [ { x: 0, y: 0 }, { x: 0, y: 0 } ];
		// Lol the "easter egg" has to stay
		let clicks = 0;
		let timeout: ReturnType<typeof setTimeout>;
		function dummyclicks() {
			clicks++;
			clearTimeout(timeout);
			timeout = setTimeout(() => {
				clicks = 0;
			}, 2000);

			if (clicks >= 7) {
				clicks = 0;
				window.open("https://www.youtube.com/watch?v=xvFZjo5PgG0&list=RDxvFZjo5PgG0&start_radio=1", "_blank");
			}
		}
		function updateRect() {
			if (!container) return;
			rect = container.getBoundingClientRect();
		}

		function handleMove(e: MouseEvent | TouchEvent) {
			const clientX = 'touches' in e && e.touches.length ? e.touches[0].clientX : (e as MouseEvent).clientX;
			const clientY = 'touches' in e && e.touches.length ? e.touches[0].clientY : (e as MouseEvent).clientY;
			mouse.x = clientX;
			mouse.y = clientY;
			if (!raf) raf = requestAnimationFrame(render) as unknown as number;
		}

		function render() {
			raf = null;
			const screenWidth = window.innerWidth || document.documentElement.clientWidth;
			const maxOffsetRatio = 0.12;
			const maxOffset = Math.max(6, rect.width * maxOffsetRatio);

			for (let i = 0; i < eyePositions.length; i++) {
				const ex = rect.left + eyePositions[i].rx * rect.width;
				const ey = rect.top + eyePositions[i].ry * rect.height;
				const dx = mouse.x - ex;
				const dy = mouse.y - ey;
				const distance = Math.sqrt(dx * dx + dy * dy);
				const angle = Math.atan2(dy, dx);
				const normalized = Math.min(distance / screenWidth, 1);
				const offset = normalized * maxOffset;
				pupils[i].x = Math.cos(angle) * offset;
				pupils[i].y = Math.sin(angle) * offset;
			}
		}

		function handleMouseOut() {
			pupils[0].x = pupils[0].y = 0;
			pupils[1].x = pupils[1].y = 0;
		}

		onMount(() => {
			updateRect();
			window.addEventListener('resize', updateRect);
			window.addEventListener('mousemove', handleMove);
			window.addEventListener('touchmove', handleMove, { passive: true });
			window.addEventListener('mouseout', handleMouseOut);

			return () => {
				window.removeEventListener('resize', updateRect);
				window.removeEventListener('mousemove', handleMove);
				window.removeEventListener('touchmove', handleMove as any);
				window.removeEventListener('mouseout', handleMouseOut);
				if (raf) cancelAnimationFrame(raf as number);
			};
		});
	</script>

	<style>
		/* Fallback font that should load faster*/
		@import url('https://fonts.googleapis.com/css2?family=Bungee:wght@700&display=swap');

		@font-face {
			font-family: 'Oi';
			src: url('/fonts/Oi-Regular.woff2') format('woff2'),
				url('/fonts/Oi-Regular.woff') format('woff'),
				url('/fonts/Oi-Regular.ttf') format('truetype');
			font-weight: 700;
			font-style: normal;
			font-display: swap;
		}
		.center { display:flex; align-items:center; justify-content:center; min-height:80vh; flex-direction:column; gap:1rem }
		.mascot { position:relative; max-width:480px; width:70vw; touch-action: none; }
		.mascot img { display:block; width:100%; height:auto; user-select:none; -webkit-user-drag: none; }
		.eye { position:absolute; width:calc(16%); aspect-ratio:1/1; background:white; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow: 0 1px 0 rgba(0,0,0,0.12) inset; overflow:visible; transform-origin:center }
		.pupil { width:55%; height:55%; background:#111; border-radius:50%; transform: translate(0px, 0px); transition: transform 60ms linear; will-change: transform }

		/* textbox styles */
		.textbox-wrap { width:70vw; max-width:480px; margin-top:0; display:flex; flex-direction:column; gap:0.4rem; align-items:stretch }
		.textbox { width:100%; padding:0.75rem 0.9rem; border-radius:10px; border:1px solid rgba(0,0,0,0.08); box-shadow: 0 6px 18px rgba(0,0,0,0.06); font-size:1rem; resize:vertical; background: linear-gradient(180deg, #fffefc, #fffdf9) }
		.textbox:focus { outline:none; box-shadow: 0 6px 20px rgba(74,21,75,0.12); border-color: rgba(74,21,75,0.12) }
		.hint { font-size:0.85rem; color: #666; }

		.btn { padding:0.6rem 1rem; border-radius:6px; background:#4A154B; color:white; text-decoration:none }

		/* header/title */
		.header-wrap { width:70vw; max-width:480px; display:flex; justify-content:center; margin-bottom:0.4rem }	
		.title-h1 { text-align:center }
		.dummies-title { font-size:3.5rem; color: #f59e0b; background:transparent; border:0; padding:0; cursor:default; font-weight:700; letter-spacing: 0.04em; line-height:0.9 }
		@media (min-width: 640px) { .dummies-title { font-size:6rem } }
		@media (min-width: 768px) { .dummies-title { font-size:8rem } }
		.dummies-title { font-family: 'Oi', 'Bungee', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial }
	</style>

	<div class="center">
		<div class="header-wrap">
			<div class="relative flex items-center justify-center">
				<h1 class="title-h1">
					<button type="button" on:click={dummyclicks} class="dummies-title">DUMMIES</button>
				</h1>
			</div>
		</div>

		<div bind:this={container} class="mascot" aria-hidden="false">
			<img src="https://hc-cdn.hel1.your-objectstorage.com/s/v3/70ed327e64e4e3a418c7ee8e75e28d2b8c675804_image.png" alt="The Dummies mascot" />

			{#each eyePositions as pos, i}
				{#if i === 0}
					<div class="eye" style="left:{pos.rx * 100}%; top:{pos.ry * 100}%; transform: translate(-50%, -50%) rotate(-8deg);">
						<div class="pupil" style="transform: translate({pupils[i].x}px, {pupils[i].y}px);"></div>
					</div>
				{:else}
					<div class="eye" style="left:{pos.rx * 100}%; top:{pos.ry * 100}%; transform: translate(-50%, -50%) rotate(-4deg);">
						<div class="pupil" style="transform: translate({pupils[i].x}px, {pupils[i].y}px);"></div>
					</div>
				{/if}
			{/each}
		</div>

		<div class="textbox-wrap">
			<p class="textbox static">Dummies YSWS is back for v2! <br> Learn a new programming skill and get new equipment for learning irl! Pick up a new framework or language and earn yourself a github notebook, laptop stickers, pen sets etc. Now featuring a shop, and accounts (sign in with slack ⬇️)</p>
			
		</div>

		<a class="btn" href="/api/authorize">Sign in with Slack</a>
		<div class="hint">Made with ❤️ by hack clubbers</div> 	
	</div>

