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

/**
 * E-commerce schema - realistic complexity with multiple resource types,
 * nested resources, and various lookup patterns.
 */
export const ecommerceSchema = {
  products: {
    list: {},
    byId: { _params: ["productId"] as const },
    bySlug: { _params: ["slug"] as const },
    bySku: { _params: ["sku"] as const },
    byCategory: { _params: ["categoryId"] as const },
    search: { _params: ["query"] as const },
    inventory: {
      byWarehouse: { _params: ["warehouseId"] as const },
      lowStock: {},
    },
    reviews: {
      list: {},
      byId: { _params: ["reviewId"] as const },
      byRating: { _params: ["rating"] as const },
    },
  },
  orders: {
    list: {},
    byId: { _params: ["orderId"] as const },
    byCustomer: { _params: ["customerId"] as const },
    byStatus: { _params: ["status"] as const },
    items: {
      byOrderId: { _params: ["orderId"] as const },
    },
    tracking: {
      byOrderId: { _params: ["orderId"] as const },
    },
  },
  customers: {
    byId: { _params: ["customerId"] as const },
    byEmail: { _params: ["email"] as const },
    addresses: {
      byCustomerId: { _params: ["customerId"] as const },
    },
    wishlist: {
      byCustomerId: { _params: ["customerId"] as const },
    },
  },
  categories: {
    list: {},
    byId: { _params: ["categoryId"] as const },
    bySlug: { _params: ["slug"] as const },
    tree: {},
  },
  cart: {
    bySessionId: { _params: ["sessionId"] as const },
    byUserId: { _params: ["userId"] as const },
  },
} as const;

export const ecommerceScopes = [
  "admin",
  "seller",
  "customer",
  "guest",
] as const;

/**
 * SaaS multi-tenant schema - deep nesting (6+ levels) with many scopes.
 * Tests complex organizational hierarchies.
 */
export const saasSchema = {
  organizations: {
    list: {},
    byId: { _params: ["orgId"] as const },
    bySlug: { _params: ["slug"] as const },
    settings: {
      general: {},
      billing: {},
      security: {},
    },
    members: {
      list: {},
      byId: { _params: ["memberId"] as const },
      byRole: { _params: ["role"] as const },
      invites: {
        list: {},
        byId: { _params: ["inviteId"] as const },
        byEmail: { _params: ["email"] as const },
      },
    },
    projects: {
      list: {},
      byId: { _params: ["projectId"] as const },
      bySlug: { _params: ["slug"] as const },
      tasks: {
        list: {},
        byId: { _params: ["taskId"] as const },
        byStatus: { _params: ["status"] as const },
        byAssignee: { _params: ["assigneeId"] as const },
        comments: {
          list: {},
          byId: { _params: ["commentId"] as const },
        },
        attachments: {
          list: {},
          byId: { _params: ["attachmentId"] as const },
        },
      },
      milestones: {
        list: {},
        byId: { _params: ["milestoneId"] as const },
      },
    },
    billing: {
      invoices: {
        list: {},
        byId: { _params: ["invoiceId"] as const },
      },
      subscriptions: {
        current: {},
        history: {},
      },
    },
  },
  notifications: {
    byUserId: { _params: ["userId"] as const },
    unread: {},
  },
  audit: {
    logs: {
      byOrgId: { _params: ["orgId"] as const },
      byUserId: { _params: ["userId"] as const },
      byAction: { _params: ["action"] as const },
    },
  },
} as const;

export const saasScopes = [
  "superadmin",
  "orgAdmin",
  "manager",
  "member",
  "viewer",
  "api",
] as const;

/**
 * Extremely nested schema - tests 6 levels of depth.
 */
export const extremelyNestedSchema = {
  level1: {
    byId: { _params: ["l1Id"] as const },
    level2: {
      byId: { _params: ["l2Id"] as const },
      level3: {
        byId: { _params: ["l3Id"] as const },
        level4: {
          byId: { _params: ["l4Id"] as const },
          level5: {
            byId: { _params: ["l5Id"] as const },
            level6: {
              byId: { _params: ["l6Id"] as const },
              data: {},
            },
          },
        },
      },
    },
  },
} as const;

/**
 * Edge case schema - tests special characters, composite keys, and unusual values.
 */
export const edgeCaseSchema = {
  users: {
    byEmail: { _params: ["email"] as const },
    byCompositeKey: { _params: ["tenantId", "userId", "version"] as const },
  },
  files: {
    byPath: { _params: ["path"] as const },
  },
  events: {
    byTimestamp: { _params: ["timestamp"] as const },
    byDateRange: { _params: ["startDate", "endDate"] as const },
  },
  search: {
    byQuery: { _params: ["query"] as const },
  },
  api: {
    byVersion: { _params: ["version"] as const },
  },
} as const;

/**
 * Wide schema - tests many siblings at the same level.
 */
export const wideSchema = {
  dashboard: {
    stats: {},
    charts: {},
    widgets: {},
    notifications: {},
    quickActions: {},
    recentActivity: {},
    favorites: {},
    shortcuts: {},
  },
  analytics: {
    pageViews: {},
    uniqueVisitors: {},
    bounceRate: {},
    sessionDuration: {},
    conversionRate: {},
    revenue: {},
    topPages: {},
    referrers: {},
    devices: {},
    locations: {},
  },
} as const;
