/**
 * Test schemas for use in tests.
 */

export const simpleSchema = {
  users: {
    list: {},
    byId: { _params: ["id"] as const },
  },
  config: {},
} as const;

export const simpleScopes = ["admin", "public"] as const;

export const nestedSchema = {
  feedback: {
    boards: {
      list: {},
      byId: { _params: ["id"] as const },
      bySlug: { _params: ["slug"] as const },
    },
    threads: {
      list: {},
      byId: { _params: ["id"] as const },
      byBoardId: { _params: ["boardId"] as const },
    },
  },
  blog: {
    posts: {
      list: {},
      byId: { _params: ["id"] as const },
      bySlug: { _params: ["slug"] as const },
    },
    tags: {
      list: {},
      bySlug: { _params: ["slug"] as const },
    },
  },
} as const;

export const nestedScopes = ["admin", "public", "user"] as const;

export const deeplyNestedSchema = {
  organizations: {
    byId: { _params: ["orgId"] as const },
    teams: {
      byId: { _params: ["teamId"] as const },
      members: {
        byId: { _params: ["memberId"] as const },
      },
    },
  },
} as const;

export const multiParamSchema = {
  workspaces: {
    byOwnerAndSlug: { _params: ["ownerId", "slug"] as const },
  },
} as const;
