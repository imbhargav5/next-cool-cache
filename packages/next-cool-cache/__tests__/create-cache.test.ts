import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  ecommerceSchema,
  ecommerceScopes,
  edgeCaseSchema,
  extremelyNestedSchema,
  multiParamSchema,
  nestedSchema,
  nestedScopes,
  saasSchema,
  saasScopes,
  simpleSchema,
  simpleScopes,
  wideSchema,
} from "./fixtures/schemas";

// Mock next/cache module
const mockCacheTag = jest.fn();
const mockRevalidateTag = jest.fn();
const mockUpdateTag = jest.fn();

jest.unstable_mockModule("next/cache", () => ({
  cacheTag: (...args: unknown[]) => mockCacheTag(...args),
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
}));

// Import after mocking
const { createCache } = await import("../src/create-cache");

describe("createCache", () => {
  beforeEach(() => {
    mockCacheTag.mockClear();
    mockRevalidateTag.mockClear();
    mockUpdateTag.mockClear();
  });

  describe("with simple schema", () => {
    const createTestCache = () => createCache(simpleSchema, simpleScopes);

    describe("leaf node with params", () => {
      it("cacheTag registers hierarchical tags", () => {
        const cache = createTestCache();
        cache.admin.users.byId.cacheTag({ id: "123" });

        expect(mockCacheTag).toHaveBeenCalledTimes(1);
        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/users/byId:123",
          "admin/users",
          "admin",
          "users/byId:123",
          "users"
        );
      });

      it("revalidateTag invalidates specific entry", () => {
        const cache = createTestCache();
        cache.admin.users.byId.revalidateTag({ id: "123" });

        expect(mockRevalidateTag).toHaveBeenCalledTimes(1);
        expect(mockRevalidateTag).toHaveBeenCalledWith(
          "admin/users/byId:123",
          "max"
        );
      });

      it("updateTag expires specific entry immediately", () => {
        const cache = createTestCache();
        cache.admin.users.byId.updateTag({ id: "123" });

        expect(mockUpdateTag).toHaveBeenCalledTimes(1);
        expect(mockUpdateTag).toHaveBeenCalledWith("admin/users/byId:123");
      });
    });

    describe("leaf node without params", () => {
      it("cacheTag works without arguments", () => {
        const cache = createTestCache();
        cache.admin.users.list.cacheTag();

        expect(mockCacheTag).toHaveBeenCalledTimes(1);
        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/users/list",
          "admin/users",
          "admin",
          "users/list",
          "users"
        );
      });

      it("revalidateTag works without arguments", () => {
        const cache = createTestCache();
        cache.admin.users.list.revalidateTag();

        expect(mockRevalidateTag).toHaveBeenCalledWith(
          "admin/users/list",
          "max"
        );
      });

      it("updateTag works without arguments", () => {
        const cache = createTestCache();
        cache.admin.users.list.updateTag();

        expect(mockUpdateTag).toHaveBeenCalledWith("admin/users/list");
      });
    });

    describe("root-level leaf without params", () => {
      it("cacheTag works for config", () => {
        const cache = createTestCache();
        cache.admin.config.cacheTag();

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/config",
          "admin",
          "config"
        );
      });
    });

    describe("branch node", () => {
      it("revalidateTag invalidates entire subtree", () => {
        const cache = createTestCache();
        cache.admin.users.revalidateTag();

        expect(mockRevalidateTag).toHaveBeenCalledWith("admin/users", "max");
      });

      it("updateTag updates entire subtree", () => {
        const cache = createTestCache();
        cache.admin.users.updateTag();

        expect(mockUpdateTag).toHaveBeenCalledWith("admin/users");
      });
    });

    describe("cross-scope operations", () => {
      it("unscoped revalidateTag invalidates resource across scopes", () => {
        const cache = createTestCache();
        cache.users.byId.revalidateTag({ id: "123" });

        expect(mockRevalidateTag).toHaveBeenCalledWith("users/byId:123", "max");
      });

      it("unscoped updateTag updates resource across scopes", () => {
        const cache = createTestCache();
        cache.users.byId.updateTag({ id: "123" });

        expect(mockUpdateTag).toHaveBeenCalledWith("users/byId:123");
      });

      it("unscoped branch revalidateTag", () => {
        const cache = createTestCache();
        cache.users.revalidateTag();

        expect(mockRevalidateTag).toHaveBeenCalledWith("users", "max");
      });
    });

    describe("different scopes produce different tags", () => {
      it("admin and public scopes are distinct", () => {
        const cache = createTestCache();

        cache.admin.users.byId.revalidateTag({ id: "123" });
        cache.public.users.byId.revalidateTag({ id: "123" });

        expect(mockRevalidateTag).toHaveBeenCalledWith(
          "admin/users/byId:123",
          "max"
        );
        expect(mockRevalidateTag).toHaveBeenCalledWith(
          "public/users/byId:123",
          "max"
        );
      });
    });
  });

  describe("with nested schema", () => {
    const createTestCache = () => createCache(nestedSchema, nestedScopes);

    it("handles deeply nested paths", () => {
      const cache = createTestCache();
      cache.admin.feedback.boards.byId.cacheTag({ id: "board-1" });

      expect(mockCacheTag).toHaveBeenCalledWith(
        "admin/feedback/boards/byId:board-1",
        "admin/feedback/boards",
        "admin/feedback",
        "admin",
        "feedback/boards/byId:board-1",
        "feedback/boards",
        "feedback"
      );
    });

    it("branch node at intermediate level", () => {
      const cache = createTestCache();
      cache.admin.feedback.boards.revalidateTag();

      expect(mockRevalidateTag).toHaveBeenCalledWith(
        "admin/feedback/boards",
        "max"
      );
    });

    it("branch node at top level", () => {
      const cache = createTestCache();
      cache.admin.feedback.revalidateTag();

      expect(mockRevalidateTag).toHaveBeenCalledWith("admin/feedback", "max");
    });

    it("scope root invalidation", () => {
      const cache = createTestCache();
      cache.admin.revalidateTag();

      expect(mockRevalidateTag).toHaveBeenCalledWith("admin", "max");
    });
  });

  describe("with multi-param schema", () => {
    const createTestCache = () =>
      createCache(multiParamSchema, ["admin"] as const);

    it("handles multiple params in order", () => {
      const cache = createTestCache();
      cache.admin.workspaces.byOwnerAndSlug.revalidateTag({
        ownerId: "user-1",
        slug: "my-workspace",
      });

      expect(mockRevalidateTag).toHaveBeenCalledWith(
        "admin/workspaces/byOwnerAndSlug:user-1:my-workspace",
        "max"
      );
    });
  });

  describe("_path property", () => {
    it("exposes correct path for debugging", () => {
      const cache = createCache(simpleSchema, simpleScopes);

      expect(cache.admin.users.byId._path).toBe("admin/users/byId");
      expect(cache.admin.users._path).toBe("admin/users");
      expect(cache.admin._path).toBe("admin");
      expect(cache.users.byId._path).toBe("users/byId");
      expect(cache.users._path).toBe("users");
    });
  });

  describe("with e-commerce schema", () => {
    const createTestCache = () => createCache(ecommerceSchema, ecommerceScopes);

    describe("product operations", () => {
      it("cacheTag for product by ID", () => {
        const cache = createTestCache();
        cache.admin.products.byId.cacheTag({ productId: "prod-123" });

        expect(mockCacheTag).toHaveBeenCalledTimes(1);
        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/products/byId:prod-123",
          "admin/products",
          "admin",
          "products/byId:prod-123",
          "products"
        );
      });

      it("cacheTag for product by slug", () => {
        const cache = createTestCache();
        cache.seller.products.bySlug.cacheTag({ slug: "awesome-widget" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "seller/products/bySlug:awesome-widget",
          "seller/products",
          "seller",
          "products/bySlug:awesome-widget",
          "products"
        );
      });

      it("cacheTag for product by SKU", () => {
        const cache = createTestCache();
        cache.admin.products.bySku.cacheTag({ sku: "SKU-2024-001" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/products/bySku:SKU-2024-001",
          "admin/products",
          "admin",
          "products/bySku:SKU-2024-001",
          "products"
        );
      });

      it("handles product search queries", () => {
        const cache = createTestCache();
        cache.customer.products.search.cacheTag({
          query: "wireless headphones",
        });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "customer/products/search:wireless headphones",
          "customer/products",
          "customer",
          "products/search:wireless headphones",
          "products"
        );
      });
    });

    describe("nested inventory operations", () => {
      it("cacheTag for inventory by warehouse", () => {
        const cache = createTestCache();
        cache.admin.products.inventory.byWarehouse.cacheTag({
          warehouseId: "warehouse-west",
        });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/products/inventory/byWarehouse:warehouse-west",
          "admin/products/inventory",
          "admin/products",
          "admin",
          "products/inventory/byWarehouse:warehouse-west",
          "products/inventory",
          "products"
        );
      });

      it("cacheTag for low stock items", () => {
        const cache = createTestCache();
        cache.admin.products.inventory.lowStock.cacheTag();

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/products/inventory/lowStock",
          "admin/products/inventory",
          "admin/products",
          "admin",
          "products/inventory/lowStock",
          "products/inventory",
          "products"
        );
      });

      it("invalidates all inventory with branch revalidation", () => {
        const cache = createTestCache();
        cache.admin.products.inventory.revalidateTag();

        expect(mockRevalidateTag).toHaveBeenCalledWith(
          "admin/products/inventory",
          "max"
        );
      });
    });

    describe("product reviews", () => {
      it("cacheTag for review by ID", () => {
        const cache = createTestCache();
        cache.customer.products.reviews.byId.cacheTag({ reviewId: "rev-456" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "customer/products/reviews/byId:rev-456",
          "customer/products/reviews",
          "customer/products",
          "customer",
          "products/reviews/byId:rev-456",
          "products/reviews",
          "products"
        );
      });

      it("cacheTag for reviews by rating", () => {
        const cache = createTestCache();
        cache.guest.products.reviews.byRating.cacheTag({ rating: "5" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "guest/products/reviews/byRating:5",
          "guest/products/reviews",
          "guest/products",
          "guest",
          "products/reviews/byRating:5",
          "products/reviews",
          "products"
        );
      });
    });

    describe("order operations", () => {
      it("handles order by customer", () => {
        const cache = createTestCache();
        cache.admin.orders.byCustomer.revalidateTag({ customerId: "cust-789" });

        expect(mockRevalidateTag).toHaveBeenCalledWith(
          "admin/orders/byCustomer:cust-789",
          "max"
        );
      });

      it("handles order by status", () => {
        const cache = createTestCache();
        cache.seller.orders.byStatus.cacheTag({ status: "pending" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "seller/orders/byStatus:pending",
          "seller/orders",
          "seller",
          "orders/byStatus:pending",
          "orders"
        );
      });

      it("handles nested order items", () => {
        const cache = createTestCache();
        cache.admin.orders.items.byOrderId.cacheTag({ orderId: "order-001" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/orders/items/byOrderId:order-001",
          "admin/orders/items",
          "admin/orders",
          "admin",
          "orders/items/byOrderId:order-001",
          "orders/items",
          "orders"
        );
      });

      it("handles order tracking", () => {
        const cache = createTestCache();
        cache.customer.orders.tracking.byOrderId.cacheTag({
          orderId: "order-002",
        });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "customer/orders/tracking/byOrderId:order-002",
          "customer/orders/tracking",
          "customer/orders",
          "customer",
          "orders/tracking/byOrderId:order-002",
          "orders/tracking",
          "orders"
        );
      });
    });

    describe("customer operations", () => {
      it("handles customer by email", () => {
        const cache = createTestCache();
        cache.admin.customers.byEmail.cacheTag({ email: "user@example.com" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/customers/byEmail:user@example.com",
          "admin/customers",
          "admin",
          "customers/byEmail:user@example.com",
          "customers"
        );
      });

      it("handles customer addresses", () => {
        const cache = createTestCache();
        cache.customer.customers.addresses.byCustomerId.cacheTag({
          customerId: "cust-123",
        });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "customer/customers/addresses/byCustomerId:cust-123",
          "customer/customers/addresses",
          "customer/customers",
          "customer",
          "customers/addresses/byCustomerId:cust-123",
          "customers/addresses",
          "customers"
        );
      });

      it("handles customer wishlist", () => {
        const cache = createTestCache();
        cache.customer.customers.wishlist.byCustomerId.revalidateTag({
          customerId: "cust-456",
        });

        expect(mockRevalidateTag).toHaveBeenCalledWith(
          "customer/customers/wishlist/byCustomerId:cust-456",
          "max"
        );
      });
    });

    describe("cart operations with different scopes", () => {
      it("handles cart by session ID for guests", () => {
        const cache = createTestCache();
        cache.guest.cart.bySessionId.cacheTag({ sessionId: "sess-abc123" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "guest/cart/bySessionId:sess-abc123",
          "guest/cart",
          "guest",
          "cart/bySessionId:sess-abc123",
          "cart"
        );
      });

      it("handles cart by user ID for customers", () => {
        const cache = createTestCache();
        cache.customer.cart.byUserId.cacheTag({ userId: "user-xyz" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "customer/cart/byUserId:user-xyz",
          "customer/cart",
          "customer",
          "cart/byUserId:user-xyz",
          "cart"
        );
      });
    });

    describe("category operations", () => {
      it("handles category tree", () => {
        const cache = createTestCache();
        cache.admin.categories.tree.cacheTag();

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/categories/tree",
          "admin/categories",
          "admin",
          "categories/tree",
          "categories"
        );
      });

      it("invalidates all categories", () => {
        const cache = createTestCache();
        cache.admin.categories.revalidateTag();

        expect(mockRevalidateTag).toHaveBeenCalledWith(
          "admin/categories",
          "max"
        );
      });
    });

    describe("cross-scope operations", () => {
      it("unscoped product invalidation affects all scopes", () => {
        const cache = createTestCache();
        cache.products.byId.revalidateTag({ productId: "prod-999" });

        expect(mockRevalidateTag).toHaveBeenCalledWith(
          "products/byId:prod-999",
          "max"
        );
      });

      it("unscoped orders branch invalidation", () => {
        const cache = createTestCache();
        cache.orders.revalidateTag();

        expect(mockRevalidateTag).toHaveBeenCalledWith("orders", "max");
      });
    });

    describe("all four scopes produce distinct tags", () => {
      it("each scope has unique tags", () => {
        const cache = createTestCache();

        cache.admin.products.list.cacheTag();
        cache.seller.products.list.cacheTag();
        cache.customer.products.list.cacheTag();
        cache.guest.products.list.cacheTag();

        expect(mockCacheTag).toHaveBeenCalledTimes(4);
        expect(mockCacheTag).toHaveBeenNthCalledWith(
          1,
          "admin/products/list",
          "admin/products",
          "admin",
          "products/list",
          "products"
        );
        expect(mockCacheTag).toHaveBeenNthCalledWith(
          2,
          "seller/products/list",
          "seller/products",
          "seller",
          "products/list",
          "products"
        );
        expect(mockCacheTag).toHaveBeenNthCalledWith(
          3,
          "customer/products/list",
          "customer/products",
          "customer",
          "products/list",
          "products"
        );
        expect(mockCacheTag).toHaveBeenNthCalledWith(
          4,
          "guest/products/list",
          "guest/products",
          "guest",
          "products/list",
          "products"
        );
      });
    });
  });

  describe("with SaaS schema", () => {
    const createTestCache = () => createCache(saasSchema, saasScopes);

    describe("deep navigation (6 levels)", () => {
      it("handles organization → projects → tasks → comments", () => {
        const cache = createTestCache();
        cache.orgAdmin.organizations.projects.tasks.comments.byId.cacheTag({
          commentId: "comment-123",
        });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "orgAdmin/organizations/projects/tasks/comments/byId:comment-123",
          "orgAdmin/organizations/projects/tasks/comments",
          "orgAdmin/organizations/projects/tasks",
          "orgAdmin/organizations/projects",
          "orgAdmin/organizations",
          "orgAdmin",
          "organizations/projects/tasks/comments/byId:comment-123",
          "organizations/projects/tasks/comments",
          "organizations/projects/tasks",
          "organizations/projects",
          "organizations"
        );
      });

      it("handles organization → projects → tasks → attachments", () => {
        const cache = createTestCache();
        cache.member.organizations.projects.tasks.attachments.byId.cacheTag({
          attachmentId: "attach-456",
        });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "member/organizations/projects/tasks/attachments/byId:attach-456",
          "member/organizations/projects/tasks/attachments",
          "member/organizations/projects/tasks",
          "member/organizations/projects",
          "member/organizations",
          "member",
          "organizations/projects/tasks/attachments/byId:attach-456",
          "organizations/projects/tasks/attachments",
          "organizations/projects/tasks",
          "organizations/projects",
          "organizations"
        );
      });

      it("handles organization → members → invites", () => {
        const cache = createTestCache();
        cache.orgAdmin.organizations.members.invites.byEmail.cacheTag({
          email: "newuser@company.com",
        });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "orgAdmin/organizations/members/invites/byEmail:newuser@company.com",
          "orgAdmin/organizations/members/invites",
          "orgAdmin/organizations/members",
          "orgAdmin/organizations",
          "orgAdmin",
          "organizations/members/invites/byEmail:newuser@company.com",
          "organizations/members/invites",
          "organizations/members",
          "organizations"
        );
      });
    });

    describe("settings operations", () => {
      it("handles general settings", () => {
        const cache = createTestCache();
        cache.orgAdmin.organizations.settings.general.cacheTag();

        expect(mockCacheTag).toHaveBeenCalledWith(
          "orgAdmin/organizations/settings/general",
          "orgAdmin/organizations/settings",
          "orgAdmin/organizations",
          "orgAdmin",
          "organizations/settings/general",
          "organizations/settings",
          "organizations"
        );
      });

      it("handles billing settings", () => {
        const cache = createTestCache();
        cache.superadmin.organizations.settings.billing.cacheTag();

        expect(mockCacheTag).toHaveBeenCalledWith(
          "superadmin/organizations/settings/billing",
          "superadmin/organizations/settings",
          "superadmin/organizations",
          "superadmin",
          "organizations/settings/billing",
          "organizations/settings",
          "organizations"
        );
      });

      it("handles security settings", () => {
        const cache = createTestCache();
        cache.orgAdmin.organizations.settings.security.updateTag();

        expect(mockUpdateTag).toHaveBeenCalledWith(
          "orgAdmin/organizations/settings/security"
        );
      });
    });

    describe("billing operations", () => {
      it("handles invoices", () => {
        const cache = createTestCache();
        cache.orgAdmin.organizations.billing.invoices.byId.cacheTag({
          invoiceId: "inv-2024-001",
        });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "orgAdmin/organizations/billing/invoices/byId:inv-2024-001",
          "orgAdmin/organizations/billing/invoices",
          "orgAdmin/organizations/billing",
          "orgAdmin/organizations",
          "orgAdmin",
          "organizations/billing/invoices/byId:inv-2024-001",
          "organizations/billing/invoices",
          "organizations/billing",
          "organizations"
        );
      });

      it("handles current subscription", () => {
        const cache = createTestCache();
        cache.member.organizations.billing.subscriptions.current.cacheTag();

        expect(mockCacheTag).toHaveBeenCalledWith(
          "member/organizations/billing/subscriptions/current",
          "member/organizations/billing/subscriptions",
          "member/organizations/billing",
          "member/organizations",
          "member",
          "organizations/billing/subscriptions/current",
          "organizations/billing/subscriptions",
          "organizations/billing",
          "organizations"
        );
      });

      it("handles subscription history", () => {
        const cache = createTestCache();
        cache.superadmin.organizations.billing.subscriptions.history.cacheTag();

        expect(mockCacheTag).toHaveBeenCalledWith(
          "superadmin/organizations/billing/subscriptions/history",
          "superadmin/organizations/billing/subscriptions",
          "superadmin/organizations/billing",
          "superadmin/organizations",
          "superadmin",
          "organizations/billing/subscriptions/history",
          "organizations/billing/subscriptions",
          "organizations/billing",
          "organizations"
        );
      });
    });

    describe("task operations", () => {
      it("handles task by status", () => {
        const cache = createTestCache();
        cache.manager.organizations.projects.tasks.byStatus.cacheTag({
          status: "in-progress",
        });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "manager/organizations/projects/tasks/byStatus:in-progress",
          "manager/organizations/projects/tasks",
          "manager/organizations/projects",
          "manager/organizations",
          "manager",
          "organizations/projects/tasks/byStatus:in-progress",
          "organizations/projects/tasks",
          "organizations/projects",
          "organizations"
        );
      });

      it("handles task by assignee", () => {
        const cache = createTestCache();
        cache.member.organizations.projects.tasks.byAssignee.cacheTag({
          assigneeId: "user-john",
        });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "member/organizations/projects/tasks/byAssignee:user-john",
          "member/organizations/projects/tasks",
          "member/organizations/projects",
          "member/organizations",
          "member",
          "organizations/projects/tasks/byAssignee:user-john",
          "organizations/projects/tasks",
          "organizations/projects",
          "organizations"
        );
      });
    });

    describe("audit logs", () => {
      it("handles audit logs by organization", () => {
        const cache = createTestCache();
        cache.superadmin.audit.logs.byOrgId.cacheTag({ orgId: "org-acme" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "superadmin/audit/logs/byOrgId:org-acme",
          "superadmin/audit/logs",
          "superadmin/audit",
          "superadmin",
          "audit/logs/byOrgId:org-acme",
          "audit/logs",
          "audit"
        );
      });

      it("handles audit logs by action", () => {
        const cache = createTestCache();
        cache.superadmin.audit.logs.byAction.cacheTag({ action: "user.login" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "superadmin/audit/logs/byAction:user.login",
          "superadmin/audit/logs",
          "superadmin/audit",
          "superadmin",
          "audit/logs/byAction:user.login",
          "audit/logs",
          "audit"
        );
      });
    });

    describe("notifications", () => {
      it("handles notifications by user", () => {
        const cache = createTestCache();
        cache.member.notifications.byUserId.cacheTag({ userId: "user-123" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "member/notifications/byUserId:user-123",
          "member/notifications",
          "member",
          "notifications/byUserId:user-123",
          "notifications"
        );
      });

      it("handles unread notifications", () => {
        const cache = createTestCache();
        cache.member.notifications.unread.cacheTag();

        expect(mockCacheTag).toHaveBeenCalledWith(
          "member/notifications/unread",
          "member/notifications",
          "member",
          "notifications/unread",
          "notifications"
        );
      });
    });

    describe("all six scopes produce distinct tags", () => {
      it("each scope is unique", () => {
        const cache = createTestCache();

        cache.superadmin.organizations.list.cacheTag();
        cache.orgAdmin.organizations.list.cacheTag();
        cache.manager.organizations.list.cacheTag();
        cache.member.organizations.list.cacheTag();
        cache.viewer.organizations.list.cacheTag();
        cache.api.organizations.list.cacheTag();

        expect(mockCacheTag).toHaveBeenCalledTimes(6);

        const scopes = [
          "superadmin",
          "orgAdmin",
          "manager",
          "member",
          "viewer",
          "api",
        ];
        scopes.forEach((scope, index) => {
          expect(mockCacheTag).toHaveBeenNthCalledWith(
            index + 1,
            `${scope}/organizations/list`,
            `${scope}/organizations`,
            scope,
            "organizations/list",
            "organizations"
          );
        });
      });
    });

    describe("branch invalidations at different levels", () => {
      it("invalidates entire organization scope", () => {
        const cache = createTestCache();
        cache.orgAdmin.organizations.revalidateTag();

        expect(mockRevalidateTag).toHaveBeenCalledWith(
          "orgAdmin/organizations",
          "max"
        );
      });

      it("invalidates all projects", () => {
        const cache = createTestCache();
        cache.manager.organizations.projects.revalidateTag();

        expect(mockRevalidateTag).toHaveBeenCalledWith(
          "manager/organizations/projects",
          "max"
        );
      });

      it("invalidates all tasks", () => {
        const cache = createTestCache();
        cache.member.organizations.projects.tasks.revalidateTag();

        expect(mockRevalidateTag).toHaveBeenCalledWith(
          "member/organizations/projects/tasks",
          "max"
        );
      });

      it("invalidates all comments", () => {
        const cache = createTestCache();
        cache.member.organizations.projects.tasks.comments.revalidateTag();

        expect(mockRevalidateTag).toHaveBeenCalledWith(
          "member/organizations/projects/tasks/comments",
          "max"
        );
      });
    });
  });

  describe("with extremely nested schema", () => {
    const createTestCache = () =>
      createCache(extremelyNestedSchema, ["admin"] as const);

    it("navigates to 6th level leaf with params", () => {
      const cache = createTestCache();
      cache.admin.level1.level2.level3.level4.level5.level6.byId.cacheTag({
        l6Id: "deep-value",
      });

      expect(mockCacheTag).toHaveBeenCalledWith(
        "admin/level1/level2/level3/level4/level5/level6/byId:deep-value",
        "admin/level1/level2/level3/level4/level5/level6",
        "admin/level1/level2/level3/level4/level5",
        "admin/level1/level2/level3/level4",
        "admin/level1/level2/level3",
        "admin/level1/level2",
        "admin/level1",
        "admin",
        "level1/level2/level3/level4/level5/level6/byId:deep-value",
        "level1/level2/level3/level4/level5/level6",
        "level1/level2/level3/level4/level5",
        "level1/level2/level3/level4",
        "level1/level2/level3",
        "level1/level2",
        "level1"
      );
    });

    it("navigates to 6th level leaf without params", () => {
      const cache = createTestCache();
      cache.admin.level1.level2.level3.level4.level5.level6.data.cacheTag();

      expect(mockCacheTag).toHaveBeenCalledWith(
        "admin/level1/level2/level3/level4/level5/level6/data",
        "admin/level1/level2/level3/level4/level5/level6",
        "admin/level1/level2/level3/level4/level5",
        "admin/level1/level2/level3/level4",
        "admin/level1/level2/level3",
        "admin/level1/level2",
        "admin/level1",
        "admin",
        "level1/level2/level3/level4/level5/level6/data",
        "level1/level2/level3/level4/level5/level6",
        "level1/level2/level3/level4/level5",
        "level1/level2/level3/level4",
        "level1/level2/level3",
        "level1/level2",
        "level1"
      );
    });

    it("invalidates at each level", () => {
      const cache = createTestCache();

      cache.admin.level1.revalidateTag();
      expect(mockRevalidateTag).toHaveBeenCalledWith("admin/level1", "max");

      cache.admin.level1.level2.revalidateTag();
      expect(mockRevalidateTag).toHaveBeenCalledWith(
        "admin/level1/level2",
        "max"
      );

      cache.admin.level1.level2.level3.revalidateTag();
      expect(mockRevalidateTag).toHaveBeenCalledWith(
        "admin/level1/level2/level3",
        "max"
      );

      cache.admin.level1.level2.level3.level4.revalidateTag();
      expect(mockRevalidateTag).toHaveBeenCalledWith(
        "admin/level1/level2/level3/level4",
        "max"
      );

      cache.admin.level1.level2.level3.level4.level5.revalidateTag();
      expect(mockRevalidateTag).toHaveBeenCalledWith(
        "admin/level1/level2/level3/level4/level5",
        "max"
      );

      cache.admin.level1.level2.level3.level4.level5.level6.revalidateTag();
      expect(mockRevalidateTag).toHaveBeenCalledWith(
        "admin/level1/level2/level3/level4/level5/level6",
        "max"
      );
    });

    it("handles byId at each level", () => {
      const cache = createTestCache();

      cache.admin.level1.byId.cacheTag({ l1Id: "1" });
      expect(mockCacheTag).toHaveBeenLastCalledWith(
        "admin/level1/byId:1",
        "admin/level1",
        "admin",
        "level1/byId:1",
        "level1"
      );

      cache.admin.level1.level2.byId.cacheTag({ l2Id: "2" });
      expect(mockCacheTag).toHaveBeenLastCalledWith(
        "admin/level1/level2/byId:2",
        "admin/level1/level2",
        "admin/level1",
        "admin",
        "level1/level2/byId:2",
        "level1/level2",
        "level1"
      );

      cache.admin.level1.level2.level3.byId.cacheTag({ l3Id: "3" });
      expect(mockCacheTag).toHaveBeenLastCalledWith(
        "admin/level1/level2/level3/byId:3",
        "admin/level1/level2/level3",
        "admin/level1/level2",
        "admin/level1",
        "admin",
        "level1/level2/level3/byId:3",
        "level1/level2/level3",
        "level1/level2",
        "level1"
      );
    });

    describe("unscoped operations at depth", () => {
      it("unscoped invalidation at deep level", () => {
        const cache = createTestCache();
        cache.level1.level2.level3.level4.level5.level6.byId.revalidateTag({
          l6Id: "value",
        });

        expect(mockRevalidateTag).toHaveBeenCalledWith(
          "level1/level2/level3/level4/level5/level6/byId:value",
          "max"
        );
      });

      it("unscoped branch invalidation at depth", () => {
        const cache = createTestCache();
        cache.level1.level2.level3.level4.revalidateTag();

        expect(mockRevalidateTag).toHaveBeenCalledWith(
          "level1/level2/level3/level4",
          "max"
        );
      });
    });
  });

  describe("with edge case schema", () => {
    const createTestCache = () =>
      createCache(edgeCaseSchema, ["admin"] as const);

    describe("email addresses", () => {
      it("handles standard email", () => {
        const cache = createTestCache();
        cache.admin.users.byEmail.cacheTag({ email: "user@example.com" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/users/byEmail:user@example.com",
          "admin/users",
          "admin",
          "users/byEmail:user@example.com",
          "users"
        );
      });

      it("handles email with plus sign", () => {
        const cache = createTestCache();
        cache.admin.users.byEmail.cacheTag({ email: "user+tag@example.com" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/users/byEmail:user+tag@example.com",
          "admin/users",
          "admin",
          "users/byEmail:user+tag@example.com",
          "users"
        );
      });

      it("handles email with subdomain", () => {
        const cache = createTestCache();
        cache.admin.users.byEmail.cacheTag({
          email: "admin@mail.company.co.uk",
        });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/users/byEmail:admin@mail.company.co.uk",
          "admin/users",
          "admin",
          "users/byEmail:admin@mail.company.co.uk",
          "users"
        );
      });
    });

    describe("composite keys with 3 parameters", () => {
      it("handles three params in order", () => {
        const cache = createTestCache();
        cache.admin.users.byCompositeKey.cacheTag({
          tenantId: "tenant-123",
          userId: "user-456",
          version: "v2",
        });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/users/byCompositeKey:tenant-123:user-456:v2",
          "admin/users",
          "admin",
          "users/byCompositeKey:tenant-123:user-456:v2",
          "users"
        );
      });

      it("revalidates composite key", () => {
        const cache = createTestCache();
        cache.admin.users.byCompositeKey.revalidateTag({
          tenantId: "t1",
          userId: "u1",
          version: "v1",
        });

        expect(mockRevalidateTag).toHaveBeenCalledWith(
          "admin/users/byCompositeKey:t1:u1:v1",
          "max"
        );
      });
    });

    describe("file paths", () => {
      it("handles simple path", () => {
        const cache = createTestCache();
        cache.admin.files.byPath.cacheTag({ path: "documents/report.pdf" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/files/byPath:documents/report.pdf",
          "admin/files",
          "admin",
          "files/byPath:documents/report.pdf",
          "files"
        );
      });

      it("handles deeply nested path", () => {
        const cache = createTestCache();
        cache.admin.files.byPath.cacheTag({
          path: "home/user/projects/app/src/index.ts",
        });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/files/byPath:home/user/projects/app/src/index.ts",
          "admin/files",
          "admin",
          "files/byPath:home/user/projects/app/src/index.ts",
          "files"
        );
      });
    });

    describe("timestamps and dates", () => {
      it("handles ISO timestamp", () => {
        const cache = createTestCache();
        cache.admin.events.byTimestamp.cacheTag({
          timestamp: "2024-12-09T10:30:00.000Z",
        });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/events/byTimestamp:2024-12-09T10:30:00.000Z",
          "admin/events",
          "admin",
          "events/byTimestamp:2024-12-09T10:30:00.000Z",
          "events"
        );
      });

      it("handles date range with two params", () => {
        const cache = createTestCache();
        cache.admin.events.byDateRange.cacheTag({
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/events/byDateRange:2024-01-01:2024-12-31",
          "admin/events",
          "admin",
          "events/byDateRange:2024-01-01:2024-12-31",
          "events"
        );
      });
    });

    describe("search queries with special characters", () => {
      it("handles query with spaces", () => {
        const cache = createTestCache();
        cache.admin.search.byQuery.cacheTag({ query: "hello world" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/search/byQuery:hello world",
          "admin/search",
          "admin",
          "search/byQuery:hello world",
          "search"
        );
      });

      it("handles query with special characters", () => {
        const cache = createTestCache();
        cache.admin.search.byQuery.cacheTag({
          query: "price<100 AND status:active",
        });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/search/byQuery:price<100 AND status:active",
          "admin/search",
          "admin",
          "search/byQuery:price<100 AND status:active",
          "search"
        );
      });

      it("handles query with quotes", () => {
        const cache = createTestCache();
        cache.admin.search.byQuery.cacheTag({ query: '"exact phrase"' });

        expect(mockCacheTag).toHaveBeenCalledWith(
          'admin/search/byQuery:"exact phrase"',
          "admin/search",
          "admin",
          'search/byQuery:"exact phrase"',
          "search"
        );
      });
    });

    describe("API versions", () => {
      it("handles simple version", () => {
        const cache = createTestCache();
        cache.admin.api.byVersion.cacheTag({ version: "v1" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/api/byVersion:v1",
          "admin/api",
          "admin",
          "api/byVersion:v1",
          "api"
        );
      });

      it("handles semantic version", () => {
        const cache = createTestCache();
        cache.admin.api.byVersion.cacheTag({ version: "2.1.0" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/api/byVersion:2.1.0",
          "admin/api",
          "admin",
          "api/byVersion:2.1.0",
          "api"
        );
      });

      it("handles version with beta suffix", () => {
        const cache = createTestCache();
        cache.admin.api.byVersion.cacheTag({ version: "3.0.0-beta.1" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/api/byVersion:3.0.0-beta.1",
          "admin/api",
          "admin",
          "api/byVersion:3.0.0-beta.1",
          "api"
        );
      });
    });

    describe("empty and unusual string values", () => {
      it("handles empty string param", () => {
        const cache = createTestCache();
        cache.admin.search.byQuery.cacheTag({ query: "" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/search/byQuery:",
          "admin/search",
          "admin",
          "search/byQuery:",
          "search"
        );
      });

      it("handles numeric-looking string", () => {
        const cache = createTestCache();
        cache.admin.api.byVersion.cacheTag({ version: "123456" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/api/byVersion:123456",
          "admin/api",
          "admin",
          "api/byVersion:123456",
          "api"
        );
      });

      it("handles string with colons", () => {
        const cache = createTestCache();
        cache.admin.events.byTimestamp.cacheTag({ timestamp: "10:30:45" });

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/events/byTimestamp:10:30:45",
          "admin/events",
          "admin",
          "events/byTimestamp:10:30:45",
          "events"
        );
      });
    });
  });

  describe("with wide schema", () => {
    const createTestCache = () =>
      createCache(wideSchema, ["admin", "user"] as const);

    describe("dashboard siblings", () => {
      it("handles stats", () => {
        const cache = createTestCache();
        cache.admin.dashboard.stats.cacheTag();

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/dashboard/stats",
          "admin/dashboard",
          "admin",
          "dashboard/stats",
          "dashboard"
        );
      });

      it("handles charts", () => {
        const cache = createTestCache();
        cache.admin.dashboard.charts.cacheTag();

        expect(mockCacheTag).toHaveBeenCalledWith(
          "admin/dashboard/charts",
          "admin/dashboard",
          "admin",
          "dashboard/charts",
          "dashboard"
        );
      });

      it("handles widgets", () => {
        const cache = createTestCache();
        cache.user.dashboard.widgets.cacheTag();

        expect(mockCacheTag).toHaveBeenCalledWith(
          "user/dashboard/widgets",
          "user/dashboard",
          "user",
          "dashboard/widgets",
          "dashboard"
        );
      });

      it("handles all 8 dashboard siblings independently", () => {
        const cache = createTestCache();
        const siblings = [
          "stats",
          "charts",
          "widgets",
          "notifications",
          "quickActions",
          "recentActivity",
          "favorites",
          "shortcuts",
        ] as const;

        siblings.forEach((sibling) => {
          (cache.admin.dashboard as Record<string, { cacheTag: () => void }>)[
            sibling
          ].cacheTag();
        });

        expect(mockCacheTag).toHaveBeenCalledTimes(8);

        siblings.forEach((sibling, index) => {
          expect(mockCacheTag).toHaveBeenNthCalledWith(
            index + 1,
            `admin/dashboard/${sibling}`,
            "admin/dashboard",
            "admin",
            `dashboard/${sibling}`,
            "dashboard"
          );
        });
      });
    });

    describe("analytics siblings", () => {
      it("handles all 10 analytics siblings independently", () => {
        const cache = createTestCache();
        const siblings = [
          "pageViews",
          "uniqueVisitors",
          "bounceRate",
          "sessionDuration",
          "conversionRate",
          "revenue",
          "topPages",
          "referrers",
          "devices",
          "locations",
        ] as const;

        siblings.forEach((sibling) => {
          (cache.admin.analytics as Record<string, { cacheTag: () => void }>)[
            sibling
          ].cacheTag();
        });

        expect(mockCacheTag).toHaveBeenCalledTimes(10);

        siblings.forEach((sibling, index) => {
          expect(mockCacheTag).toHaveBeenNthCalledWith(
            index + 1,
            `admin/analytics/${sibling}`,
            "admin/analytics",
            "admin",
            `analytics/${sibling}`,
            "analytics"
          );
        });
      });
    });

    describe("branch invalidation affects all siblings", () => {
      it("invalidating dashboard branch affects all dashboard children", () => {
        const cache = createTestCache();
        cache.admin.dashboard.revalidateTag();

        expect(mockRevalidateTag).toHaveBeenCalledWith(
          "admin/dashboard",
          "max"
        );
      });

      it("invalidating analytics branch affects all analytics children", () => {
        const cache = createTestCache();
        cache.user.analytics.revalidateTag();

        expect(mockRevalidateTag).toHaveBeenCalledWith("user/analytics", "max");
      });

      it("invalidating unscoped dashboard", () => {
        const cache = createTestCache();
        cache.dashboard.revalidateTag();

        expect(mockRevalidateTag).toHaveBeenCalledWith("dashboard", "max");
      });
    });
  });
});
