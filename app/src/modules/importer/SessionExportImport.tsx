/**
 * SessionExportImport — the **Publish** panel on the Load Reports tab.
 *
 * Local-file Save / Load moved to the header top bar (`SessionSaveLoad`) in
 * Phase 2.2.u. This panel now owns the heavier, less-frequent session-sharing
 * controls:
 *
 *   - **Cloudflare publish** (Phase 2.2.q PR 2): push the current snapshot to a
 *     shared Cloudflare Workers KV namespace so other browsers / devices load
 *     it on next open. Gated by a publish secret stored in localStorage.
 *   - The Cloudflare Pages URL + publish-secret settings (one-time setup).
 *   - The session status summary (rows / actions / notes / scraper counts).
 *
 * IndexedDB auto-save runs separately — see `useAutoSessionPersistence` +
 * `LandingView` for that status. The snapshot itself is built by the shared
 * `useSessionSnapshot` hook so Save, Load, and Publish never drift.
 *
 * The publish flow requires Alex to set up the Cloudflare Pages project + KV
 * binding once, then paste the Pages URL + publish secret here. See
 * `docs/research/persistence-architecture-options.md` for the rationale + steps.
 */

import { useEffect, useState } from 'react';
import { SESSION_SCHEMA_VERSION } from '../../lib/session/snapshot';
import { useSessionSnapshot } from '../../lib/session/use-session-snapshot';
import {
  publishSnapshot,
  readCloudflareConfig,
  writeCloudflareConfig,
  type CloudflareConfig,
  type PublishStage,
} from '../../lib/session/cloudflare-publish';

type Status =
  | { kind: 'idle' }
  // S41 UX: `stage` lets the banner show what phase we're in (building the
  // in-memory snapshot, gzip-compressing, uploading) so the user sees motion
  // instead of a static "Publishing…" line for several seconds on large data.
  | { kind: 'publishing'; stage: 'building' | PublishStage }
  | { kind: 'published'; savedAt: string; bytes: number }
  | { kind: 'config-saved' }
  | { kind: 'error'; message: string };

export function SessionExportImport() {
  const { buildCurrentSnapshot, isEmpty, counts } = useSessionSnapshot();

  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [config, setConfig] = useState<CloudflareConfig>(() => readCloudflareConfig());
  const [showConfig, setShowConfig] = useState(false);

  // Re-read config when the toggle opens — covers the case where the user
  // pastes a value in DevTools then opens the panel.
  useEffect(() => {
    if (showConfig) setConfig(readCloudflareConfig());
  }, [showConfig]);

  async function handlePublish() {
    // S41 UX: set the publishing banner BEFORE the heavy work starts, then
    // yield to React (await a microtask) so the banner paints before
    // JSON.stringify on a large payload blocks the main thread for several
    // seconds. With these yields the spinner is visible immediately + the
    // browser stays responsive enough to skip its "page unresponsive" dialog.
    setStatus({ kind: 'publishing', stage: 'building' });
    await new Promise(r => setTimeout(r, 0));
    const file = buildCurrentSnapshot();
    await new Promise(r => setTimeout(r, 0));
    const result = await publishSnapshot(file, undefined, undefined, stage => {
      setStatus({ kind: 'publishing', stage });
    });
    if (result.ok) {
      setStatus({ kind: 'published', savedAt: result.savedAt, bytes: result.bytes });
      return;
    }
    const msg = (() => {
      switch (result.reason) {
        case 'not-configured':
          return 'Cloudflare Pages URL not set. Open settings below to configure.';
        case 'no-secret':
          return 'Publish secret not set. Open settings below to paste it.';
        case 'http-error':
          return `Publish failed (HTTP ${result.status}): ${result.detail}`;
        case 'network-error':
          return `Publish failed (network): ${result.detail}`;
      }
    })();
    setStatus({ kind: 'error', message: msg });
  }

  function handleSaveConfig() {
    writeCloudflareConfig(config);
    setStatus({ kind: 'config-saved' });
  }

  // S41 fix: pagesUrl is optional (the cloudflare-publish helpers default to a
  // relative /api/snapshot when it's empty), so the publish button only requires
  // the secret. From the deployed site: "paste the secret once, then publish".
  const publishConfigured = config.publishSecret !== '';
  const publishDisabled = isEmpty || !publishConfigured || status.kind === 'publishing';

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 14 }}>Session</strong>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          Publish the current snapshot to Cloudflare so other devices load it on
          next open. (Save / Load a local file are in the top bar.) The snapshot
          includes loaded rows + Hiring Plan actions + position notes + the
          latest job-posting / eligibility-list refresh.
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={handlePublish}
          disabled={publishDisabled}
          aria-label="Publish snapshot to Cloudflare so other devices can load it"
          title={
            !publishConfigured
              ? 'Paste the publish secret in settings below.'
              : isEmpty
                ? 'Nothing to publish — load some data first.'
                : 'Publish current snapshot to Cloudflare. Other devices will load it on next open.'
          }
          style={{
            padding: '5px 14px',
            border: `1px solid ${publishDisabled ? 'var(--border)' : 'var(--accent)'}`,
            borderRadius: 14,
            background: publishDisabled ? 'var(--surface)' : 'transparent',
            color: publishDisabled ? 'var(--muted)' : 'var(--accent)',
            cursor: publishDisabled ? 'not-allowed' : 'pointer',
            fontSize: 13, fontFamily: 'inherit', fontWeight: 600,
          }}
        >
          ☁ Publish snapshot
        </button>
        <button
          onClick={() => setShowConfig(!showConfig)}
          aria-label="Cloudflare publish settings"
          aria-expanded={showConfig}
          style={{
            padding: '5px 12px',
            border: '1px solid var(--border)', borderRadius: 14,
            background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
            fontSize: 12, fontFamily: 'inherit',
          }}
        >
          ⚙ Cloudflare settings
        </button>
        <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
          schema v{SESSION_SCHEMA_VERSION} · {counts.loadedRows.toLocaleString('en-US')} rows
          {counts.actions > 0 && <> · {counts.actions} planned action{counts.actions === 1 ? '' : 's'}</>}
          {counts.hidden > 0 && <> · {counts.hidden} hidden</>}
          {counts.notes > 0 && <> · {counts.notes} note{counts.notes === 1 ? '' : 's'}</>}
          {counts.separations > 0 && <> · {counts.separations} separation{counts.separations === 1 ? '' : 's'}</>}
          {counts.probations > 0 && <> · {counts.probations} probation{counts.probations === 1 ? '' : 's'}</>}
          {counts.postings > 0 && <> · {counts.postings.toLocaleString('en-US')} posting{counts.postings === 1 ? '' : 's'}</>}
          {counts.eligibilityLists > 0 && <> · {counts.eligibilityLists.toLocaleString('en-US')} eligibility list{counts.eligibilityLists === 1 ? '' : 's'}</>}
        </span>
      </div>

      {showConfig && (
        <div
          aria-label="Cloudflare publish settings"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: 12,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            One-time setup. See <a href="https://github.com/alkprojects/kospos/blob/main/docs/research/persistence-architecture-options.md" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>persistence-architecture-options.md</a> for the full Cloudflare Pages + KV setup steps.
            Values stay on this device (localStorage) — never in the bundle.
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
            <span style={{ fontWeight: 500 }}>Cloudflare Pages URL</span>
            <input
              type="url"
              placeholder="https://kospos.pages.dev"
              value={config.pagesUrl}
              onChange={e => setConfig(c => ({ ...c, pagesUrl: e.target.value }))}
              style={{
                padding: '4px 8px', fontSize: 12, fontFamily: 'monospace',
                border: '1px solid var(--border)', borderRadius: 4,
              }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
            <span style={{ fontWeight: 500 }}>Publish secret</span>
            <input
              type="password"
              placeholder="value of PUBLISH_SECRET env var in Cloudflare Pages settings"
              value={config.publishSecret}
              onChange={e => setConfig(c => ({ ...c, publishSecret: e.target.value }))}
              style={{
                padding: '4px 8px', fontSize: 12, fontFamily: 'monospace',
                border: '1px solid var(--border)', borderRadius: 4,
              }}
            />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSaveConfig}
              style={{
                padding: '4px 12px',
                border: '1px solid var(--accent)', borderRadius: 12,
                background: 'var(--accent)', color: '#fff', cursor: 'pointer',
                fontSize: 12, fontFamily: 'inherit', fontWeight: 600,
              }}
            >
              Save settings
            </button>
            <button
              onClick={() => {
                setConfig({ pagesUrl: '', publishSecret: '' });
              }}
              style={{
                padding: '4px 12px',
                border: '1px solid var(--border)', borderRadius: 12,
                background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
                fontSize: 12, fontFamily: 'inherit',
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {status.kind === 'publishing' && (
        <div style={{
          fontSize: 12, color: '#1e40af',
          background: '#dbeafe', border: '1px solid #2563eb', borderRadius: 4,
          padding: '6px 10px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {/* SMIL-animated spinner — no CSS keyframes needed. Gives the banner
              motion so the user knows the work isn't frozen even when the main
              thread is briefly blocked by JSON.stringify on a large payload. */}
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="10" stroke="#93c5fd" strokeWidth="3" fill="none" />
            <path d="M 12 2 A 10 10 0 0 1 22 12" stroke="#2563eb" strokeWidth="3" fill="none" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
            </path>
          </svg>
          <span>
            {status.stage === 'building' && 'Building snapshot from in-memory state…'}
            {status.stage === 'compressing' && 'Compressing snapshot for upload…'}
            {status.stage === 'uploading' && 'Uploading to Cloudflare…'}
          </span>
        </div>
      )}
      {status.kind === 'published' && (
        <div style={{
          fontSize: 12, color: 'var(--success)',
          background: 'var(--success-soft)', border: '1px solid var(--success)', borderRadius: 4,
          padding: '6px 10px',
        }}>
          Published snapshot ({(status.bytes / 1024).toLocaleString('en-US', { maximumFractionDigits: 1 })} KB).
          Anyone with the Cloudflare URL will load this on next open.
        </div>
      )}
      {status.kind === 'config-saved' && (
        <div style={{
          fontSize: 12, color: 'var(--success)',
          background: 'var(--success-soft)', border: '1px solid var(--success)', borderRadius: 4,
          padding: '6px 10px',
        }}>
          Cloudflare settings saved to this browser.
        </div>
      )}
      {status.kind === 'error' && (
        <div style={{
          fontSize: 12, color: 'var(--danger)',
          background: 'var(--danger-soft)', border: '1px solid #dc2626', borderRadius: 4,
          padding: '6px 10px',
        }}>
          {status.message}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        Session data contains SF public-employee records (names, IDs, classifications,
        salaries) — all public under the Sunshine Ordinance + state law. Private fields
        (SSN, dependents, health info) aren't in these reports. Local saves stay on
        this device (file + IndexedDB auto-save). Cloudflare publishing is opt-in:
        anyone with the Pages URL can read; only those with the publish secret can write.
      </div>
    </div>
  );
}
