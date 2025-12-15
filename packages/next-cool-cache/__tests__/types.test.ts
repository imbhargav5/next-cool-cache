/**
 * Compile-time type tests for next-cool-cache types.
 *
 * These tests use the Expect + Equal pattern to verify type behavior at compile time.
 * If any type assertion is wrong, TypeScript will fail to compile this file.
 */

import type {
  IsLeaf,
  ExtractParams,
  AccumulatedParams,
  ParamsArray,
  LeafNode,
  BranchNode,
} from "../src/types.js";

// ============================================
// TYPE TESTING UTILITIES
// ============================================

/**
 * Expect<T> - fails to compile if T is not `true`
 */
type Expect<T extends true> = T;

/**
 * Equal<X, Y> - returns `true` if X and Y are exactly equal types
 */
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? true
  : false;

// ============================================
// IsLeaf TESTS
// ============================================

// Empty object is a leaf
type _TestIsLeaf_EmptyObject = Expect<Equal<IsLeaf<{}>, true>>;

// Object with only _params is a leaf
type _TestIsLeaf_OnlyParams = Expect<
  Equal<IsLeaf<{ _params: readonly ["id"] }>, true>
>;

// Object with children (no _params) is NOT a leaf
type _TestIsLeaf_HasChildren = Expect<Equal<IsLeaf<{ list: {} }>, false>>;

// Object with multiple children is NOT a leaf
type _TestIsLeaf_MultipleChildren = Expect<
  Equal<IsLeaf<{ list: {}; byId: {} }>, false>
>;

// CRITICAL: Object with _params AND children is NOT a leaf (branch with params)
type _TestIsLeaf_ParamsAndChildren = Expect<
  Equal<IsLeaf<{ _params: readonly ["id"]; list: {} }>, false>
>;

// Branch with _params and multiple children is NOT a leaf
type _TestIsLeaf_ParamsAndMultipleChildren = Expect<
  Equal<IsLeaf<{ _params: readonly ["userId"]; profile: {}; settings: {} }>, false>
>;

// ============================================
// ExtractParams TESTS
// ============================================

// Empty object has no params
type _TestExtractParams_Empty = Expect<
  Equal<ExtractParams<{}>, readonly []>
>;

// Object with _params extracts them
type _TestExtractParams_WithParams = Expect<
  Equal<ExtractParams<{ _params: readonly ["id", "name"] }>, readonly ["id", "name"]>
>;

// Object without _params returns empty
type _TestExtractParams_NoParams = Expect<
  Equal<ExtractParams<{ list: {} }>, readonly []>
>;

// Branch with _params extracts them
type _TestExtractParams_BranchWithParams = Expect<
  Equal<ExtractParams<{ _params: readonly ["userId"]; profile: {} }>, readonly ["userId"]>
>;

// ============================================
// AccumulatedParams TESTS
// ============================================

// No inherited, no current = empty
type _TestAccumulatedParams_Empty = Expect<
  Equal<AccumulatedParams<{}, readonly []>, readonly []>
>;

// Inherited only
type _TestAccumulatedParams_InheritedOnly = Expect<
  Equal<AccumulatedParams<{}, readonly ["tenantId"]>, readonly ["tenantId"]>
>;

// Current only
type _TestAccumulatedParams_CurrentOnly = Expect<
  Equal<AccumulatedParams<{ _params: readonly ["userId"] }, readonly []>, readonly ["userId"]>
>;

// Both inherited and current
type _TestAccumulatedParams_Both = Expect<
  Equal<
    AccumulatedParams<{ _params: readonly ["userId"] }, readonly ["tenantId"]>,
    readonly ["tenantId", "userId"]
  >
>;

// Multiple levels accumulated
type _TestAccumulatedParams_MultiLevel = Expect<
  Equal<
    AccumulatedParams<{ _params: readonly ["workspaceId"] }, readonly ["tenantId", "userId"]>,
    readonly ["tenantId", "userId", "workspaceId"]
  >
>;

// ============================================
// LeafNode TESTS
// ============================================

// LeafNode with no params has no-arg cacheTag
type _TestLeafNode_NoParams = Expect<
  Equal<LeafNode<readonly []>["cacheTag"], () => void>
>;

// LeafNode with params requires params object
type _TestLeafNode_WithParams = LeafNode<readonly ["id"]>["cacheTag"] extends (
  params: { id: string }
) => void
  ? true
  : false;
type _TestLeafNode_WithParamsCheck = Expect<_TestLeafNode_WithParams>;

// ============================================
// BranchNode TESTS
// ============================================

// BranchNode with no params has no-arg revalidateTag
type _TestBranchNode_NoParams = Expect<
  Equal<BranchNode<readonly []>["revalidateTag"], () => void>
>;

// BranchNode with params accepts optional partial params
type _TestBranchNode_WithParams = BranchNode<
  readonly ["userId"]
>["revalidateTag"] extends (params?: Partial<{ userId: string }>) => void
  ? true
  : false;
type _TestBranchNode_WithParamsCheck = Expect<_TestBranchNode_WithParams>;

// ============================================
// RUNTIME TEST (for Jest)
// ============================================

describe("Type Tests", () => {
  it("type assertions compile successfully", () => {
    // If this file compiles, all type tests passed
    expect(true).toBe(true);
  });
});
