import { describe, it, expect } from 'vitest';
import { DeptTree, DEFAULT_DEPT_TREE } from './lookup';
import type { DepartmentNode } from './types';

describe('DeptTree', () => {
  describe('lookup()', () => {
    it('returns the node for a known code', () => {
      const node = DEFAULT_DEPT_TREE.lookup('229235');
      expect(node?.description).toBe('CPC Current Planning');
      expect(node?.deptGroup).toBe('CPC');
      expect(node?.parentCode).toBe('229000');
    });

    it('returns null for an unknown code', () => {
      expect(DEFAULT_DEPT_TREE.lookup('999999')).toBeNull();
    });

    it('returns null when no variant is effective at asOf', () => {
      const futureNode: DepartmentNode = {
        code: '999000', description: 'Future Dept', parentCode: null,
        deptGroup: 'FUTURE', level: 1,
        effectiveDate: '2099-01-01', endDate: null,
      };
      const tree = new DeptTree([futureNode]);
      expect(tree.lookup('999000', '2026-05-20')).toBeNull();
    });

    it('picks the latest effective variant when multiple exist', () => {
      const old: DepartmentNode = {
        code: 'XYZ', description: 'Old Name', parentCode: null,
        deptGroup: 'XYZ', level: 1,
        effectiveDate: '2020-01-01', endDate: '2025-06-30',
      };
      const current: DepartmentNode = {
        code: 'XYZ', description: 'New Name', parentCode: null,
        deptGroup: 'XYZ', level: 1,
        effectiveDate: '2025-07-01', endDate: null,
      };
      const tree = new DeptTree([old, current]);
      expect(tree.lookup('XYZ', '2024-06-01')?.description).toBe('Old Name');
      expect(tree.lookup('XYZ', '2026-05-20')?.description).toBe('New Name');
    });
  });

  describe('hierarchy()', () => {
    it('walks from leaf to root', () => {
      const chain = DEFAULT_DEPT_TREE.hierarchy('229235');
      expect(chain.map(n => n.code)).toEqual(['229235', '229000']);
    });

    it('returns just the root for a root code', () => {
      const chain = DEFAULT_DEPT_TREE.hierarchy('230000');
      expect(chain.map(n => n.code)).toEqual(['230000']);
    });

    it('returns [] for an unknown code', () => {
      expect(DEFAULT_DEPT_TREE.hierarchy('999999')).toEqual([]);
    });

    it('stops on a cycle (defensive)', () => {
      const cycle: DepartmentNode[] = [
        { code: 'A', description: 'A', parentCode: 'B', deptGroup: 'X',
          level: 1, effectiveDate: '2026-01-01', endDate: null },
        { code: 'B', description: 'B', parentCode: 'A', deptGroup: 'X',
          level: 1, effectiveDate: '2026-01-01', endDate: null },
      ];
      const tree = new DeptTree(cycle);
      const chain = tree.hierarchy('A');
      expect(chain.map(n => n.code)).toEqual(['A', 'B']);
    });
  });

  describe('deptGroup()', () => {
    it('returns the pre-resolved dept group label', () => {
      expect(DEFAULT_DEPT_TREE.deptGroup('229235')).toBe('CPC');
      expect(DEFAULT_DEPT_TREE.deptGroup('232000')).toBe('DBI');
    });

    it('returns empty string for unknown code', () => {
      expect(DEFAULT_DEPT_TREE.deptGroup('999999')).toBe('');
    });
  });

  describe('seeded tree coverage', () => {
    it('contains DBI + CPC dept groups + their main divisions', () => {
      const codes = DEFAULT_DEPT_TREE.allCodes();
      expect(codes).toContain('230000'); // DBI root
      expect(codes).toContain('229000'); // CPC root
      expect(codes).toContain('229235'); // Tab 6 example
      expect(codes).toContain('232000'); // DBI Inspection Services
    });
  });
});
