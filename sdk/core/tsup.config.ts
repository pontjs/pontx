import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'url/index': 'src/url/index.ts',
    'body/index': 'src/request-body/index.ts',
    'types/index': 'src/types/index.ts',
    'features/index': 'src/features/index.ts',
    'builders/index': 'src/builders/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  target: 'es2020',
  outDir: 'lib',
});
