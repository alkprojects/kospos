import type { AppropriationLevel } from './types';

/**
 * Categorizes a PS Financials account code by which appropriation tree
 * controls its budget, or flags it as a labor posting (which bypasses
 * appropriation control entirely per SF budget rules).
 *
 * Ref: docs/domain/chartfields.md — "Appropriation control"
 *
 * Account ranges (SF standard):
 *   5xxx — Salaries & wages  → labor posting (bypasses appropriation)
 *   6xxx — Benefits          → labor posting (bypasses appropriation)
 *   7xxx — Non-personnel services, supplies, equipment → account tree
 *   8xxx — Capital / debt service                     → account tree
 *   9xxx — Other / special class                      → account tree
 *   Work orders and reserves are controlled separately → 'none'
 */
export function categorizeAccount(accountCode: string): AppropriationLevel {
  const code = accountCode.trim();
  if (!code) return 'none';

  const prefix = code.slice(0, 1);
  if (prefix === '5' || prefix === '6') return 'labor';

  // Work order accounts (WO prefix) are always standalone
  if (/^wo/i.test(code)) return 'none';

  // Reserve accounts
  if (/^(res|rsv)/i.test(code)) return 'none';

  // Project-controlled accounts (example convention: starts with 'P')
  if (/^p\d/i.test(code)) return 'project';

  // Authority-controlled accounts (example convention: authority ledger)
  if (prefix === '4') return 'authority';

  // Default non-labor accounts → account tree
  if (/^\d/.test(code)) return 'account';

  return 'none';
}

/**
 * Returns a human-readable label for an appropriation level.
 */
export function appropriationLabel(level: AppropriationLevel): string {
  switch (level) {
    case 'labor':     return 'Labor (bypasses appropriation)';
    case 'account':   return 'Account tree';
    case 'project':   return 'Project tree';
    case 'authority': return 'Authority tree';
    case 'none':      return 'Standalone (work order / reserve)';
  }
}
