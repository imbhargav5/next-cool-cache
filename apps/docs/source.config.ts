import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

export const docs: ReturnType<typeof defineDocs> = defineDocs({
  dir: 'content/docs',
});

export default defineConfig();
