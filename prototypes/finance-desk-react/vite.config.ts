import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const localServer = { host: '127.0.0.1', port: 4174, strictPort: true };

export default defineConfig({ plugins: [react()], server: localServer, preview: localServer });
