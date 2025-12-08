/**
 * Type definitions for next-cool-cache
 *
 * Schema format:
 * - Empty object {} = leaf node without params
 * - { _params: ['id'] as const } = leaf node with params
 * - Nested objects without _params = branch nodes
 */

// ============================================
// PARAM TYPES
// ============================================

export type ParamsArray = readonly string[];

export type ParamsToObject<T extends ParamsArray> = {
  [K in T[number]]: string;
};

// ============================================
// SCHEMA TYPE UTILITIES
// ============================================

/**
 * Check if a schema node is a leaf node.
 * A leaf is either:
 * - An empty object {}
 * - An object with only _params key
 */
export type IsLeaf<T> = T extends { _params: ParamsArray }
  ? true
  : T extends Record<string, never>
    ? true
    : keyof T extends "_params"
      ? true
      : false;

/**
 * Extract params array from a schema node.
 * Returns empty array if no _params defined.
 */
export type ExtractParams<T> = T extends {
  _params: infer P extends ParamsArray;
}
  ? P
  : readonly [];

// ============================================
// CACHE NODE INTERFACES
// ============================================

/**
 * Leaf node interface - methods mirror Next.js API names exactly.
 * Methods only require params if the schema node has _params.
 */
export type LeafNode<P extends ParamsArray = readonly []> = {
  /** Register cache tags (call inside 'use cache' functions) */
  cacheTag: P["length"] extends 0
    ? () => void
    : (params: ParamsToObject<P>) => void;
  /** Stale-while-revalidate invalidation */
  revalidateTag: P["length"] extends 0
    ? () => void
    : (params: ParamsToObject<P>) => void;
  /** Expire immediately and fetch fresh */
  updateTag: P["length"] extends 0
    ? () => void
    : (params: ParamsToObject<P>) => void;
  /** Raw path for debugging */
  _path: string;
};

/**
 * Branch node interface - can invalidate/update entire subtree.
 * No params required since it operates on the whole subtree.
 */
export type BranchNode = {
  /** Invalidate entire subtree */
  revalidateTag: () => void;
  /** Update entire subtree */
  updateTag: () => void;
  /** Raw path for debugging */
  _path: string;
};

// ============================================
// RECURSIVE TYPE BUILDER
// ============================================

/**
 * Recursively builds the cache tree type from the schema.
 * - Leaf nodes become LeafNode<Params>
 * - Branch nodes become BuildTree<Children> & BranchNode
 */
export type BuildTree<T, Prefix extends string = ""> = {
  [K in keyof T as K extends "_params" ? never : K]: IsLeaf<T[K]> extends true
    ? LeafNode<ExtractParams<T[K]>>
    : BuildTree<T[K], `${Prefix}${K & string}/`> & BranchNode;
} & (Prefix extends "" ? object : BranchNode);

// ============================================
// SCOPED CACHE TYPE
// ============================================

/**
 * Creates a scoped cache type with:
 * - One namespace per scope (e.g., cache.admin, cache.public)
 * - Unscoped access for cross-scope operations (e.g., cache.users)
 */
export type ScopedCache<T, Scopes extends readonly string[]> = {
  [S in Scopes[number]]: BuildTree<T> & BranchNode;
} & BuildTree<T> &
  BranchNode;
