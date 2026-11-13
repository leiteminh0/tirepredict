import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Porta fixa de propósito. A origem que o navegador envia precisa bater com
    // a lista CORS_ORIGINS do backend: sem strictPort, o Vite sobe em 5174/5175
    // quando a 5173 está ocupada (bastam duas abas de terminal com `npm run dev`)
    // e toda chamada à API passa a ser bloqueada por CORS — a tela mostra
    // "não foi possível conectar" mesmo com o backend saudável.
    // Com strictPort ele falha na hora e o erro aparece onde deve aparecer.
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
})
