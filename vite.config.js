import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    // GitHub Pages 部署路径: https://username.github.io/repo-name/
    base: mode === 'production' ? '/h5-game-platform/' : '/',
    server: {
        port: 3000,
        open: true,
        host: true, // 局域网可访问，方便手机调试
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
}));
