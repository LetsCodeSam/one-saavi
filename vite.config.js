import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    base: '/one-saavi/',
    assetsInclude: ['**/*.wasm'], // allow bundling wasm
    worker: { format: 'es' },
    build: { target: 'es2022' }
});
