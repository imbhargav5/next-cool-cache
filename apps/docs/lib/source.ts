import { docs } from '@/.source/server';
import { loader } from 'fumadocs-core/source';

export const source = loader({
  baseUrl: '/docs',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fumadocs-mdx generated types have pnpm resolution issues
  source: (docs as any).toFumadocsSource(),
});
