/**
 * ModalFooter — the right-aligned Delete / Cancel / Save footer shared by the
 * three detail editors (SeparationDetail, ProbationDetail, PlannedActionDetail).
 *
 * The three carried byte-identical copies of this footer. C1 follow-up to the
 * Phase 2.2.w `Modal` lift (docs/proposals/s46-ui-ux-review.md § C1). No visual
 * change — an exact extraction.
 *
 * `onDelete` is optional: omit it (PlannedActionDetail does, for derived rows)
 * and the Delete button isn't rendered. `saveLabel` overrides the Save text
 * (PlannedActionDetail's convert mode reads "Save (convert to manual)").
 */

export interface ModalFooterProps {
  /** When provided, renders a left-pushed danger "Delete" button. */
  onDelete?: () => void;
  /** Label for the delete button. Default "Delete". */
  deleteLabel?: string;
  onCancel: () => void;
  onSave: () => void;
  /** Gates the Save button's enabled state + filled styling. */
  canSave: boolean;
  /** Label for the save button. Default "Save". */
  saveLabel?: string;
}

export function ModalFooter({
  onDelete,
  deleteLabel = 'Delete',
  onCancel,
  onSave,
  canSave,
  saveLabel = 'Save',
}: ModalFooterProps) {
  return (
    <footer style={{
      display: 'flex', gap: 8, justifyContent: 'flex-end',
      borderTop: '1px solid var(--border)', paddingTop: 12,
    }}>
      {onDelete && (
        <button
          onClick={onDelete}
          style={{
            marginRight: 'auto',
            padding: '5px 12px',
            border: '1px solid #b91c1c', borderRadius: 14,
            background: 'transparent', color: '#b91c1c', cursor: 'pointer',
            fontSize: 13, fontFamily: 'inherit',
          }}
        >
          {deleteLabel}
        </button>
      )}
      <button
        onClick={onCancel}
        style={{
          padding: '5px 12px',
          border: '1px solid var(--border)', borderRadius: 14,
          background: 'transparent', color: 'inherit', cursor: 'pointer',
          fontSize: 13, fontFamily: 'inherit',
        }}
      >
        Cancel
      </button>
      <button
        onClick={onSave}
        disabled={!canSave}
        style={{
          padding: '5px 16px',
          border: '1px solid var(--accent)', borderRadius: 14,
          background: canSave ? 'var(--accent)' : 'var(--surface)',
          color: canSave ? '#fff' : 'var(--muted)',
          cursor: canSave ? 'pointer' : 'not-allowed',
          fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
        }}
      >
        {saveLabel}
      </button>
    </footer>
  );
}
