import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    
    return {
        plugins: [tailwindcss(), sveltekit()],
        server: {
            port: 36889,
            host: '0.0.0.0', // Listen on all interfaces for Nest
            allowedHosts: [
                'localhost',
                '127.0.0.1',
                'dummies.peleg2210.hackclub.app'
            ]
        }
    };
});