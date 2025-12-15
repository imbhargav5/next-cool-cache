# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2024-12-15

### Added

- **Hierarchical Params (Branch-Level `_params`)**: You can now define `_params` at any level in the schema tree, not just at leaf nodes. This enables powerful patterns like user-scoped caches where all resources under a user inherit params.

  ```typescript
  const schema = {
    userPrivateData: {
      _params: ['userId'] as const,  // Branch-level params!
      myWorkspaces: {
        byId: { _params: ['workspaceId'] as const },
      },
    },
  } as const;
  ```

- **Accumulated Params**: `cacheTag` now requires ALL accumulated params from ancestors + leaf node, ensuring complete cache key specificity.

- **Flexible Invalidation**: `revalidateTag` and `updateTag` now accept OPTIONAL params (`Partial<>`), allowing flexible invalidation scope:
  - Pass all params for specific invalidation
  - Pass partial params for broader invalidation
  - Pass no params for widest scope invalidation

- **Embedded Params Format**: Tags now embed params at their respective path segments:
  ```
  userPrivateData:u1/myWorkspaces/byId:w1
  ```
  instead of appending all params at the end.

- **Multi-Level Params**: Support for params at multiple branch levels for complex hierarchies like multi-tenant SaaS applications.

### Changed

- Updated `LeafNode` type to support accumulated params from ancestors
- Updated `BranchNode` type to support optional params for flexible invalidation
- Added `AccumulatedParams` type utility for merging inherited and current params
- Tag builder now uses `Map<number, string[]>` to track which params belong to which path segment

### Backward Compatibility

Existing schemas with params only at leaf nodes continue to work unchanged.

## [0.1.1] - 2024-12-14

### Fixed

- Initial stable release fixes

## [0.1.0] - 2024-12-14

### Added

- Initial release
- Type-safe cache tag management for Next.js 16+
- Support for `cacheTag`, `revalidateTag`, and `updateTag`
- Scoped caching for different user contexts
- Hierarchical tag invalidation
- Cross-scope operations
- Full TypeScript type inference
