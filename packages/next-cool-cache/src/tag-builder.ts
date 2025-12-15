/**
 * Pure functions for building cache tag strings.
 * These are easily testable without any Next.js dependencies.
 */

/**
 * Build a tag string from a resource path and optional params.
 *
 * Examples:
 * - buildTag(['users', 'byId'], { id: '123' }) => 'users/byId:123'
 * - buildTag(['users', 'list'], {}) => 'users/list'
 * - buildTag(['feedback', 'boards'], {}) => 'feedback/boards'
 */
export function buildTag(
  path: string[],
  params: Record<string, string>
): string {
  const basePath = path.join("/");
  const paramValues = Object.values(params);

  if (paramValues.length === 0) {
    return basePath;
  }

  return `${basePath}:${paramValues.join(":")}`;
}

/**
 * Build all ancestor tags for hierarchical caching.
 * This allows invalidating a parent to also invalidate all children.
 *
 * Example:
 * - buildAncestorTags(['feedback', 'threads', 'byId'])
 *   => ['feedback', 'feedback/threads']
 *
 * Note: Does not include the full path itself (that's the leaf tag).
 */
export function buildAncestorTags(path: string[]): string[] {
  const ancestors: string[] = [];

  for (let i = 1; i < path.length; i++) {
    ancestors.push(path.slice(0, i).join("/"));
  }

  return ancestors;
}

/**
 * Prefix a tag with a scope.
 *
 * Example:
 * - buildScopedTag('admin', 'users/byId:123') => 'admin/users/byId:123'
 */
export function buildScopedTag(scope: string, tag: string): string {
  return `${scope}/${tag}`;
}

/**
 * Build all tags for a leaf node, including scoped and unscoped ancestors.
 * This is what cacheTag() calls to register hierarchical tags.
 *
 * For a scoped call like cache.admin.users.byId.cacheTag({ id: '123' }):
 * Returns both scoped hierarchy and unscoped hierarchy:
 * - 'admin/users/byId:123' (scoped leaf)
 * - 'admin/users/byId' (scoped ancestor)
 * - 'admin/users' (scoped ancestor)
 * - 'admin' (scope root)
 * - 'users/byId:123' (unscoped leaf)
 * - 'users/byId' (unscoped ancestor)
 * - 'users' (unscoped ancestor)
 */
export function buildAllTags(
  resourcePath: string[],
  scopePath: string[],
  params: Record<string, string>
): string[] {
  const tags: string[] = [];

  // Build resource (unscoped) tags
  const resourceKey = buildTag(resourcePath, params);
  const resourceAncestors = buildAncestorTags(resourcePath);

  // Build scoped tags
  const fullPath = [...scopePath, ...resourcePath];
  const scopedKey = buildTag(fullPath, params);
  const scopedAncestors = buildAncestorTags(fullPath);

  // Add all scoped tags (most specific first)
  tags.push(scopedKey);
  tags.push(...scopedAncestors.reverse());

  // Add all unscoped tags (most specific first)
  tags.push(resourceKey);
  tags.push(...resourceAncestors.reverse());

  return tags;
}

/**
 * Build all tags for an unscoped leaf node (cross-scope operations).
 */
export function buildUnscopedTags(
  resourcePath: string[],
  params: Record<string, string>
): string[] {
  const tags: string[] = [];

  const resourceKey = buildTag(resourcePath, params);
  const resourceAncestors = buildAncestorTags(resourcePath);

  tags.push(resourceKey);
  tags.push(...resourceAncestors.reverse());

  return tags;
}

/**
 * Build a tag with params embedded at their respective path segments.
 * Unlike buildTag which appends all params at the end, this embeds params
 * at the segment where they were defined.
 *
 * Example:
 * - buildTagWithEmbeddedParams(
 *     ['userPrivateData', 'myWorkspaces', 'byId'],
 *     new Map([[0, ['userId']], [2, ['workspaceId']]]),
 *     { userId: 'u1', workspaceId: 'w1' }
 *   ) => 'userPrivateData:u1/myWorkspaces/byId:w1'
 *
 * - With partial params:
 *   buildTagWithEmbeddedParams(..., { userId: 'u1' })
 *   => 'userPrivateData:u1/myWorkspaces/byId'
 */
export function buildTagWithEmbeddedParams(
  pathSegments: string[],
  paramsBySegment: Map<number, string[]>,
  params: Record<string, string>
): string {
  return pathSegments
    .map((segment, i) => {
      const segmentParams = paramsBySegment.get(i) || [];
      const paramValues = segmentParams
        .map((p) => params[p])
        .filter((v): v is string => v !== undefined);

      return paramValues.length > 0
        ? `${segment}:${paramValues.join(":")}`
        : segment;
    })
    .join("/");
}

/**
 * Build all ancestor tags with embedded params.
 * Returns tags from the root up to (but not including) the full path.
 *
 * Example:
 * - buildAncestorTagsWithEmbeddedParams(
 *     ['userPrivateData', 'myWorkspaces', 'byId'],
 *     new Map([[0, ['userId']], [2, ['workspaceId']]]),
 *     { userId: 'u1', workspaceId: 'w1' }
 *   ) => ['userPrivateData:u1', 'userPrivateData:u1/myWorkspaces']
 */
export function buildAncestorTagsWithEmbeddedParams(
  pathSegments: string[],
  paramsBySegment: Map<number, string[]>,
  params: Record<string, string>
): string[] {
  const ancestors: string[] = [];

  for (let i = 1; i < pathSegments.length; i++) {
    const ancestorPath = pathSegments.slice(0, i);
    const tag = buildTagWithEmbeddedParams(
      ancestorPath,
      paramsBySegment,
      params
    );
    ancestors.push(tag);
  }

  return ancestors;
}

/**
 * Build all tags for hierarchical caching with embedded params.
 * This is for cacheTag() - it registers all combinations to enable
 * invalidation at any level.
 *
 * For cache.admin.userPrivateData.myWorkspaces.byId.cacheTag({ userId: 'u1', workspaceId: 'w1' }):
 * Returns both scoped and unscoped hierarchies:
 * - 'admin/userPrivateData:u1/myWorkspaces/byId:w1' (scoped leaf)
 * - 'admin/userPrivateData:u1/myWorkspaces' (scoped ancestor)
 * - 'admin/userPrivateData:u1' (scoped ancestor)
 * - 'admin' (scope root)
 * - 'userPrivateData:u1/myWorkspaces/byId:w1' (unscoped leaf)
 * - 'userPrivateData:u1/myWorkspaces' (unscoped ancestor)
 * - 'userPrivateData:u1' (unscoped ancestor)
 */
export function buildAllTagsWithEmbeddedParams(
  resourcePath: string[],
  scopePath: string[],
  paramsBySegment: Map<number, string[]>,
  params: Record<string, string>
): string[] {
  const tags: string[] = [];

  // Build full path tags (scoped)
  const fullPath = [...scopePath, ...resourcePath];

  // Adjust paramsBySegment indices to account for scope prefix
  const scopedParamsBySegment = new Map<number, string[]>();
  for (const [index, paramNames] of paramsBySegment) {
    scopedParamsBySegment.set(index + scopePath.length, paramNames);
  }

  const scopedKey = buildTagWithEmbeddedParams(
    fullPath,
    scopedParamsBySegment,
    params
  );
  const scopedAncestors = buildAncestorTagsWithEmbeddedParams(
    fullPath,
    scopedParamsBySegment,
    params
  );

  // Add all scoped tags (most specific first)
  tags.push(scopedKey);
  tags.push(...scopedAncestors.reverse());

  // Build unscoped tags
  const unscopedKey = buildTagWithEmbeddedParams(
    resourcePath,
    paramsBySegment,
    params
  );
  const unscopedAncestors = buildAncestorTagsWithEmbeddedParams(
    resourcePath,
    paramsBySegment,
    params
  );

  // Add all unscoped tags (most specific first)
  tags.push(unscopedKey);
  tags.push(...unscopedAncestors.reverse());

  return tags;
}

/**
 * Build all tags for unscoped hierarchical caching with embedded params.
 */
export function buildUnscopedTagsWithEmbeddedParams(
  resourcePath: string[],
  paramsBySegment: Map<number, string[]>,
  params: Record<string, string>
): string[] {
  const tags: string[] = [];

  const resourceKey = buildTagWithEmbeddedParams(
    resourcePath,
    paramsBySegment,
    params
  );
  const resourceAncestors = buildAncestorTagsWithEmbeddedParams(
    resourcePath,
    paramsBySegment,
    params
  );

  tags.push(resourceKey);
  tags.push(...resourceAncestors.reverse());

  return tags;
}
