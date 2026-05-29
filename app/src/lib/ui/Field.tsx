/**
 * Field + inputStyle — the form-field primitives shared by the KosPos detail
 * editors.
 *
 * `inputStyle` and `Field` had been copy-pasted byte-for-byte across
 * SeparationDetail and ProbationDetail (and the same inline input/select style
 * object recurs in PlannedActionDetail). This is the C1 follow-up to the Phase
 * 2.2.w `Modal` lift (docs/proposals/s46-ui-ux-review.md § C1): with the
 * overlay-frame already shared, the field schemas are the next-largest
 * duplicated block.
 *
 * No visual change — these are exact extractions of the existing styles. (A
 * `<TextInput>` wrapper was considered and deferred: the inputs already share
 * `inputStyle()`, so wrapping them buys only call-site brevity at the cost of
 * rewriting every input tag — not worth it for a no-visual-change pass.)
 */

/** The shared text-input / select / textarea style. Spread it for the cases
 *  that need extra tweaks (monospace, fixed width, conditional borderColor):
 *  `style={{ ...inputStyle(), fontFamily: 'monospace', width: 120 }}`. */
export function inputStyle(): React.CSSProperties {
  return {
    padding: '5px 10px',
    border: '1px solid var(--border)', borderRadius: 4,
    fontSize: 13, fontFamily: 'inherit',
    background: 'var(--surface)', color: 'inherit',
  };
}

/** A labelled column wrapping one form control. `wide` spans the full row;
 *  otherwise the field sits on the standard 160px flex basis. `required`
 *  appends the red asterisk the editors use for mandatory fields. */
export function Field({ label, required, wide, children }: {
  label: string;
  required?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      flex: wide ? '1 1 100%' : '0 1 160px',
    }}>
      <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}{required && <span style={{ color: '#b91c1c' }}> *</span>}
      </span>
      {children}
    </label>
  );
}
