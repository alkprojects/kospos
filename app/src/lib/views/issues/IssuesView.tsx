/**
 * Issues / Corrections — a dedicated, full-page surface for everything the
 * data-quality audits flagged for review.
 *
 * Redesigned S58 (Alex's ask): a TWO-LEVEL list. The left column shows one
 * collapsed row per error TYPE (rule) with its count; clicking a type expands
 * it into a list of terse, one-line findings; clicking a finding shows its
 * full detail on the right (why it was flagged, how to fix it, the rule it
 * cites, and "go to source" links). This replaces the earlier flat wall of
 * one finding per row, which buried the signal when a rule fired many times.
 *
 * The per-rule detail content (rationale / fix / citations / sourceTabs) comes
 * from the rule definitions (`lib/quality`). Reads the same `issues` the store
 * computes via `runRules` on import, so it stays in lock-step with the inline
 * Data Issues panel + the per-position flags.
 */

import { useMemo, useState } from 'react';
import { useAppStore } from '../../store';
import { ALL_RULES } from '../../quality';
import type { Issue, IssueSeverity, QualityRule, SourceTabId } from '../../quality/types';

const SEV_COLOR: Record<IssueSeverity, string> = {
  error: '#c0392b',
  warning: '#e67e22',
  info: '#2980b9',
};
const SEV_BG: Record<IssueSeverity, string> = {
  error: '#fdf0ef',
  warning: '#fef6ec',
  info: '#eaf4fb',
};
const SEV_LABEL: Record<IssueSeverity, string> = {
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
};
const SEV_RANK: Record<IssueSeverity, number> = { error: 0, warning: 1, info: 2 };
const SEV_ORDER: IssueSeverity[] = ['error', 'warning', 'info'];

/** ruleId → the rule definition (description + rationale + fix + citations +
 *  sourceTabs), so the detail panel can render a rule's full context. */
const RULE_BY_ID: Record<string, QualityRule> = Object.fromEntries(
  ALL_RULES.map(r => [r.id, r]),
);

/** Source-tab id → the nav label shown on its "Open …" link (matches App.tsx). */
const SOURCE_TAB_LABEL: Record<SourceTabId, string> = {
  positions: 'Positions',
  labor: 'Payroll',
  data: 'Source Tables',
  separations: 'Separations',
  probation: 'Probation',
  'staffing-plan': 'Hiring Plan',
  'special-class': 'Special Class',
};

type Filter = IssueSeverity | 'all';

/** Stable per-finding key — used for selection + React keys. */
function issueKey(i: Issue): string {
  return `${i.ruleId}|${i.positionNumber ?? ''}|${i.emplId ?? ''}|${(i.sourceRows ?? []).join(',')}`;
}

/** A short one-line label for a finding row (the full text lives in the detail
 *  panel). Leads with the position / employee identifier, then the message. */
function terseLine(i: Issue): string {
  const id = i.positionNumber
    ? `Position ${i.positionNumber}`
    : i.emplId
      ? `Employee ${i.emplId}`
      : i.sourceRows && i.sourceRows.length
        ? `Row ${i.sourceRows[0]}`
        : '';
  return id ? `${id} — ${i.message}` : i.message;
}

interface IssueGroup {
  ruleId: string;
  severity: IssueSeverity;
  description: string;
  issues: Issue[];
}

export function IssuesView({ onNavigate }: { onNavigate?: (tab: SourceTabId) => void }) {
  const issues = useAppStore(s => s.issues);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const counts = useMemo(() => {
    const c: Record<IssueSeverity, number> = { error: 0, warning: 0, info: 0 };
    for (const i of issues) c[i.severity]++;
    return c;
  }, [issues]);

  /** Filtered + searched issues, grouped by rule, groups sorted by severity. */
  const groups = useMemo<IssueGroup[]>(() => {
    const q = query.trim().toLowerCase();
    const filtered = issues.filter(i => {
      if (filter !== 'all' && i.severity !== filter) return false;
      if (!q) return true;
      const hay = `${i.message} ${i.ruleId} ${i.positionNumber ?? ''} ${i.emplId ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
    const byRule = new Map<string, Issue[]>();
    for (const i of filtered) {
      const arr = byRule.get(i.ruleId);
      if (arr) arr.push(i);
      else byRule.set(i.ruleId, [i]);
    }
    const out: IssueGroup[] = [];
    for (const [ruleId, list] of byRule) {
      // A rule normally emits a single severity; if mixed, rank by the most severe.
      const severity = list.reduce<IssueSeverity>(
        (s, i) => (SEV_RANK[i.severity] < SEV_RANK[s] ? i.severity : s),
        list[0].severity,
      );
      out.push({ ruleId, severity, description: RULE_BY_ID[ruleId]?.description ?? ruleId, issues: list });
    }
    out.sort(
      (a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || a.ruleId.localeCompare(b.ruleId),
    );
    return out;
  }, [issues, filter, query]);

  // When searching, every matching group is shown open so results are visible.
  const searching = query.trim() !== '';
  const isOpen = (ruleId: string) => searching || expanded.has(ruleId);
  const toggle = (ruleId: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(ruleId)) next.delete(ruleId);
      else next.add(ruleId);
      return next;
    });

  const selected = useMemo(() => {
    for (const g of groups) {
      const hit = g.issues.find(i => issueKey(i) === selectedKey);
      if (hit) return hit;
    }
    return null;
  }, [groups, selectedKey]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 64px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Issues / Corrections</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>
        Grouped by type. Click a type to expand its findings, then a finding for details.
      </p>

      {issues.length === 0 ? (
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '28px 20px',
            textAlign: 'center',
            background: 'var(--surface)',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No issues to correct</div>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>
            Either nothing was flagged, or no reports are loaded yet.
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <FilterChip label={`All (${issues.length})`} active={filter === 'all'} color="var(--text)" onClick={() => setFilter('all')} />
            {SEV_ORDER.map(sev =>
              counts[sev] > 0 ? (
                <FilterChip
                  key={sev}
                  label={`${SEV_LABEL[sev]}s (${counts[sev]})`}
                  active={filter === sev}
                  color={SEV_COLOR[sev]}
                  onClick={() => setFilter(sev)}
                />
              ) : null,
            )}
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search issues, positions, employees…"
              style={{
                marginLeft: 'auto',
                flex: '0 1 260px',
                padding: '5px 10px',
                fontSize: 13,
                fontFamily: 'inherit',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--surface)',
                color: 'var(--text)',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Master list — one row per error type, expandable into findings */}
            <div
              style={{
                flex: '1 1 440px',
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                maxHeight: '72vh',
                overflowY: 'auto',
              }}
            >
              {groups.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 4px' }}>
                  No issues match this filter.
                </div>
              ) : (
                groups.map(group => (
                  <div key={group.ruleId} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <GroupHeader group={group} open={isOpen(group.ruleId)} onToggle={() => toggle(group.ruleId)} />
                    {isOpen(group.ruleId) &&
                      group.issues.map(issue => (
                        <TerseRow
                          key={issueKey(issue)}
                          issue={issue}
                          selected={selected != null && issueKey(issue) === issueKey(selected)}
                          onClick={() => setSelectedKey(issueKey(issue))}
                        />
                      ))}
                  </div>
                ))
              )}
            </div>

            {/* Detail panel */}
            <div style={{ flex: '1 1 380px', minWidth: 0, position: 'sticky', top: 16 }}>
              {selected ? (
                <IssueDetail issue={selected} onNavigate={onNavigate} />
              ) : (
                <div
                  style={{
                    border: '1px dashed var(--border)',
                    borderRadius: 10,
                    padding: '28px 20px',
                    textAlign: 'center',
                    color: 'var(--muted)',
                    fontSize: 13,
                  }}
                >
                  Select a finding to see details.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FilterChip(props: { label: string; active: boolean; color: string; onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      style={{
        padding: '4px 14px',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: props.active ? props.color : 'var(--border)',
        borderRadius: 20,
        background: props.active ? props.color : 'transparent',
        color: props.active ? '#fff' : 'var(--muted)',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: props.active ? 600 : 400,
        fontFamily: 'inherit',
      }}
    >
      {props.label}
    </button>
  );
}

/** A collapsed error-type row: severity dot, rule id + description, count, caret. */
function GroupHeader({ group, open, onToggle }: { group: IssueGroup; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={open}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        textAlign: 'left',
        padding: '9px 12px',
        borderStyle: 'solid',
        borderTopWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderLeftWidth: 4,
        borderTopColor: 'var(--border)',
        borderRightColor: 'var(--border)',
        borderBottomColor: 'var(--border)',
        borderLeftColor: SEV_COLOR[group.severity],
        borderRadius: 8,
        background: 'var(--surface)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        width: '100%',
      }}
    >
      <span style={{ flexShrink: 0, color: 'var(--muted)', fontSize: 11, width: 10 }}>{open ? '▾' : '▸'}</span>
      <span
        style={{
          flexShrink: 0,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: SEV_COLOR[group.severity],
        }}
      />
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <strong style={{ fontWeight: 600 }}>{group.ruleId}</strong>
        <span style={{ color: 'var(--muted)' }}> · {group.description}</span>
      </span>
      <span
        style={{
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 700,
          color: SEV_COLOR[group.severity],
          background: SEV_BG[group.severity],
          borderRadius: 10,
          padding: '1px 9px',
        }}
      >
        {group.issues.length}
      </span>
    </button>
  );
}

/** A terse, single-line finding row under an expanded group. */
function TerseRow({ issue, selected, onClick }: { issue: Issue; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={terseLine(issue)}
      style={{
        display: 'block',
        textAlign: 'left',
        padding: '6px 10px 6px 32px',
        border: '1px solid ' + (selected ? SEV_COLOR[issue.severity] : 'transparent'),
        borderRadius: 6,
        background: selected ? SEV_BG[issue.severity] : 'transparent',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 12.5,
        lineHeight: 1.4,
        color: 'var(--text)',
        width: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {terseLine(issue)}
    </button>
  );
}

/** The right-hand detail panel for the selected issue. */
function IssueDetail({ issue, onNavigate }: { issue: Issue; onNavigate?: (tab: SourceTabId) => void }) {
  const rule = RULE_BY_ID[issue.ruleId];
  return (
    <div
      style={{
        borderStyle: 'solid',
        borderTopWidth: 3,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderLeftWidth: 1,
        borderTopColor: SEV_COLOR[issue.severity],
        borderRightColor: 'var(--border)',
        borderBottomColor: 'var(--border)',
        borderLeftColor: 'var(--border)',
        borderRadius: 10,
        background: 'var(--surface)',
        padding: '16px 18px 20px',
        maxHeight: '72vh',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: SEV_COLOR[issue.severity],
            border: `1px solid ${SEV_COLOR[issue.severity]}`,
            borderRadius: 4,
            padding: '2px 6px',
          }}
        >
          {SEV_LABEL[issue.severity].toUpperCase()}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{issue.ruleId}</span>
        {rule?.description && (
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {rule.description}</span>
        )}
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text)', marginBottom: 16 }}>
        {issue.message}
      </div>

      {rule?.rationale && <Section title="Why this matters">{rule.rationale}</Section>}
      {rule?.fix && <Section title="Suggested correction">{rule.fix}</Section>}

      {rule?.citations && rule.citations.length > 0 && (
        <SectionBlock title="References">
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>
            {rule.citations.map((c, i) => (
              <li key={i}>
                {c.href ? (
                  <a href={c.href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                    {c.label} ↗
                  </a>
                ) : (
                  c.label
                )}
              </li>
            ))}
          </ul>
        </SectionBlock>
      )}

      <SectionBlock title="Where to look">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(rule?.sourceTabs ?? []).map(tab => (
            <button
              key={tab}
              onClick={() => onNavigate?.(tab)}
              disabled={!onNavigate}
              style={{
                padding: '5px 12px',
                border: '1px solid var(--accent)',
                borderRadius: 8,
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
                cursor: onNavigate ? 'pointer' : 'default',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'inherit',
              }}
            >
              Open {SOURCE_TAB_LABEL[tab]} →
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
          {issue.positionNumber ? `Position ${issue.positionNumber}` : ''}
          {issue.emplId ? `${issue.positionNumber ? ' · ' : ''}Employee ${issue.emplId}` : ''}
          {issue.sourceRows && issue.sourceRows.length > 0
            ? `${issue.positionNumber || issue.emplId ? ' · ' : ''}Source row ${issue.sourceRows.join(', ')}`
            : ''}
        </div>
      </SectionBlock>
    </div>
  );
}

/** A labelled paragraph block in the detail panel. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <SectionBlock title={title}>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>{children}</div>
    </SectionBlock>
  );
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          color: 'var(--muted)',
          marginBottom: 5,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
