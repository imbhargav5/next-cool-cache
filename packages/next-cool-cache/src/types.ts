/**
 * Type definitions for next-cool-cache
 *
 * Schema format:
 * - Empty object {} = leaf node without params
 * - { _params: ['id'] as const } = leaf node with params
 * - Nested objects without _params = branch nodes
 * - { _params: ['id'] as const, children: {...} } = branch node with params
 */

// ============================================
// PARAM TYPES
// ============================================

export type ParamsArray = readonly string[];

export type ParamsToObject<T extends ParamsArray> = {
  [K in T[number]]: string;
};

/**
 * Accumulate params from inherited (ancestor) params and current node's params.
 */
export type AccumulatedParams<
  T,
  Inherited extends ParamsArray = readonly [],
> = readonly [...Inherited, ...ExtractParams<T>];

// ============================================
// SCHEMA TYPE UTILITIES
// ============================================

/**
 * Check if a schema node is a leaf node.
 * A leaf is either:
 * - An empty object {}
 * - An object with only _params key
 */
export type IsLeaf<T> = T extends Record<string, never>
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
 * - cacheTag requires ALL accumulated params (from ancestors + leaf)
 * - revalidateTag/updateTag accept OPTIONAL params for flexible invalidation
 */
export type LeafNode<P extends ParamsArray = readonly []> = {
  /** Register cache tags (call inside 'use cache' functions) - requires ALL params */
  cacheTag: P["length"] extends 0
    ? () => void
    : (params: ParamsToObject<P>) => void;
  /** Stale-while-revalidate invalidation - params optional for wider scope */
  revalidateTag: P["length"] extends 0
    ? () => void
    : (params?: Partial<ParamsToObject<P>>) => void;
  /** Expire immediately and fetch fresh - params optional for wider scope */
  updateTag: P["length"] extends 0
    ? () => void
    : (params?: Partial<ParamsToObject<P>>) => void;
  /** Raw path for debugging */
  _path: string;
};

/**
 * Branch node interface - can invalidate/update entire subtree.
 * Params are optional - omitting params widens the invalidation scope.
 */
export type BranchNode<P extends ParamsArray = readonly []> = {
  /** Invalidate entire subtree - params optional for wider scope */
  revalidateTag: P["length"] extends 0
    ? () => void
    : (params?: Partial<ParamsToObject<P>>) => void;
  /** Update entire subtree - params optional for wider scope */
  updateTag: P["length"] extends 0
    ? () => void
    : (params?: Partial<ParamsToObject<P>>) => void;
  /** Raw path for debugging */
  _path: string;
};

// ============================================
// RECURSIVE TYPE BUILDER
// ============================================

/**
 * Recursively builds the cache tree type from the schema.
 * - Leaf nodes become LeafNode<AccumulatedParams>
 * - Branch nodes become BuildTree<Children> & BranchNode<AccumulatedParams>
 *
 * AccParams tracks all params accumulated from ancestors.
 */
export type BuildTree<
  T,
  Prefix extends string = "",
  AccParams extends ParamsArray = readonly [],
> = {
  [K in keyof T as K extends "_params" ? never : K]: IsLeaf<T[K]> extends true
    ? LeafNode<AccumulatedParams<T[K], AccParams>>
    : BuildTree<
        T[K],
        `${Prefix}${K & string}/`,
        AccumulatedParams<T[K], AccParams>
      > &
        BranchNode<AccumulatedParams<T[K], AccParams>>;
} & (Prefix extends "" ? object : BranchNode<AccParams>);

// ============================================
// SCOPED CACHE TYPE
// ============================================

/**
 * Creates a scoped cache type with:
 * - One namespace per scope (e.g., cache.admin, cache.public)
 * - Unscoped access for cross-scope operations (e.g., cache.users)
 *
 * Root-level params from the schema are passed to all branches.
 */
export type ScopedCache<T, Scopes extends readonly string[]> = {
  [S in Scopes[number]]: BuildTree<T, "", ExtractParams<T>> &
    BranchNode<ExtractParams<T>>;
} & BuildTree<T, "", ExtractParams<T>> &
  BranchNode<ExtractParams<T>>;
