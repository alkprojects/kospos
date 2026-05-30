/**
 * Issues / Corrections — a dedicated, full-page surface for everything the
 * data-quality audits flagged for review (Alex's S56 ask: "a section that
 * highlights all potential issues that require correction", out of Source
 * Tables). Reads the same `issues` the store computes via `runRules` on import,
 * so it stays in lock-step with the inline Data Issues panel and the
 * per-position flags — this is the comprehensive, actionable view.
 */

import { useMemo, useState } from 'react';
import { useAppStore } from '../../store';
import { ALL_RULES } from '../../quality';
import type { Issue, IssueSeverity } from '../../quality/types';

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

/** ruleId → human description, from the registered rules. */
const RULE_DESC: Record<string, string> = Object.fromEntries(
  ALL_RULES.map(r => [r.id, r.description]),
);

type Filter = IssueSeverity | 'all';

export function IssuesView() {
  const issues = useAppStore(s => s.issues);
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => {
    const c: Record<IssueSeverity, number> = { error: 0, warning: 0, info: 0 };
    for (const i of issues) c[i.severity]++;
    return c;
  }, [issues]);

  const shown = useMemo(() => {
    const base = filter === 'all' ? issues : issues.filter(i => i.severity === filter);
    return [...base].sort(
      (a, b) =>
        SEV_RANK[a.severity] - SEV_RANK[b.severity] ||
        a.ruleId.localeCompare(b.ruleId) ||
        (a.positionNumber ?? '').localeCompare(b.positionNumber ?? ''),
    );
  }, [issues, filter]);

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 24px 64px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Issues / Corrections</h1>
      <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
        Everything the data-quality audits flagged for review — supervisory pay that may be owed,
        acting-pay entries that don't reconcile across PS HCM, and cross-system mismatches. Load
        your reports under <strong>Load Reports</strong> to run the checks.
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
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
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
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {shown.map((issue, i) => (
              <IssueRow key={`${issue.ruleId}-${issue.positionNumber ?? ''}-${issue.emplId ?? ''}-${i}`} issue={issue} />
            ))}
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
        border: '1px solid',
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

function IssueRow({ issue }: { issue: Issue }) {
  const meta: string[] = [
    RULE_DESC[issue.ruleId] ? `${issue.ruleId} · ${RULE_DESC[issue.ruleId]}` : issue.ruleId,
  ];
  if (issue.positionNumber) meta.push(`Position ${issue.positionNumber}`);
  if (issue.emplId) meta.push(`Empl ${issue.emplId}`);
  if (issue.sourceRows && issue.sourceRows.length > 0) meta.push(`Row ${issue.sourceRows.join(', ')}`);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 16px',
        border: '1px solid var(--border)',
        borderLeft: `4px solid ${SEV_COLOR[issue.severity]}`,
        borderRadius: 8,
        background: SEV_BG[issue.severity],
      }}
    >
      <span
        style={{
          flexShrink: 0,
          fontSize: 10,
          fontWeight: 700,
          color: SEV_COLOR[issue.severity],
          border: `1px solid ${SEV_COLOR[issue.severity]}`,
          borderRadius: 4,
          padding: '2px 6px',
          marginTop: 1,
        }}
      >
        {SEV_LABEL[issue.severity].toUpperCase()}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, lineHeight: 1.45 }}>{issue.message}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{meta.join(' · ')}</div>
      </div>
    </div>
  );
}
