import {
  buildTag,
  buildAncestorTags,
  buildScopedTag,
  buildAllTags,
  buildUnscopedTags,
} from '../src/tag-builder';

describe('tag-builder', () => {
  describe('buildTag', () => {
    it('builds tag for leaf with single param', () => {
      expect(buildTag(['users', 'byId'], { id: '123' })).toBe('users/byId:123');
    });

    it('builds tag for leaf with multiple params', () => {
      expect(
        buildTag(['organizations', 'teams', 'members'], {
          orgId: 'org-1',
          teamId: 'team-2',
          memberId: 'member-3',
        })
      ).toBe('organizations/teams/members:org-1:team-2:member-3');
    });

    it('builds tag for leaf without params', () => {
      expect(buildTag(['users', 'list'], {})).toBe('users/list');
    });

    it('builds tag for single-level path', () => {
      expect(buildTag(['config'], {})).toBe('config');
    });

    it('handles special characters in param values', () => {
      expect(buildTag(['users', 'byEmail'], { email: 'user@example.com' })).toBe(
        'users/byEmail:user@example.com'
      );
    });

    it('handles UUID param values', () => {
      expect(
        buildTag(['users', 'byId'], { id: '550e8400-e29b-41d4-a716-446655440000' })
      ).toBe('users/byId:550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('buildAncestorTags', () => {
    it('returns empty array for single-level path', () => {
      expect(buildAncestorTags(['users'])).toEqual([]);
    });

    it('returns parent for two-level path', () => {
      expect(buildAncestorTags(['users', 'byId'])).toEqual(['users']);
    });

    it('returns all ancestors for multi-level path', () => {
      expect(buildAncestorTags(['feedback', 'threads', 'byId'])).toEqual([
        'feedback',
        'feedback/threads',
      ]);
    });

    it('returns all ancestors for deeply nested path', () => {
      expect(buildAncestorTags(['a', 'b', 'c', 'd', 'e'])).toEqual([
        'a',
        'a/b',
        'a/b/c',
        'a/b/c/d',
      ]);
    });
  });

  describe('buildScopedTag', () => {
    it('prefixes tag with scope', () => {
      expect(buildScopedTag('admin', 'users/byId:123')).toBe(
        'admin/users/byId:123'
      );
    });

    it('handles branch tag', () => {
      expect(buildScopedTag('public', 'feedback/boards')).toBe(
        'public/feedback/boards'
      );
    });

    it('handles single-level tag', () => {
      expect(buildScopedTag('user', 'config')).toBe('user/config');
    });
  });

  describe('buildAllTags', () => {
    it('builds all hierarchical tags for scoped leaf with params', () => {
      const tags = buildAllTags(['users', 'byId'], ['admin'], { id: '123' });

      expect(tags).toEqual([
        'admin/users/byId:123', // scoped leaf
        'admin/users', // scoped ancestor
        'admin', // scope root
        'users/byId:123', // unscoped leaf
        'users', // unscoped ancestor
      ]);
    });

    it('builds tags for scoped leaf without params', () => {
      const tags = buildAllTags(['users', 'list'], ['admin'], {});

      expect(tags).toEqual([
        'admin/users/list',
        'admin/users',
        'admin',
        'users/list',
        'users',
      ]);
    });

    it('builds tags for deeply nested path', () => {
      const tags = buildAllTags(
        ['feedback', 'threads', 'comments'],
        ['public'],
        { threadId: 't1', commentId: 'c1' }
      );

      expect(tags).toEqual([
        'public/feedback/threads/comments:t1:c1',
        'public/feedback/threads',
        'public/feedback',
        'public',
        'feedback/threads/comments:t1:c1',
        'feedback/threads',
        'feedback',
      ]);
    });

    it('builds tags for single-level resource', () => {
      const tags = buildAllTags(['config'], ['admin'], {});

      expect(tags).toEqual(['admin/config', 'admin', 'config']);
    });
  });

  describe('buildUnscopedTags', () => {
    it('builds unscoped hierarchical tags with params', () => {
      const tags = buildUnscopedTags(['users', 'byId'], { id: '123' });

      expect(tags).toEqual(['users/byId:123', 'users']);
    });

    it('builds unscoped hierarchical tags without params', () => {
      const tags = buildUnscopedTags(['feedback', 'boards', 'list'], {});

      expect(tags).toEqual([
        'feedback/boards/list',
        'feedback/boards',
        'feedback',
      ]);
    });

    it('builds single tag for root-level resource', () => {
      const tags = buildUnscopedTags(['config'], {});

      expect(tags).toEqual(['config']);
    });
  });
});
