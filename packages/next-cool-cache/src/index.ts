/**
 * next-cool-cache
 *
 * Type-safe cache tag management for Next.js 16.
 *
 * @example
 * ```ts
 * import { createCache } from 'next-cool-cache';
 *
 * const schema = {
 *   users: {
 *     list: {},
 *     byId: { _params: ['id'] as const },
 *   },
 * } as const;
 *
 * const scopes = ['admin', 'public'] as const;
 *
 * export const cache = createCache(schema, scopes);
 *
 * // In a cached function:
 * cache.admin.users.byId.cacheTag({ id: '123' });
 *
 * // In a server action:
 * cache.admin.users.byId.revalidateTag({ id: '123' });
 * cache.admin.users.byId.updateTag({ id: '123' });
 *
 * // Cross-scope invalidation:
 * cache.users.byId.revalidateTag({ id: '123' });
 * ```
 */

// Main factory function
export { createCache } from "./create-cache.js";
export { getChildKeys, getParams, isLeafNode } from "./schema-utils.js";

// Utility exports (for advanced use cases)
export {
  buildAllTags,
  buildAncestorTags,
  buildScopedTag,
  buildTag,
  buildUnscopedTags,
} from "./tag-builder.js";
// Type exports
export type {
  BranchNode,
  BuildTree,
  ExtractParams,
  IsLeaf,
  LeafNode,
  ParamsArray,
  ParamsToObject,
  ScopedCache,
} from "./types.js";
