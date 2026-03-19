import { describe, it, expect } from 'vitest';
import { ContentResolver } from './resolver';
import { sampleContentPackage } from '../test/fixtures';

describe('ContentResolver', () => {
  const resolver = new ContentResolver([sampleContentPackage]);

  describe('getById', () => {
    it('returns a guide by its ID', () => {
      const guide = resolver.getById('test-terrain-sculpt');
      expect(guide).toBeDefined();
      expect(guide?.title).toBe('Sculpting Terrain');
    });

    it('returns undefined for unknown ID', () => {
      expect(resolver.getById('nonexistent')).toBeUndefined();
    });
  });

  describe('getByContext', () => {
    it('finds guides matching a context key', () => {
      const guides = resolver.getByContext('terrain-editor.sculpt');
      expect(guides).toHaveLength(1);
      expect(guides[0].id).toBe('test-terrain-sculpt');
    });

    it('returns empty array for unknown context', () => {
      expect(resolver.getByContext('unknown.context')).toHaveLength(0);
    });

    it('filters by user level', () => {
      const beginner = resolver.getByContext('materials.shaders', {
        level: 'beginner',
      });
      expect(beginner).toHaveLength(0);

      const advanced = resolver.getByContext('materials.shaders', {
        level: 'advanced',
      });
      expect(advanced).toHaveLength(1);
    });
  });

  describe('search', () => {
    it('finds guides by title text', () => {
      const results = resolver.search('terrain');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('test-terrain-sculpt');
    });

    it('finds guides by tag', () => {
      const results = resolver.search('sculpting');
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns empty for no match', () => {
      expect(resolver.search('xyznonexistent')).toHaveLength(0);
    });

    it('returns empty for blank query', () => {
      expect(resolver.search('')).toHaveLength(0);
      expect(resolver.search('   ')).toHaveLength(0);
    });

    it('respects level filtering in search', () => {
      const results = resolver.search('shaders', { level: 'beginner' });
      expect(results).toHaveLength(0);

      const advResults = resolver.search('shaders', { level: 'advanced' });
      expect(advResults).toHaveLength(1);
    });
  });

  describe('getAllIds', () => {
    it('returns all guide IDs', () => {
      const ids = resolver.getAllIds();
      expect(ids).toContain('test-terrain-sculpt');
      expect(ids).toContain('test-save-tooltip');
      expect(ids).toContain('test-advanced-shaders');
      expect(ids).toHaveLength(3);
    });
  });
});
