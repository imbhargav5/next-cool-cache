/**
 * Factory function to create a typed cache object from a schema.
 */

import type {
  ParamsArray,
  LeafNode,
  BranchNode,
  ScopedCache,
  CacheOptions,
} from './types.js';
import { isLeafNode, getParams, getChildKeys } from './schema-utils.js';
import { buildTag, buildAllTags, buildUnscopedTags } from './tag-builder.js';

/**
 * Build a leaf node with cacheTag, revalidateTag, and updateTag methods.
 */
function buildLeafNodeImpl(
  resourcePath: string[],
  scopePath: string[],
  params: string[],
  options: Required<CacheOptions>
): LeafNode<ParamsArray> {
  const scopedKey = [...scopePath, ...resourcePath].join('/');

  return {
    cacheTag: ((p?: Record<string, string>) => {
      const tags = buildAllTags(resourcePath, scopePath, p ?? {});
      options.cacheTag(...tags);
    }) as LeafNode<ParamsArray>['cacheTag'],

    revalidateTag: ((p?: Record<string, string>) => {
      const tag = buildTag([...scopePath, ...resourcePath], p ?? {});
      options.revalidateTag(tag, 'max');
    }) as LeafNode<ParamsArray>['revalidateTag'],

    updateTag: ((p?: Record<string, string>) => {
      const tag = buildTag([...scopePath, ...resourcePath], p ?? {});
      options.updateTag(tag);
    }) as LeafNode<ParamsArray>['updateTag'],

    _path: scopedKey,
  };
}

/**
 * Build an unscoped leaf node (for cross-scope operations).
 */
function buildUnscopedLeafNodeImpl(
  resourcePath: string[],
  params: string[],
  options: Required<CacheOptions>
): LeafNode<ParamsArray> {
  const resourceKey = resourcePath.join('/');

  return {
    cacheTag: ((p?: Record<string, string>) => {
      const tags = buildUnscopedTags(resourcePath, p ?? {});
      options.cacheTag(...tags);
    }) as LeafNode<ParamsArray>['cacheTag'],

    revalidateTag: ((p?: Record<string, string>) => {
      const tag = buildTag(resourcePath, p ?? {});
      options.revalidateTag(tag, 'max');
    }) as LeafNode<ParamsArray>['revalidateTag'],

    updateTag: ((p?: Record<string, string>) => {
      const tag = buildTag(resourcePath, p ?? {});
      options.updateTag(tag);
    }) as LeafNode<ParamsArray>['updateTag'],

    _path: resourceKey,
  };
}

/**
 * Build a branch node with revalidateTag and updateTag methods.
 */
function buildBranchNodeImpl(
  resourcePath: string[],
  scopePath: string[],
  options: Required<CacheOptions>
): BranchNode {
  const scopedKey = [...scopePath, ...resourcePath].join('/');

  return {
    revalidateTag: () => {
      options.revalidateTag(scopedKey || scopePath[0] || 'root', 'max');
    },

    updateTag: () => {
      options.updateTag(scopedKey || scopePath[0] || 'root');
    },

    _path: scopedKey,
  };
}

/**
 * Recursively build the scoped cache tree.
 */
function buildScopedBranch(
  schema: Record<string, unknown>,
  resourcePath: string[],
  scopePath: string[],
  options: Required<CacheOptions>
): Record<string, unknown> {
  const branchNode = buildBranchNodeImpl(resourcePath, scopePath, options);
  const result: Record<string, unknown> = { ...branchNode };

  for (const key of getChildKeys(schema)) {
    const childSchema = schema[key];
    const childPath = [...resourcePath, key];

    if (isLeafNode(childSchema)) {
      result[key] = buildLeafNodeImpl(
        childPath,
        scopePath,
        getParams(childSchema),
        options
      );
    } else {
      result[key] = buildScopedBranch(
        childSchema as Record<string, unknown>,
        childPath,
        scopePath,
        options
      );
    }
  }

  return result;
}

/**
 * Recursively build the unscoped cache tree (for cross-scope operations).
 */
function buildUnscopedBranch(
  schema: Record<string, unknown>,
  resourcePath: string[],
  options: Required<CacheOptions>
): Record<string, unknown> {
  const resourceKey = resourcePath.join('/');
  const result: Record<string, unknown> = {
    revalidateTag: () => {
      options.revalidateTag(resourceKey || 'root', 'max');
    },
    updateTag: () => {
      options.updateTag(resourceKey || 'root');
    },
    _path: resourceKey,
  };

  for (const key of getChildKeys(schema)) {
    const childSchema = schema[key];
    const childPath = [...resourcePath, key];

    if (isLeafNode(childSchema)) {
      result[key] = buildUnscopedLeafNodeImpl(
        childPath,
        getParams(childSchema),
        options
      );
    } else {
      result[key] = buildUnscopedBranch(
        childSchema as Record<string, unknown>,
        childPath,
        options
      );
    }
  }

  return result;
}

/**
 * Create a typed cache object from a schema and scopes.
 *
 * @param schema - The cache schema defining resources and their params
 * @param scopes - Array of scope names (e.g., ['admin', 'public', 'user'])
 * @param options - Optional Next.js cache functions for dependency injection
 * @returns A fully typed cache object
 *
 * @example
 * ```ts
 * const schema = {
 *   users: {
 *     list: {},
 *     byId: { _params: ['id'] as const },
 *   },
 * } as const;
 *
 * const scopes = ['admin', 'public'] as const;
 *
 * const cache = createCache(schema, scopes, { cacheTag, revalidateTag, updateTag });
 *
 * // Usage:
 * cache.admin.users.byId.cacheTag({ id: '123' });
 * cache.admin.users.byId.revalidateTag({ id: '123' });
 * cache.users.revalidateTag(); // cross-scope
 * ```
 */
export function createCache<
  T extends Record<string, unknown>,
  S extends readonly string[],
>(schema: T, scopes: S, options?: CacheOptions): ScopedCache<T, S> {
  // Default no-op functions for testing without Next.js
  const resolvedOptions: Required<CacheOptions> = {
    cacheTag: options?.cacheTag ?? ((..._tags: string[]) => {}),
    revalidateTag:
      options?.revalidateTag ??
      ((_tag: string, _profile?: string | { expire?: number }) => {}),
    updateTag: options?.updateTag ?? ((_tag: string) => {}),
  };

  // Build the result object
  const result: Record<string, unknown> = {
    // Unscoped (cross-scope) tree
    ...buildUnscopedBranch(schema, [], resolvedOptions),
  };

  // Add scoped trees
  for (const scope of scopes) {
    result[scope] = buildScopedBranch(schema, [], [scope], resolvedOptions);
  }

  return result as ScopedCache<T, S>;
}
