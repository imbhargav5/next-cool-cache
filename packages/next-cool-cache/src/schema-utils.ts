/**
 * Runtime utilities for parsing and validating cache schemas.
 */

/**
 * Check if a schema node is a leaf node.
 * A leaf is either:
 * - An empty object {}
 * - An object with only _params key
 */
export function isLeafNode(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const keys = Object.keys(value);

  // Empty object = leaf without params
  if (keys.length === 0) {
    return true;
  }

  // Object with only _params = leaf with params
  if (keys.length === 1 && keys[0] === "_params") {
    return true;
  }

  return false;
}

/**
 * Extract params array from a schema node.
 * Returns empty array if no _params defined.
 */
export function getParams(node: unknown): string[] {
  if (
    typeof node === "object" &&
    node !== null &&
    "_params" in node &&
    Array.isArray((node as { _params: string[] })._params)
  ) {
    return (node as { _params: string[] })._params;
  }

  return [];
}

/**
 * Get child keys from a schema node, excluding _params.
 */
export function getChildKeys(node: unknown): string[] {
  if (typeof node !== "object" || node === null) {
    return [];
  }

  return Object.keys(node).filter((key) => key !== "_params");
}

/**
 * Check if a branch node has params.
 * A branch with params has _params AND other children (unlike a leaf which only has _params).
 */
export function hasBranchParams(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const keys = Object.keys(value);
  return keys.includes("_params") && keys.length > 1;
}
