import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createCache } from '../src/create-cache';
import {
  simpleSchema,
  simpleScopes,
  nestedSchema,
  nestedScopes,
  deeplyNestedSchema,
  multiParamSchema,
} from './fixtures/schemas';

describe('createCache', () => {
  let mockCacheTag: jest.Mock;
  let mockRevalidateTag: jest.Mock;
  let mockUpdateTag: jest.Mock;

  beforeEach(() => {
    mockCacheTag = jest.fn();
    mockRevalidateTag = jest.fn();
    mockUpdateTag = jest.fn();
  });

  describe('with simple schema', () => {
    const createTestCache = () =>
      createCache(simpleSchema, simpleScopes, {
        cacheTag: mockCacheTag,
        revalidateTag: mockRevalidateTag,
        updateTag: mockUpdateTag,
      });

    describe('leaf node with params', () => {
      it('cacheTag registers hierarchical tags', () => {
        const cache = createTestCache();
        cache.admin.users.byId.cacheTag({ id: '123' });

        expect(mockCacheTag).toHaveBeenCalledTimes(1);
        expect(mockCacheTag).toHaveBeenCalledWith(
          'admin/users/byId:123',
          'admin/users',
          'admin',
          'users/byId:123',
          'users'
        );
      });

      it('revalidateTag invalidates specific entry', () => {
        const cache = createTestCache();
        cache.admin.users.byId.revalidateTag({ id: '123' });

        expect(mockRevalidateTag).toHaveBeenCalledTimes(1);
        expect(mockRevalidateTag).toHaveBeenCalledWith(
          'admin/users/byId:123',
          'max'
        );
      });

      it('updateTag expires specific entry immediately', () => {
        const cache = createTestCache();
        cache.admin.users.byId.updateTag({ id: '123' });

        expect(mockUpdateTag).toHaveBeenCalledTimes(1);
        expect(mockUpdateTag).toHaveBeenCalledWith('admin/users/byId:123');
      });
    });

    describe('leaf node without params', () => {
      it('cacheTag works without arguments', () => {
        const cache = createTestCache();
        cache.admin.users.list.cacheTag();

        expect(mockCacheTag).toHaveBeenCalledTimes(1);
        expect(mockCacheTag).toHaveBeenCalledWith(
          'admin/users/list',
          'admin/users',
          'admin',
          'users/list',
          'users'
        );
      });

      it('revalidateTag works without arguments', () => {
        const cache = createTestCache();
        cache.admin.users.list.revalidateTag();

        expect(mockRevalidateTag).toHaveBeenCalledWith(
          'admin/users/list',
          'max'
        );
      });

      it('updateTag works without arguments', () => {
        const cache = createTestCache();
        cache.admin.users.list.updateTag();

        expect(mockUpdateTag).toHaveBeenCalledWith('admin/users/list');
      });
    });

    describe('root-level leaf without params', () => {
      it('cacheTag works for config', () => {
        const cache = createTestCache();
        cache.admin.config.cacheTag();

        expect(mockCacheTag).toHaveBeenCalledWith(
          'admin/config',
          'admin',
          'config'
        );
      });
    });

    describe('branch node', () => {
      it('revalidateTag invalidates entire subtree', () => {
        const cache = createTestCache();
        cache.admin.users.revalidateTag();

        expect(mockRevalidateTag).toHaveBeenCalledWith('admin/users', 'max');
      });

      it('updateTag updates entire subtree', () => {
        const cache = createTestCache();
        cache.admin.users.updateTag();

        expect(mockUpdateTag).toHaveBeenCalledWith('admin/users');
      });
    });

    describe('cross-scope operations', () => {
      it('unscoped revalidateTag invalidates resource across scopes', () => {
        const cache = createTestCache();
        cache.users.byId.revalidateTag({ id: '123' });

        expect(mockRevalidateTag).toHaveBeenCalledWith('users/byId:123', 'max');
      });

      it('unscoped updateTag updates resource across scopes', () => {
        const cache = createTestCache();
        cache.users.byId.updateTag({ id: '123' });

        expect(mockUpdateTag).toHaveBeenCalledWith('users/byId:123');
      });

      it('unscoped branch revalidateTag', () => {
        const cache = createTestCache();
        cache.users.revalidateTag();

        expect(mockRevalidateTag).toHaveBeenCalledWith('users', 'max');
      });
    });

    describe('different scopes produce different tags', () => {
      it('admin and public scopes are distinct', () => {
        const cache = createTestCache();

        cache.admin.users.byId.revalidateTag({ id: '123' });
        cache.public.users.byId.revalidateTag({ id: '123' });

        expect(mockRevalidateTag).toHaveBeenCalledWith(
          'admin/users/byId:123',
          'max'
        );
        expect(mockRevalidateTag).toHaveBeenCalledWith(
          'public/users/byId:123',
          'max'
        );
      });
    });
  });

  describe('with nested schema', () => {
    const createTestCache = () =>
      createCache(nestedSchema, nestedScopes, {
        cacheTag: mockCacheTag,
        revalidateTag: mockRevalidateTag,
        updateTag: mockUpdateTag,
      });

    it('handles deeply nested paths', () => {
      const cache = createTestCache();
      cache.admin.feedback.boards.byId.cacheTag({ id: 'board-1' });

      expect(mockCacheTag).toHaveBeenCalledWith(
        'admin/feedback/boards/byId:board-1',
        'admin/feedback/boards',
        'admin/feedback',
        'admin',
        'feedback/boards/byId:board-1',
        'feedback/boards',
        'feedback'
      );
    });

    it('branch node at intermediate level', () => {
      const cache = createTestCache();
      cache.admin.feedback.boards.revalidateTag();

      expect(mockRevalidateTag).toHaveBeenCalledWith(
        'admin/feedback/boards',
        'max'
      );
    });

    it('branch node at top level', () => {
      const cache = createTestCache();
      cache.admin.feedback.revalidateTag();

      expect(mockRevalidateTag).toHaveBeenCalledWith('admin/feedback', 'max');
    });

    it('scope root invalidation', () => {
      const cache = createTestCache();
      cache.admin.revalidateTag();

      expect(mockRevalidateTag).toHaveBeenCalledWith('admin', 'max');
    });
  });

  describe('with multi-param schema', () => {
    const createTestCache = () =>
      createCache(multiParamSchema, ['admin'] as const, {
        cacheTag: mockCacheTag,
        revalidateTag: mockRevalidateTag,
        updateTag: mockUpdateTag,
      });

    it('handles multiple params in order', () => {
      const cache = createTestCache();
      cache.admin.workspaces.byOwnerAndSlug.revalidateTag({
        ownerId: 'user-1',
        slug: 'my-workspace',
      });

      expect(mockRevalidateTag).toHaveBeenCalledWith(
        'admin/workspaces/byOwnerAndSlug:user-1:my-workspace',
        'max'
      );
    });
  });

  describe('_path property', () => {
    it('exposes correct path for debugging', () => {
      const cache = createCache(simpleSchema, simpleScopes, {
        cacheTag: mockCacheTag,
        revalidateTag: mockRevalidateTag,
        updateTag: mockUpdateTag,
      });

      expect(cache.admin.users.byId._path).toBe('admin/users/byId');
      expect(cache.admin.users._path).toBe('admin/users');
      expect(cache.admin._path).toBe('admin');
      expect(cache.users.byId._path).toBe('users/byId');
      expect(cache.users._path).toBe('users');
    });
  });

  describe('default no-op functions', () => {
    it('works without options (no-op mode)', () => {
      const cache = createCache(simpleSchema, simpleScopes);

      // Should not throw
      expect(() => {
        cache.admin.users.byId.cacheTag({ id: '123' });
        cache.admin.users.byId.revalidateTag({ id: '123' });
        cache.admin.users.byId.updateTag({ id: '123' });
      }).not.toThrow();
    });
  });
});
