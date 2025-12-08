# next-cool-cache

Type-safe cache tag management for Next.js 16+. Stop wrestling with string-based cache tags and let TypeScript catch your mistakes at compile time.

## Why?

Next.js 16 introduces powerful cache primitives (`cacheTag`, `revalidateTag`, `updateTag`), but they're all string-based. This leads to real problems:

### Problem 1: Silent Typos Break Your Cache

```typescript
// ❌ WITHOUT next-cool-cache - A typo that ruins your day

async function getUser(id: string) {
  'use cache: remote';
  cacheTag(`users/byId:${id}`);  // Tag: "users/byId:123"
  return db.users.findById(id);
}

async function updateUser(id: string, data: UserData) {
  await db.users.update(id, data);

  // Oops! "user" instead of "users" - spot the bug?
  revalidateTag(`user/byId:${id}`);  // Tag: "user/byId:123"
  // ❌ Silent failure! Cache never invalidates.
  // Users see stale data. No error thrown. Good luck debugging.
}
```

```typescript
// ✅ WITH next-cool-cache - TypeScript has your back

cache.admin.users.byId.cacheTag({ id });       // Autocomplete guides you
cache.admin.users.byId.revalidateTag({ id });  // Always matches

// cache.admin.user.byId.revalidateTag({ id })
// ❌ Compile error: Property 'user' does not exist. Did you mean 'users'?
```

### Problem 2: Different Users Need Different Cache Strategies

Imagine you're building a blog with drafts and published posts. When an admin edits a post:

- **Admins** need to see changes immediately (they're actively editing)
- **Public users** should never see a loading screen (use stale-while-revalidate)

Without scoped caching, you'd need to manage this manually with different tag prefixes and hope you get it right everywhere.

```typescript
// ❌ WITHOUT next-cool-cache - Manual scope management

async function updateBlogPost(postId: string, data: BlogPostData) {
  await db.posts.update(postId, data);

  // Admin sees changes immediately
  updateTag(`admin/blog/posts/byId:${postId}`);

  // Public users get stale-while-revalidate (no loading screen)
  revalidateTag(`public/blog/posts/byId:${postId}`);

  // Did I use the right prefix? Is it "admin" or "admin-panel"?
  // Is the path "blog/posts" or "posts"? Who knows!
}
```

```typescript
// ✅ WITH next-cool-cache - Scopes are first-class citizens

async function updateBlogPost(postId: string, data: BlogPostData) {
  await db.posts.update(postId, data);

  // Admin sees changes immediately (updateTag = expire now, fetch fresh)
  cache.admin.blog.posts.byId.updateTag({ id: postId });

  // Public users get stale-while-revalidate
  // Old content shows instantly while new content loads in background
  // Anonymous users NEVER see a loading screen
  cache.public.blog.posts.byId.revalidateTag({ id: postId });
}
```

## Installation

```bash
npm install next-cool-cache
# or
pnpm add next-cool-cache
# or
yarn add next-cool-cache
```

## Quick Start

### 1. Define Your Schema

```typescript
// lib/cache.ts
import { createCache } from 'next-cool-cache';

// Define your cache structure
const schema = {
  users: {
    list: {},                              // No params needed
    byId: { _params: ['id'] as const },   // Requires { id: string }
  },
  blog: {
    posts: {
      list: {},
      byId: { _params: ['id'] as const },
      byAuthor: { _params: ['authorId'] as const },
    },
    drafts: {
      byId: { _params: ['id'] as const },
    },
  },
} as const;

// Define your scopes
const scopes = ['admin', 'public', 'user'] as const;

// Create the typed cache
export const cache = createCache(schema, scopes);
```

### 2. Use in Your App

```typescript
// In a cached function
async function getBlogPost(id: string) {
  'use cache: remote';
  cache.public.blog.posts.byId.cacheTag({ id });
  // → cacheTag('public/blog/posts/byId:<id>', 'public/blog/posts', 'public/blog', 'public', 'blog/posts/byId:<id>', 'blog/posts', 'blog')
  return db.posts.findById(id);
}

// When data changes
async function updateBlogPost(id: string, data: PostData) {
  await db.posts.update(id, data);
  cache.admin.blog.posts.byId.updateTag({ id });    // Immediate for admin
  // → updateTag('admin/blog/posts/byId:<id>')
  cache.public.blog.posts.byId.revalidateTag({ id }); // SWR for public
  // → revalidateTag('public/blog/posts/byId:<id>', 'max')
}

// Invalidate entire sections
async function clearAllPosts() {
  cache.blog.posts.revalidateTag(); // All posts, all scopes
  // → revalidateTag('blog/posts', 'max')
}
```

## API Reference

### `createCache(schema, scopes)`

Creates a typed cache object from your schema and scopes.

```typescript
const cache = createCache(schema, scopes);
```

**Parameters:**
- `schema` - Your cache structure (see Schema Format below)
- `scopes` - Array of scope names like `['admin', 'public']`

### Schema Format

```typescript
const schema = {
  // Leaf node without params - call methods with no arguments
  config: {},

  // Leaf node with params - methods require the specified params
  users: {
    byId: { _params: ['id'] as const },
    byEmail: { _params: ['email'] as const },
  },

  // Branch nodes - nested objects without _params
  blog: {
    posts: {
      list: {},
      byId: { _params: ['id'] as const },
    },
  },

  // Multiple params
  comments: {
    byPostAndUser: { _params: ['postId', 'userId'] as const },
  },
} as const;  // Don't forget 'as const'!
```

### Leaf Node Methods

Leaf nodes (endpoints in your cache tree) have three methods:

#### `cacheTag(params?)`
Register cache tags inside a `'use cache'` function. Automatically registers hierarchical tags for parent invalidation.

```typescript
async function getUser(id: string) {
  'use cache: remote';
  cache.admin.users.byId.cacheTag({ id });
  // Registers: 'admin/users/byId:123', 'admin/users', 'admin', 'users/byId:123', 'users'
  return db.users.findById(id);
}
```

#### `revalidateTag(params?)`
Stale-while-revalidate invalidation. Serves stale content while fetching fresh data in the background. Users never see loading states.

```typescript
cache.public.blog.posts.byId.revalidateTag({ id: '123' });
```

#### `updateTag(params?)`
Immediate invalidation. Expires the cache entry now - next request will fetch fresh and may show a loading state.

```typescript
cache.admin.blog.posts.byId.updateTag({ id: '123' });
```

### Branch Node Methods

Branch nodes (intermediate objects in your cache tree) can invalidate entire subtrees:

```typescript
// Invalidate all posts for admin
cache.admin.blog.posts.revalidateTag();

// Invalidate entire blog section for admin
cache.admin.blog.revalidateTag();

// Invalidate everything in admin scope
cache.admin.revalidateTag();
```

### Cross-Scope Operations

Access resources without a scope prefix to invalidate across all scopes:

```typescript
// Invalidate user 123 in ALL scopes (admin, public, user, etc.)
cache.users.byId.revalidateTag({ id: '123' });

// Invalidate all blog content in ALL scopes
cache.blog.revalidateTag();
```

## More Examples

### Hierarchical Invalidation

The cache tree structure enables powerful invalidation patterns:

```typescript
// Fine-grained: Single post
cache.admin.blog.posts.byId.revalidateTag({ id: '123' });

// Medium: All posts in admin scope
cache.admin.blog.posts.revalidateTag();

// Broad: Entire blog section for admin
cache.admin.blog.revalidateTag();

// Broadest: Everything in admin scope
cache.admin.revalidateTag();

// Cross-scope: All blog content for everyone
cache.blog.revalidateTag();
```

### Parameter Enforcement

TypeScript ensures you pass the right parameters:

```typescript
// Schema
const schema = {
  blog: {
    posts: {
      list: {},                              // No params
      byId: { _params: ['id'] as const },   // Requires { id }
    }
  }
} as const;

// Usage
cache.admin.blog.posts.list.cacheTag();           // ✅ No args needed
cache.admin.blog.posts.byId.cacheTag({ id: '1' }); // ✅ Correct
cache.admin.blog.posts.byId.cacheTag();            // ❌ Error: missing { id }
cache.admin.blog.posts.byId.cacheTag({ userId: '1' }); // ❌ Error: wrong param name
```

### Refactoring Safety

When you rename resources, TypeScript shows every place that needs updating:

```typescript
// Before: schema has 'posts'
cache.admin.blog.posts.byId.revalidateTag({ id });

// After: rename to 'articles' in schema
cache.admin.blog.posts.byId.revalidateTag({ id });
//                 ^^^^^ Error: Property 'posts' does not exist.
//                       Did you mean 'articles'?

// TypeScript guides you to every call site that needs updating
```

### Testing

Mock the `next/cache` module in your tests:

```typescript
import { jest } from '@jest/globals';

const mockCacheTag = jest.fn();
const mockRevalidateTag = jest.fn();
const mockUpdateTag = jest.fn();

jest.mock('next/cache', () => ({
  cacheTag: (...args: unknown[]) => mockCacheTag(...args),
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
}));

import { createCache } from 'next-cool-cache';

const cache = createCache(schema, scopes);

// Test your cache logic
cache.admin.users.byId.revalidateTag({ id: '123' });
expect(mockRevalidateTag).toHaveBeenCalledWith('admin/users/byId:123', 'max');
```

### Debugging with `_path`

Every node exposes its path for debugging:

```typescript
console.log(cache.admin.users.byId._path);  // 'admin/users/byId'
console.log(cache.admin.users._path);       // 'admin/users'
console.log(cache.users._path);             // 'users' (unscoped)
```

## TypeScript Setup

For full type inference, ensure you:

1. Use `as const` on your schema and scopes
2. Have `strict: true` in your `tsconfig.json`

```typescript
// ✅ Correct - full type inference
const schema = { ... } as const;
const scopes = ['admin', 'public'] as const;

// ❌ Wrong - loses type information
const schema = { ... };  // Missing 'as const'
const scopes = ['admin', 'public'];  // Missing 'as const'
```

## Development

This is a monorepo using [Turborepo](https://turborepo.com/).

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm check-types
```

## Requirements

- Next.js 16.0.0 or higher
- TypeScript 5.0 or higher (recommended)

## License

MIT
