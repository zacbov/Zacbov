import { defineConfig } from 'vite';
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist-lib', emptyOutDir: true, target: 'es2020', minify: false,
    lib: { entry: 'src/relax.ts', formats: ['es'], fileName: () => 'oiseaux.js' },
    rollupOptions: { external: (id) => id === 'three' || id.startsWith('three/') },
  },
});
