import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
export default defineConfig(({ command }) => ({
    base: command === 'build' ? '/uniswap-v3-workshop/' : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@uniswap': resolve(__dirname, '../src'),
        },
    },
}));
