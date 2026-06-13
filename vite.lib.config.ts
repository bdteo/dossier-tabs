import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    vue(),
    dts({
      entryRoot: 'src/components/dossier-tabs',
      include: ['src/components/dossier-tabs'],
      insertTypesEntry: true,
      tsconfigPath: './tsconfig.lib.json',
    }),
  ],
  build: {
    cssCodeSplit: false,
    lib: {
      entry: 'src/components/dossier-tabs/index.ts',
      name: 'DossierTabs',
      fileName: 'dossier-tabs',
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
});
