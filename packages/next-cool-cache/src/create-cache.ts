/**
 * Factory function to create a typed cache object from a schema.
 */

import { cacheTag, revalidateTag, updateTag } from "next/cache";
import { getChildKeys, getParams, isLeafNode } from "./schema-utils.js";
import {
  buildAllTagsWithEmbeddedParams,
  buildTagWithEmbeddedParams,
  buildUnscopedTagsWithEmbeddedParams,
} from "./tag-builder.js";
import type {
  BranchNode,
  LeafNode,
  ParamsArray,
  ScopedCache,
} from "./types.js";

/**
 * Build a leaf node with cacheTag, revalidateTag, and updateTag methods.
 * Supports accumulated params from ancestors with embedded param format.
 */
function buildLeafNodeImpl(
  resourcePath: string[],
  scopePath: string[],
  paramsBySegment: Map<number, string[]>
): LeafNode<ParamsArray> {
  const scopedKey = [...scopePath, ...resourcePath].join("/");

  // Adjust paramsBySegment indices to account for scope prefix
  const scopedParamsBySegment = new Map<number, string[]>();
  for (const [index, paramNames] of paramsBySegment) {
    scopedParamsBySegment.set(index + scopePath.length, paramNames);
  }

  return {
    cacheTag: ((p?: Record<string, string>) => {
      const tags = buildAllTagsWithEmbeddedParams(
        resourcePath,
        scopePath,
        paramsBySegment,
        p ?? {}
      );
      cacheTag(...tags);
    }) as LeafNode<ParamsArray>["cacheTag"],

    revalidateTag: ((p?: Record<string, string>) => {
      const tag = buildTagWithEmbeddedParams(
        [...scopePath, ...resourcePath],
        scopedParamsBySegment,
        p ?? {}
      );
      revalidateTag(tag, "max");
    }) as LeafNode<ParamsArray>["revalidateTag"],

    updateTag: ((p?: Record<string, string>) => {
      const tag = buildTagWithEmbeddedParams(
        [...scopePath, ...resourcePath],
        scopedParamsBySegment,
        p ?? {}
      );
      updateTag(tag);
    }) as LeafNode<ParamsArray>["updateTag"],

    _path: scopedKey,
  };
}

/**
 * Build an unscoped leaf node (for cross-scope operations).
 * Supports accumulated params from ancestors with embedded param format.
 */
function buildUnscopedLeafNodeImpl(
  resourcePath: string[],
  paramsBySegment: Map<number, string[]>
): LeafNode<ParamsArray> {
  const resourceKey = resourcePath.join("/");

  return {
    cacheTag: ((p?: Record<string, string>) => {
      const tags = buildUnscopedTagsWithEmbeddedParams(
        resourcePath,
        paramsBySegment,
        p ?? {}
      );
      cacheTag(...tags);
    }) as LeafNode<ParamsArray>["cacheTag"],

    revalidateTag: ((p?: Record<string, string>) => {
      const tag = buildTagWithEmbeddedParams(
        resourcePath,
        paramsBySegment,
        p ?? {}
      );
      revalidateTag(tag, "max");
    }) as LeafNode<ParamsArray>["revalidateTag"],

    updateTag: ((p?: Record<string, string>) => {
      const tag = buildTagWithEmbeddedParams(
        resourcePath,
        paramsBySegment,
        p ?? {}
      );
      updateTag(tag);
    }) as LeafNode<ParamsArray>["updateTag"],

    _path: resourceKey,
  };
}

/**
 * Build a branch node with revalidateTag and updateTag methods.
 * Supports accumulated params from ancestors with embedded param format.
 */
function buildBranchNodeImpl(
  resourcePath: string[],
  scopePath: string[],
  paramsBySegment: Map<number, string[]>
): BranchNode<ParamsArray> {
  const scopedKey = [...scopePath, ...resourcePath].join("/");

  // Adjust paramsBySegment indices to account for scope prefix
  const scopedParamsBySegment = new Map<number, string[]>();
  for (const [index, paramNames] of paramsBySegment) {
    scopedParamsBySegment.set(index + scopePath.length, paramNames);
  }

  return {
    revalidateTag: ((p?: Record<string, string>) => {
      const tag = buildTagWithEmbeddedParams(
        [...scopePath, ...resourcePath],
        scopedParamsBySegment,
        p ?? {}
      );
      revalidateTag(tag || scopePath[0] || "root", "max");
    }) as BranchNode<ParamsArray>["revalidateTag"],

    updateTag: ((p?: Record<string, string>) => {
      const tag = buildTagWithEmbeddedParams(
        [...scopePath, ...resourcePath],
        scopedParamsBySegment,
        p ?? {}
      );
      updateTag(tag || scopePath[0] || "root");
    }) as BranchNode<ParamsArray>["updateTag"],

    _path: scopedKey,
  };
}

/**
 * Recursively build the scoped cache tree.
 * Accumulates params from ancestors and tracks which params belong to which segment.
 */
function buildScopedBranch(
  schema: Record<string, unknown>,
  resourcePath: string[],
  scopePath: string[],
  paramsBySegment: Map<number, string[]> = new Map()
): Record<string, unknown> {
  // Get params at this branch level (if any)
  const branchParams = getParams(schema);

  // Create new paramsBySegment with this branch's params (if any)
  const newParamsBySegment = new Map(paramsBySegment);
  if (branchParams.length > 0 && resourcePath.length > 0) {
    // Params belong to the last segment of the current path
    newParamsBySegment.set(resourcePath.length - 1, branchParams);
  }

  const branchNode = buildBranchNodeImpl(
    resourcePath,
    scopePath,
    newParamsBySegment
  );
  const result: Record<string, unknown> = { ...branchNode };

  for (const key of getChildKeys(schema)) {
    const childSchema = schema[key];
    const childPath = [...resourcePath, key];

    if (isLeafNode(childSchema)) {
      // Get leaf's own params
      const leafParams = getParams(childSchema);

      // Create final paramsBySegment for this leaf
      const leafParamsBySegment = new Map(newParamsBySegment);
      if (leafParams.length > 0) {
        // Leaf params belong to the leaf segment
        leafParamsBySegment.set(childPath.length - 1, leafParams);
      }

      result[key] = buildLeafNodeImpl(
        childPath,
        scopePath,
        leafParamsBySegment
      );
    } else {
      result[key] = buildScopedBranch(
        childSchema as Record<string, unknown>,
        childPath,
        scopePath,
        newParamsBySegment
      );
    }
  }

  return result;
}

/**
 * Recursively build the unscoped cache tree (for cross-scope operations).
 * Accumulates params from ancestors and tracks which params belong to which segment.
 */
function buildUnscopedBranch(
  schema: Record<string, unknown>,
  resourcePath: string[],
  paramsBySegment: Map<number, string[]> = new Map()
): Record<string, unknown> {
  // Get params at this branch level (if any)
  const branchParams = getParams(schema);

  // Create new paramsBySegment with this branch's params (if any)
  const newParamsBySegment = new Map(paramsBySegment);
  if (branchParams.length > 0 && resourcePath.length > 0) {
    // Params belong to the last segment of the current path
    newParamsBySegment.set(resourcePath.length - 1, branchParams);
  }

  const resourceKey = resourcePath.join("/");
  const result: Record<string, unknown> = {
    revalidateTag: ((p?: Record<string, string>) => {
      const tag = buildTagWithEmbeddedParams(
        resourcePath,
        newParamsBySegment,
        p ?? {}
      );
      revalidateTag(tag || "root", "max");
    }) as BranchNode<ParamsArray>["revalidateTag"],
    updateTag: ((p?: Record<string, string>) => {
      const tag = buildTagWithEmbeddedParams(
        resourcePath,
        newParamsBySegment,
        p ?? {}
      );
      updateTag(tag || "root");
    }) as BranchNode<ParamsArray>["updateTag"],
    _path: resourceKey,
  };

  for (const key of getChildKeys(schema)) {
    const childSchema = schema[key];
    const childPath = [...resourcePath, key];

    if (isLeafNode(childSchema)) {
      // Get leaf's own params
      const leafParams = getParams(childSchema);

      // Create final paramsBySegment for this leaf
      const leafParamsBySegment = new Map(newParamsBySegment);
      if (leafParams.length > 0) {
        // Leaf params belong to the leaf segment
        leafParamsBySegment.set(childPath.length - 1, leafParams);
      }

      result[key] = buildUnscopedLeafNodeImpl(childPath, leafParamsBySegment);
    } else {
      result[key] = buildUnscopedBranch(
        childSchema as Record<string, unknown>,
        childPath,
        newParamsBySegment
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
