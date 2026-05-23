import { useState } from 'react';
import { useAppStore } from '../../lib/store';
import type { IssueSeverity } from '../../lib/quality/types';

const SEV_COLOR: Record<IssueSeverity, string> = {
  error:   '#c0392b',
  warning: '#e67e22',
  info:    '#2980b9',
};

const SEV_BG: Record<IssueSeverity, string> = {
  error:   '#fdf0ef',
  warning: '#fef6ec',
  info:    '#eaf4fb',
};

const SEV_LABEL: Record<IssueSeverity, string> = {
  error:   'Error',
  warning: 'Warning',
  info:    'Info',
};

export function DataIssuesPanel() {
  const issues = useAppStore(s => s.issues);
  const [open, setOpen] = useState(false);

  const errorCount   = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  const badgeColor = errorCount > 0 ? SEV_COLOR.error
    : warningCount > 0 ? SEV_COLOR.warning
    : '#27ae60';

  if (issues.length === 0) return null;

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text)',
        }}
        aria-expanded={open}
      >
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 22,
          height: 22,
          borderRadius: 11,
          background: badgeColor,
          color: '#fff',
          fontSize: 11,
          fontWeight: 700,
          padding: '0 6px',
        }}>
          {issues.length}
        </span>
        Data Issues
        {errorCount > 0 && (
          <span style={{ color: SEV_COLOR.error, fontWeight: 400, fontSize: 13 }}>
            {errorCount} error{errorCount !== 1 ? 's' : ''}
          </span>
        )}
        {warningCount > 0 && (
          <span style={{ color: SEV_COLOR.warning, fontWeight: 400, fontSize: 13 }}>
            {warningCount} warning{warningCount !== 1 ? 's' : ''}
          </span>
        )}
        <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: 12 }}>
          {open ? '▲ collapse' : '▼ expand'}
        </span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {issues.map((issue, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 16px',
                borderBottom: i < issues.length - 1 ? '1px solid var(--border)' : undefined,
                background: SEV_BG[issue.severity],
              }}
            >
              <span style={{
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 700,
                color: SEV_COLOR[issue.severity],
                background: 'transparent',
                border: `1px solid ${SEV_COLOR[issue.severity]}`,
                borderRadius: 4,
                padding: '2px 5px',
                marginTop: 1,
              }}>
                {SEV_LABEL[issue.severity].toUpperCase()}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, lineHeight: 1.4 }}>{issue.message}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {issue.ruleId}
                  {issue.positionNumber && ` · Position ${issue.positionNumber}`}
                  {issue.sourceRows && issue.sourceRows.length > 0 && ` · Row ${issue.sourceRows.join(', ')}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
