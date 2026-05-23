# Budget Phases

The SF budget cycle has multiple phases. Each one is a snapshot KosPos should be able to compare against.

## Phases

| Phase | Who | What happens |
|---|---|---|
| **Base** | CON | Each year, CON updates the base budget primarily with non-technical items (e.g., actuarial retirement rate information). |
| **Department** | Departments | Departments submit a budget proposal. **KosPos primary use case.** |
| **Mayor** | Mayor's Office | Mayor submits the proposal (May 1 / June 1 books). |
| **Committee** | BOS Budget & Appropriations Committee | Reviews the budget; can make changes but cannot increase the total size beyond the Mayor's proposal. |
| **Technical** | CON | Technical adjustments. |
| **Board** | Full Board of Supervisors | Final approval. |

## What KosPos models

- Snapshots labeled by phase + fiscal year.
- Diff view between any two snapshots (e.g., "what changed between Department phase and Mayor phase?").
- Phase 8 exports a Department-phase proposal in a BFM-compatible format.

## Reference

- Mayor's Budget Instructions — see [`docs/data-sources/mayor.md`](../data-sources/mayor.md).
- CON budget policy + technical instructions — see [`docs/data-sources/controller.md`](../data-sources/controller.md).
