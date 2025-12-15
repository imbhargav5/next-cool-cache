import {
  buildAllTags,
  buildAllTagsWithEmbeddedParams,
  buildAncestorTags,
  buildAncestorTagsWithEmbeddedParams,
  buildScopedTag,
  buildTag,
  buildTagWithEmbeddedParams,
  buildUnscopedTags,
  buildUnscopedTagsWithEmbeddedParams,
} from "../src/tag-builder";

describe("tag-builder", () => {
  describe("buildTag", () => {
    it("builds tag for leaf with single param", () => {
      expect(buildTag(["users", "byId"], { id: "123" })).toBe("users/byId:123");
    });

    it("builds tag for leaf with multiple params", () => {
      expect(
        buildTag(["organizations", "teams", "members"], {
          orgId: "org-1",
          teamId: "team-2",
          memberId: "member-3",
        })
      ).toBe("organizations/teams/members:org-1:team-2:member-3");
    });

    it("builds tag for leaf without params", () => {
      expect(buildTag(["users", "list"], {})).toBe("users/list");
    });

    it("builds tag for single-level path", () => {
      expect(buildTag(["config"], {})).toBe("config");
    });

    it("handles special characters in param values", () => {
      expect(
        buildTag(["users", "byEmail"], { email: "user@example.com" })
      ).toBe("users/byEmail:user@example.com");
    });

    it("handles UUID param values", () => {
      expect(
        buildTag(["users", "byId"], {
          id: "550e8400-e29b-41d4-a716-446655440000",
        })
      ).toBe("users/byId:550e8400-e29b-41d4-a716-446655440000");
    });
  });

  describe("buildAncestorTags", () => {
    it("returns empty array for single-level path", () => {
      expect(buildAncestorTags(["users"])).toEqual([]);
    });

    it("returns parent for two-level path", () => {
      expect(buildAncestorTags(["users", "byId"])).toEqual(["users"]);
    });

    it("returns all ancestors for multi-level path", () => {
      expect(buildAncestorTags(["feedback", "threads", "byId"])).toEqual([
        "feedback",
        "feedback/threads",
      ]);
    });

    it("returns all ancestors for deeply nested path", () => {
      expect(buildAncestorTags(["a", "b", "c", "d", "e"])).toEqual([
        "a",
        "a/b",
        "a/b/c",
        "a/b/c/d",
      ]);
    });
  });

  describe("buildScopedTag", () => {
    it("prefixes tag with scope", () => {
      expect(buildScopedTag("admin", "users/byId:123")).toBe(
        "admin/users/byId:123"
      );
    });

    it("handles branch tag", () => {
      expect(buildScopedTag("public", "feedback/boards")).toBe(
        "public/feedback/boards"
      );
    });

    it("handles single-level tag", () => {
      expect(buildScopedTag("user", "config")).toBe("user/config");
    });
  });

  describe("buildAllTags", () => {
    it("builds all hierarchical tags for scoped leaf with params", () => {
      const tags = buildAllTags(["users", "byId"], ["admin"], { id: "123" });

      expect(tags).toEqual([
        "admin/users/byId:123", // scoped leaf
        "admin/users", // scoped ancestor
        "admin", // scope root
        "users/byId:123", // unscoped leaf
        "users", // unscoped ancestor
      ]);
    });

    it("builds tags for scoped leaf without params", () => {
      const tags = buildAllTags(["users", "list"], ["admin"], {});

      expect(tags).toEqual([
        "admin/users/list",
        "admin/users",
        "admin",
        "users/list",
        "users",
      ]);
    });

    it("builds tags for deeply nested path", () => {
      const tags = buildAllTags(
        ["feedback", "threads", "comments"],
        ["public"],
        { threadId: "t1", commentId: "c1" }
      );

      expect(tags).toEqual([
        "public/feedback/threads/comments:t1:c1",
        "public/feedback/threads",
        "public/feedback",
        "public",
        "feedback/threads/comments:t1:c1",
        "feedback/threads",
        "feedback",
      ]);
    });

    it("builds tags for single-level resource", () => {
      const tags = buildAllTags(["config"], ["admin"], {});

      expect(tags).toEqual(["admin/config", "admin", "config"]);
    });
  });

  describe("buildUnscopedTags", () => {
    it("builds unscoped hierarchical tags with params", () => {
      const tags = buildUnscopedTags(["users", "byId"], { id: "123" });

      expect(tags).toEqual(["users/byId:123", "users"]);
    });

    it("builds unscoped hierarchical tags without params", () => {
      const tags = buildUnscopedTags(["feedback", "boards", "list"], {});

      expect(tags).toEqual([
        "feedback/boards/list",
        "feedback/boards",
        "feedback",
      ]);
    });

    it("builds single tag for root-level resource", () => {
      const tags = buildUnscopedTags(["config"], {});

      expect(tags).toEqual(["config"]);
    });
  });

  describe("edge cases for buildTag", () => {
    it("handles very long parameter values", () => {
      const longValue = "a".repeat(200);
      expect(buildTag(["users", "byId"], { id: longValue })).toBe(
        `users/byId:${"a".repeat(200)}`
      );
    });

    it("handles parameter values with colons", () => {
      expect(buildTag(["events", "byTime"], { time: "10:30:45" })).toBe(
        "events/byTime:10:30:45"
      );
    });

    it("handles parameter values with forward slashes", () => {
      expect(
        buildTag(["files", "byPath"], { path: "home/user/docs/file.txt" })
      ).toBe("files/byPath:home/user/docs/file.txt");
    });

    it("handles empty string parameter", () => {
      expect(buildTag(["search", "byQuery"], { query: "" })).toBe(
        "search/byQuery:"
      );
    });

    it("handles numeric-looking string parameter", () => {
      expect(buildTag(["items", "byId"], { id: "12345" })).toBe(
        "items/byId:12345"
      );
    });

    it("handles parameter with special Unicode characters", () => {
      expect(buildTag(["users", "byName"], { name: "日本語ユーザー" })).toBe(
        "users/byName:日本語ユーザー"
      );
    });

    it("handles parameter with emoji", () => {
      expect(buildTag(["posts", "byTitle"], { title: "Hello 👋 World" })).toBe(
        "posts/byTitle:Hello 👋 World"
      );
    });

    it("handles parameter with whitespace", () => {
      expect(
        buildTag(["search", "byQuery"], { query: "  spaced  query  " })
      ).toBe("search/byQuery:  spaced  query  ");
    });

    it("handles parameter with newlines", () => {
      expect(buildTag(["content", "byText"], { text: "line1\nline2" })).toBe(
        "content/byText:line1\nline2"
      );
    });

    it("handles parameter with tabs", () => {
      expect(buildTag(["data", "byValue"], { value: "col1\tcol2" })).toBe(
        "data/byValue:col1\tcol2"
      );
    });

    it("handles URL as parameter value", () => {
      expect(
        buildTag(["links", "byUrl"], {
          url: "https://example.com/path?q=1&b=2",
        })
      ).toBe("links/byUrl:https://example.com/path?q=1&b=2");
    });

    it("handles JSON-like string as parameter", () => {
      expect(buildTag(["data", "byJson"], { json: '{"key":"value"}' })).toBe(
        'data/byJson:{"key":"value"}'
      );
    });

    it("handles multiple params with special characters", () => {
      expect(
        buildTag(["composite", "byMultiple"], {
          email: "user@test.com",
          path: "a/b/c",
          time: "10:30",
        })
      ).toBe("composite/byMultiple:user@test.com:a/b/c:10:30");
    });
  });

  describe("stress tests for buildAncestorTags", () => {
    it("handles 6 level deep path", () => {
      expect(buildAncestorTags(["l1", "l2", "l3", "l4", "l5", "l6"])).toEqual([
        "l1",
        "l1/l2",
        "l1/l2/l3",
        "l1/l2/l3/l4",
        "l1/l2/l3/l4/l5",
      ]);
    });

    it("handles 8 level deep path", () => {
      expect(
        buildAncestorTags(["a", "b", "c", "d", "e", "f", "g", "h"])
      ).toEqual([
        "a",
        "a/b",
        "a/b/c",
        "a/b/c/d",
        "a/b/c/d/e",
        "a/b/c/d/e/f",
        "a/b/c/d/e/f/g",
      ]);
    });

    it("handles 10 level deep path", () => {
      const path = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
      const ancestors = buildAncestorTags(path);

      expect(ancestors.length).toBe(9);
      expect(ancestors[0]).toBe("a");
      expect(ancestors[8]).toBe("a/b/c/d/e/f/g/h/i");
    });

    it("handles path with long segment names", () => {
      expect(
        buildAncestorTags([
          "organizations",
          "departments",
          "teams",
          "members",
          "permissions",
        ])
      ).toEqual([
        "organizations",
        "organizations/departments",
        "organizations/departments/teams",
        "organizations/departments/teams/members",
      ]);
    });
  });

  describe("comprehensive buildAllTags tests", () => {
    it("builds tags for deeply nested path with params", () => {
      const tags = buildAllTags(
        ["org", "team", "member", "task", "comment"],
        ["admin"],
        { commentId: "c123" }
      );

      expect(tags).toEqual([
        "admin/org/team/member/task/comment:c123",
        "admin/org/team/member/task",
        "admin/org/team/member",
        "admin/org/team",
        "admin/org",
        "admin",
        "org/team/member/task/comment:c123",
        "org/team/member/task",
        "org/team/member",
        "org/team",
        "org",
      ]);
    });

    it("builds tags with multiple params in deeply nested path", () => {
      const tags = buildAllTags(
        ["data", "records", "byComposite"],
        ["public"],
        { tenantId: "t1", recordId: "r1", version: "v1" }
      );

      expect(tags).toEqual([
        "public/data/records/byComposite:t1:r1:v1",
        "public/data/records",
        "public/data",
        "public",
        "data/records/byComposite:t1:r1:v1",
        "data/records",
        "data",
      ]);
    });

    it("builds tags with special characters in params", () => {
      const tags = buildAllTags(["users", "byEmail"], ["admin"], {
        email: "user+test@example.com",
      });

      expect(tags).toEqual([
        "admin/users/byEmail:user+test@example.com",
        "admin/users",
        "admin",
        "users/byEmail:user+test@example.com",
        "users",
      ]);
    });
  });

  describe("comprehensive buildUnscopedTags tests", () => {
    it("builds unscoped tags for deeply nested path", () => {
      const tags = buildUnscopedTags(
        ["org", "project", "task", "subtask", "item"],
        { itemId: "i1" }
      );

      expect(tags).toEqual([
        "org/project/task/subtask/item:i1",
        "org/project/task/subtask",
        "org/project/task",
        "org/project",
        "org",
      ]);
    });

    it("builds unscoped tags with multiple params", () => {
      const tags = buildUnscopedTags(["workspace", "byOwnerAndRepo"], {
        owner: "acme",
        repo: "project",
      });

      expect(tags).toEqual([
        "workspace/byOwnerAndRepo:acme:project",
        "workspace",
      ]);
    });

    it("builds unscoped tags with empty params", () => {
      const tags = buildUnscopedTags(["dashboard", "widgets", "list"], {});

      expect(tags).toEqual([
        "dashboard/widgets/list",
        "dashboard/widgets",
        "dashboard",
      ]);
    });
  });

  describe("buildScopedTag edge cases", () => {
    it("handles scope with special characters", () => {
      expect(buildScopedTag("org-admin", "users/list")).toBe(
        "org-admin/users/list"
      );
    });

    it("handles scope with numbers", () => {
      expect(buildScopedTag("tenant123", "config")).toBe("tenant123/config");
    });

    it("handles tag with params containing colons", () => {
      expect(buildScopedTag("admin", "events/byTime:10:30:45")).toBe(
        "admin/events/byTime:10:30:45"
      );
    });

    it("handles very long scope name", () => {
      const longScope = "very-long-scope-name-for-testing-purposes";
      expect(buildScopedTag(longScope, "users")).toBe(`${longScope}/users`);
    });
  });

  // ============================================
  // EMBEDDED PARAMS TESTS (Hierarchical params feature)
  // ============================================

  describe("buildTagWithEmbeddedParams", () => {
    it("builds tag with params embedded at branch level", () => {
      // userPrivateData has userId param, byWorkspaceId has workspaceId param
      const paramsBySegment = new Map<number, string[]>([
        [0, ["userId"]],
        [2, ["workspaceId"]],
      ]);

      expect(
        buildTagWithEmbeddedParams(
          ["userPrivateData", "myWorkspaces", "byWorkspaceId"],
          paramsBySegment,
          { userId: "u1", workspaceId: "w1" }
        )
      ).toBe("userPrivateData:u1/myWorkspaces/byWorkspaceId:w1");
    });

    it("builds tag with partial params (userId only)", () => {
      const paramsBySegment = new Map<number, string[]>([
        [0, ["userId"]],
        [2, ["workspaceId"]],
      ]);

      expect(
        buildTagWithEmbeddedParams(
          ["userPrivateData", "myWorkspaces", "byWorkspaceId"],
          paramsBySegment,
          { userId: "u1" }
        )
      ).toBe("userPrivateData:u1/myWorkspaces/byWorkspaceId");
    });

    it("builds tag with partial params (workspaceId only)", () => {
      const paramsBySegment = new Map<number, string[]>([
        [0, ["userId"]],
        [2, ["workspaceId"]],
      ]);

      expect(
        buildTagWithEmbeddedParams(
          ["userPrivateData", "myWorkspaces", "byWorkspaceId"],
          paramsBySegment,
          { workspaceId: "w1" }
        )
      ).toBe("userPrivateData/myWorkspaces/byWorkspaceId:w1");
    });

    it("builds tag with no params", () => {
      const paramsBySegment = new Map<number, string[]>([
        [0, ["userId"]],
        [2, ["workspaceId"]],
      ]);

      expect(
        buildTagWithEmbeddedParams(
          ["userPrivateData", "myWorkspaces", "byWorkspaceId"],
          paramsBySegment,
          {}
        )
      ).toBe("userPrivateData/myWorkspaces/byWorkspaceId");
    });

    it("builds tag with multiple params at same segment", () => {
      const paramsBySegment = new Map<number, string[]>([
        [0, ["tenantId", "orgId"]],
        [1, ["userId"]],
      ]);

      expect(
        buildTagWithEmbeddedParams(
          ["tenant", "users"],
          paramsBySegment,
          { tenantId: "t1", orgId: "o1", userId: "u1" }
        )
      ).toBe("tenant:t1:o1/users:u1");
    });

    it("handles path with no params defined", () => {
      expect(
        buildTagWithEmbeddedParams(["users", "list"], new Map(), {})
      ).toBe("users/list");
    });

    it("handles multi-level branch params", () => {
      // tenant -> users -> workspaces -> byId
      const paramsBySegment = new Map<number, string[]>([
        [0, ["tenantId"]],
        [1, ["userId"]],
        [3, ["workspaceId"]],
      ]);

      expect(
        buildTagWithEmbeddedParams(
          ["tenant", "users", "workspaces", "byId"],
          paramsBySegment,
          { tenantId: "t1", userId: "u1", workspaceId: "w1" }
        )
      ).toBe("tenant:t1/users:u1/workspaces/byId:w1");
    });
  });

  describe("buildAncestorTagsWithEmbeddedParams", () => {
    it("builds ancestor tags with embedded params", () => {
      const paramsBySegment = new Map<number, string[]>([
        [0, ["userId"]],
        [2, ["workspaceId"]],
      ]);

      const ancestors = buildAncestorTagsWithEmbeddedParams(
        ["userPrivateData", "myWorkspaces", "byWorkspaceId"],
        paramsBySegment,
        { userId: "u1", workspaceId: "w1" }
      );

      expect(ancestors).toEqual([
        "userPrivateData:u1",
        "userPrivateData:u1/myWorkspaces",
      ]);
    });

    it("builds ancestor tags with partial params", () => {
      const paramsBySegment = new Map<number, string[]>([
        [0, ["userId"]],
        [2, ["workspaceId"]],
      ]);

      const ancestors = buildAncestorTagsWithEmbeddedParams(
        ["userPrivateData", "myWorkspaces", "byWorkspaceId"],
        paramsBySegment,
        { userId: "u1" }
      );

      expect(ancestors).toEqual([
        "userPrivateData:u1",
        "userPrivateData:u1/myWorkspaces",
      ]);
    });

    it("returns empty array for single segment path", () => {
      expect(
        buildAncestorTagsWithEmbeddedParams(
          ["users"],
          new Map([[0, ["userId"]]]),
          { userId: "u1" }
        )
      ).toEqual([]);
    });
  });

  describe("buildAllTagsWithEmbeddedParams", () => {
    it("builds all hierarchical tags with embedded params", () => {
      const paramsBySegment = new Map<number, string[]>([
        [0, ["userId"]],
        [2, ["workspaceId"]],
      ]);

      const tags = buildAllTagsWithEmbeddedParams(
        ["userPrivateData", "myWorkspaces", "byWorkspaceId"],
        ["admin"],
        paramsBySegment,
        { userId: "u1", workspaceId: "w1" }
      );

      expect(tags).toEqual([
        // Scoped tags
        "admin/userPrivateData:u1/myWorkspaces/byWorkspaceId:w1",
        "admin/userPrivateData:u1/myWorkspaces",
        "admin/userPrivateData:u1",
        "admin",
        // Unscoped tags
        "userPrivateData:u1/myWorkspaces/byWorkspaceId:w1",
        "userPrivateData:u1/myWorkspaces",
        "userPrivateData:u1",
      ]);
    });

    it("builds tags for leaf without params under parameterized branch", () => {
      const paramsBySegment = new Map<number, string[]>([[0, ["userId"]]]);

      const tags = buildAllTagsWithEmbeddedParams(
        ["userPrivateData", "myProfile", "detail"],
        ["admin"],
        paramsBySegment,
        { userId: "u1" }
      );

      expect(tags).toEqual([
        "admin/userPrivateData:u1/myProfile/detail",
        "admin/userPrivateData:u1/myProfile",
        "admin/userPrivateData:u1",
        "admin",
        "userPrivateData:u1/myProfile/detail",
        "userPrivateData:u1/myProfile",
        "userPrivateData:u1",
      ]);
    });
  });

  describe("buildUnscopedTagsWithEmbeddedParams", () => {
    it("builds unscoped tags with embedded params", () => {
      const paramsBySegment = new Map<number, string[]>([
        [0, ["userId"]],
        [2, ["workspaceId"]],
      ]);

      const tags = buildUnscopedTagsWithEmbeddedParams(
        ["userPrivateData", "myWorkspaces", "byWorkspaceId"],
        paramsBySegment,
        { userId: "u1", workspaceId: "w1" }
      );

      expect(tags).toEqual([
        "userPrivateData:u1/myWorkspaces/byWorkspaceId:w1",
        "userPrivateData:u1/myWorkspaces",
        "userPrivateData:u1",
      ]);
    });

    it("builds unscoped tags with partial params", () => {
      const paramsBySegment = new Map<number, string[]>([
        [0, ["userId"]],
        [2, ["workspaceId"]],
      ]);

      const tags = buildUnscopedTagsWithEmbeddedParams(
        ["userPrivateData", "myWorkspaces", "byWorkspaceId"],
        paramsBySegment,
        { userId: "u1" }
      );

      expect(tags).toEqual([
        "userPrivateData:u1/myWorkspaces/byWorkspaceId",
        "userPrivateData:u1/myWorkspaces",
        "userPrivateData:u1",
      ]);
    });
  });

  // ============================================
  // ADDITIONAL EMBEDDED PARAMS EDGE CASE TESTS
  // ============================================

  describe("embedded params edge cases", () => {
    describe("deeply nested params (4+ levels)", () => {
      it("handles 4-level deep params", () => {
        const paramsBySegment = new Map<number, string[]>([
          [0, ["orgId"]],
          [1, ["teamId"]],
          [2, ["projectId"]],
          [3, ["taskId"]],
        ]);

        expect(
          buildTagWithEmbeddedParams(
            ["org", "team", "project", "task"],
            paramsBySegment,
            { orgId: "o1", teamId: "t1", projectId: "p1", taskId: "tk1" }
          )
        ).toBe("org:o1/team:t1/project:p1/task:tk1");
      });

      it("handles 4-level with only first and last params", () => {
        const paramsBySegment = new Map<number, string[]>([
          [0, ["orgId"]],
          [3, ["taskId"]],
        ]);

        expect(
          buildTagWithEmbeddedParams(
            ["org", "team", "project", "task"],
            paramsBySegment,
            { orgId: "o1", taskId: "tk1" }
          )
        ).toBe("org:o1/team/project/task:tk1");
      });

      it("handles 4-level with middle params only", () => {
        const paramsBySegment = new Map<number, string[]>([
          [1, ["teamId"]],
          [2, ["projectId"]],
        ]);

        expect(
          buildTagWithEmbeddedParams(
            ["org", "team", "project", "task"],
            paramsBySegment,
            { teamId: "t1", projectId: "p1" }
          )
        ).toBe("org/team:t1/project:p1/task");
      });
    });

    describe("special characters in param values", () => {
      it("handles colons in param values", () => {
        const paramsBySegment = new Map<number, string[]>([[0, ["timestamp"]]]);

        expect(
          buildTagWithEmbeddedParams(
            ["events", "byTime"],
            paramsBySegment,
            { timestamp: "2024:01:15:10:30:00" }
          )
        ).toBe("events:2024:01:15:10:30:00/byTime");
      });

      it("handles slashes in param values", () => {
        const paramsBySegment = new Map<number, string[]>([[0, ["path"]]]);

        expect(
          buildTagWithEmbeddedParams(
            ["files", "content"],
            paramsBySegment,
            { path: "home/user/docs" }
          )
        ).toBe("files:home/user/docs/content");
      });

      it("handles special characters in param values", () => {
        const paramsBySegment = new Map<number, string[]>([[0, ["email"]]]);

        expect(
          buildTagWithEmbeddedParams(
            ["users", "profile"],
            paramsBySegment,
            { email: "user+test@example.com" }
          )
        ).toBe("users:user+test@example.com/profile");
      });

      it("handles unicode in param values", () => {
        const paramsBySegment = new Map<number, string[]>([[0, ["name"]]]);

        expect(
          buildTagWithEmbeddedParams(
            ["users", "profile"],
            paramsBySegment,
            { name: "日本語ユーザー" }
          )
        ).toBe("users:日本語ユーザー/profile");
      });

      it("handles empty string param values", () => {
        const paramsBySegment = new Map<number, string[]>([[0, ["query"]]]);

        expect(
          buildTagWithEmbeddedParams(
            ["search", "results"],
            paramsBySegment,
            { query: "" }
          )
        ).toBe("search:/results");
      });
    });

    describe("gaps in param levels", () => {
      it("handles params with gaps between levels", () => {
        // Params at level 0 and 3, but not 1 and 2
        const paramsBySegment = new Map<number, string[]>([
          [0, ["tenantId"]],
          [3, ["itemId"]],
        ]);

        expect(
          buildTagWithEmbeddedParams(
            ["tenant", "category", "subcategory", "item"],
            paramsBySegment,
            { tenantId: "t1", itemId: "i1" }
          )
        ).toBe("tenant:t1/category/subcategory/item:i1");
      });

      it("handles single param in middle of path", () => {
        const paramsBySegment = new Map<number, string[]>([[2, ["projectId"]]]);

        expect(
          buildTagWithEmbeddedParams(
            ["org", "team", "project", "task", "subtask"],
            paramsBySegment,
            { projectId: "p1" }
          )
        ).toBe("org/team/project:p1/task/subtask");
      });
    });

    describe("multiple params at single segment", () => {
      it("handles 3 params at same segment", () => {
        const paramsBySegment = new Map<number, string[]>([
          [0, ["tenantId", "regionId", "zoneId"]],
        ]);

        expect(
          buildTagWithEmbeddedParams(
            ["location", "data"],
            paramsBySegment,
            { tenantId: "t1", regionId: "r1", zoneId: "z1" }
          )
        ).toBe("location:t1:r1:z1/data");
      });

      it("handles partial multi-params at same segment", () => {
        const paramsBySegment = new Map<number, string[]>([
          [0, ["tenantId", "regionId", "zoneId"]],
        ]);

        // Only provide 2 of 3 params
        expect(
          buildTagWithEmbeddedParams(
            ["location", "data"],
            paramsBySegment,
            { tenantId: "t1", zoneId: "z1" }
          )
        ).toBe("location:t1:z1/data");
      });

      it("handles multi-params at multiple segments", () => {
        const paramsBySegment = new Map<number, string[]>([
          [0, ["orgId", "tenantId"]],
          [2, ["userId", "roleId"]],
        ]);

        expect(
          buildTagWithEmbeddedParams(
            ["org", "department", "user"],
            paramsBySegment,
            { orgId: "o1", tenantId: "t1", userId: "u1", roleId: "r1" }
          )
        ).toBe("org:o1:t1/department/user:u1:r1");
      });
    });

    describe("ancestor tags with complex params", () => {
      it("builds ancestors for 5-level path with alternating params", () => {
        const paramsBySegment = new Map<number, string[]>([
          [0, ["a"]],
          [2, ["c"]],
          [4, ["e"]],
        ]);

        const ancestors = buildAncestorTagsWithEmbeddedParams(
          ["l0", "l1", "l2", "l3", "l4"],
          paramsBySegment,
          { a: "1", c: "3", e: "5" }
        );

        expect(ancestors).toEqual([
          "l0:1",
          "l0:1/l1",
          "l0:1/l1/l2:3",
          "l0:1/l1/l2:3/l3",
        ]);
      });

      it("builds ancestors with partial params in middle", () => {
        const paramsBySegment = new Map<number, string[]>([
          [0, ["userId"]],
          [1, ["workspaceId"]],
          [2, ["projectId"]],
        ]);

        // Only provide userId
        const ancestors = buildAncestorTagsWithEmbeddedParams(
          ["user", "workspace", "project"],
          paramsBySegment,
          { userId: "u1" }
        );

        expect(ancestors).toEqual(["user:u1", "user:u1/workspace"]);
      });
    });

    describe("buildAllTagsWithEmbeddedParams comprehensive", () => {
      it("handles 3-level params with different scopes", () => {
        const paramsBySegment = new Map<number, string[]>([
          [0, ["tenantId"]],
          [1, ["userId"]],
          [2, ["docId"]],
        ]);

        const tags = buildAllTagsWithEmbeddedParams(
          ["tenant", "user", "doc"],
          ["admin"],
          paramsBySegment,
          { tenantId: "t1", userId: "u1", docId: "d1" }
        );

        expect(tags).toEqual([
          // Scoped
          "admin/tenant:t1/user:u1/doc:d1",
          "admin/tenant:t1/user:u1",
          "admin/tenant:t1",
          "admin",
          // Unscoped
          "tenant:t1/user:u1/doc:d1",
          "tenant:t1/user:u1",
          "tenant:t1",
        ]);
      });

      it("handles partial params with 3-level hierarchy", () => {
        const paramsBySegment = new Map<number, string[]>([
          [0, ["tenantId"]],
          [1, ["userId"]],
          [2, ["docId"]],
        ]);

        // Only tenantId provided
        const tags = buildAllTagsWithEmbeddedParams(
          ["tenant", "user", "doc"],
          ["admin"],
          paramsBySegment,
          { tenantId: "t1" }
        );

        expect(tags).toEqual([
          "admin/tenant:t1/user/doc",
          "admin/tenant:t1/user",
          "admin/tenant:t1",
          "admin",
          "tenant:t1/user/doc",
          "tenant:t1/user",
          "tenant:t1",
        ]);
      });

      it("handles no params provided with parameterized schema", () => {
        const paramsBySegment = new Map<number, string[]>([
          [0, ["tenantId"]],
          [1, ["userId"]],
        ]);

        const tags = buildAllTagsWithEmbeddedParams(
          ["tenant", "user", "profile"],
          ["admin"],
          paramsBySegment,
          {}
        );

        expect(tags).toEqual([
          "admin/tenant/user/profile",
          "admin/tenant/user",
          "admin/tenant",
          "admin",
          "tenant/user/profile",
          "tenant/user",
          "tenant",
        ]);
      });

      it("handles multiple scopes correctly", () => {
        const paramsBySegment = new Map<number, string[]>([[0, ["userId"]]]);

        const adminTags = buildAllTagsWithEmbeddedParams(
          ["user", "data"],
          ["admin"],
          paramsBySegment,
          { userId: "u1" }
        );

        const publicTags = buildAllTagsWithEmbeddedParams(
          ["user", "data"],
          ["public"],
          paramsBySegment,
          { userId: "u1" }
        );

        expect(adminTags[0]).toBe("admin/user:u1/data");
        expect(publicTags[0]).toBe("public/user:u1/data");
      });
    });
  });
});
