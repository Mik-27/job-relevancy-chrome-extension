import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        // Define the entry points for your extension
        // popup: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'src/background.ts'),
        // modal: resolve(__dirname, 'src/modal.tsx'), 
        overlay: resolve(__dirname, 'src/overlay.tsx'),
        content: resolve(__dirname, 'src/content.ts'),
      },
      output: {
        // Configure the output file names
        entryFileNames: `src/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
    // Set the output directory to 'dist'
    outDir: 'dist',
  },
})