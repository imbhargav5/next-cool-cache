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
