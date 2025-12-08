/**
 * Factory function to create a typed cache object from a schema.
 */

import { cacheTag, revalidateTag, updateTag } from "next/cache";
import { getChildKeys, getParams, isLeafNode } from "./schema-utils.js";
import { buildAllTags, buildTag, buildUnscopedTags } from "./tag-builder.js";
import type {
  BranchNode,
  LeafNode,
  ParamsArray,
  ScopedCache,
} from "./types.js";

/**
 * Build a leaf node with cacheTag, revalidateTag, and updateTag methods.
 */
function buildLeafNodeImpl(
  resourcePath: string[],
  scopePath: string[],
  _params: string[]
): LeafNode<ParamsArray> {
  const scopedKey = [...scopePath, ...resourcePath].join("/");

  return {
    cacheTag: ((p?: Record<string, string>) => {
      const tags = buildAllTags(resourcePath, scopePath, p ?? {});
      cacheTag(...tags);
    }) as LeafNode<ParamsArray>["cacheTag"],

    revalidateTag: ((p?: Record<string, string>) => {
      const tag = buildTag([...scopePath, ...resourcePath], p ?? {});
      revalidateTag(tag, "max");
    }) as LeafNode<ParamsArray>["revalidateTag"],

    updateTag: ((p?: Record<string, string>) => {
      const tag = buildTag([...scopePath, ...resourcePath], p ?? {});
      updateTag(tag);
    }) as LeafNode<ParamsArray>["updateTag"],

    _path: scopedKey,
  };
}

/**
 * Build an unscoped leaf node (for cross-scope operations).
 */
function buildUnscopedLeafNodeImpl(
  resourcePath: string[],
  _params: string[]
): LeafNode<ParamsArray> {
  const resourceKey = resourcePath.join("/");

  return {
    cacheTag: ((p?: Record<string, string>) => {
      const tags = buildUnscopedTags(resourcePath, p ?? {});
      cacheTag(...tags);
    }) as LeafNode<ParamsArray>["cacheTag"],

    revalidateTag: ((p?: Record<string, string>) => {
      const tag = buildTag(resourcePath, p ?? {});
      revalidateTag(tag, "max");
    }) as LeafNode<ParamsArray>["revalidateTag"],

    updateTag: ((p?: Record<string, string>) => {
      const tag = buildTag(resourcePath, p ?? {});
      updateTag(tag);
    }) as LeafNode<ParamsArray>["updateTag"],

    _path: resourceKey,
  };
}

/**
 * Build a branch node with revalidateTag and updateTag methods.
 */
function buildBranchNodeImpl(
  resourcePath: string[],
  scopePath: string[]
): BranchNode {
  const scopedKey = [...scopePath, ...resourcePath].join("/");

  return {
    revalidateTag: () => {
      revalidateTag(scopedKey || scopePath[0] || "root", "max");
    },

    updateTag: () => {
      updateTag(scopedKey || scopePath[0] || "root");
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
  scopePath: string[]
): Record<string, unknown> {
  const branchNode = buildBranchNodeImpl(resourcePath, scopePath);
  const result: Record<string, unknown> = { ...branchNode };

  for (const key of getChildKeys(schema)) {
    const childSchema = schema[key];
    const childPath = [...resourcePath, key];

    if (isLeafNode(childSchema)) {
      result[key] = buildLeafNodeImpl(
        childPath,
        scopePath,
        getParams(childSchema)
      );
    } else {
      result[key] = buildScopedBranch(
        childSchema as Record<string, unknown>,
        childPath,
        scopePath
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
  resourcePath: string[]
): Record<string, unknown> {
  const resourceKey = resourcePath.join("/");
  const result: Record<string, unknown> = {
    revalidateTag: () => {
      revalidateTag(resourceKey || "root", "max");
    },
    updateTag: () => {
      updateTag(resourceKey || "root");
    },
    _path: resourceKey,
  };

  for (const key of getChildKeys(schema)) {
    const childSchema = schema[key];
    const childPath = [...resourcePath, key];

    if (isLeafNode(childSchema)) {
      result[key] = buildUnscopedLeafNodeImpl(
        childPath,
        getParams(childSchema)
      );
    } else {
      result[key] = buildUnscopedBranch(
        childSchema as Record<string, unknown>,
        childPath
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
 * const cache = createCache(schema, scopes);
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
>(schema: T, scopes: S): ScopedCache<T, S> {
  // Build the result object
  const result: Record<string, unknown> = {
    // Unscoped (cross-scope) tree
    ...buildUnscopedBranch(schema, []),
  };

  // Add scoped trees
  for (const scope of scopes) {
    result[scope] = buildScopedBranch(schema, [], [scope]);
  }

  return result as ScopedCache<T, S>;
}
