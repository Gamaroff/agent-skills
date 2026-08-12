# Sprint Review Summary — Task 41

**Task:** New pipeline moments, workflow-file scaffolding, and the `develop-bug` gap
**Status:** ✅ Accepted · **PR:** [#208](https://github.com/Gamaroff/agent-skills/pull/208) · **Issue:** [#189](https://github.com/Gamaroff/agent-skills/issues/189)
**Accepted:** 2026-08-12 · **QA Gate:** PASS 96/100 · **QA Cycles:** 2

---

## Summary

The capstone of the tracker-workflow series (tasks 37–41). All eight pipeline moments now have a call site, `tracker-workflow.yaml` reaches consumers' disks without ever overwriting one, both stage CLIs gained the CI check that `jira-sync.js` had been promising in a comment since v0.34.0, and `develop-bug` stopped being the odd pipeline out.

## What landed

**Two moments that had been declared but never fired.** They covered the two parts of a run the board could not see at all: a card sat frozen in review through up to five QA fix cycles, and nothing whatsoever fired when the PR actually merged — the one moment at which "the code is on `develop`" is known.

- `changes-requested` fires per QA fix cycle, from the shared QA-loop step file.
- `pr-merged` fires from `/develop-next` and `/develop-batch` after the merge — not from the develop pipelines, which finish while the PR is still open.

**Scaffolding that cannot destroy a hand-tuned file.** `setup-consumer.sh` writes the workflow file when absent and reports `kept (existing)` otherwise. `--init-workflow [--force]` gives consumers who upgrade a skill directory a one-command route, converting an existing `jira.workflowRecord` into the YAML ladder with hand-authored `reason:` strings preserved as comments.

**A CI check that can actually fail.** `--check [--offline]` is the one mode in this family that exits non-zero, because it runs in CI rather than inside a pipeline step. It catches the failure that breaks working setups silently: a renamed board column.

**`develop-bug` parity.** Its verify loop signalled nothing at all for a full release — the file is skill-native, and the shared step file moved on without it.

## Impact

| Before | After |
|---|---|
| A card froze in review for up to 5 QA cycles | Board tracks each fix cycle |
| Nothing fired at merge; no post-merge column was expressible | `pr-merged` makes a showcase/release column expressible |
| Consumers hand-wrote the workflow file from documentation | Scaffolded on install; one command on upgrade |
| A renamed column broke card movement silently | `--check` fails CI on drift |
| `in-qa` worked for stories and tasks but not bugs | All three pipelines signal the same moments |

**Nothing changes for an existing consumer who does nothing.** Both new moments are absent from the default map, so they fire nowhere until a status is named for them — verified live against this repo's board.

## Testing & QA

- **1104 tests pass / 0 fail** (+24 from this task, +5 from qa-fix)
- `npm run eval:all` exit 0
- CI green — `link-check`, `test`, `validate` — on the exact final commit
- Live end-to-end: `--init-workflow` generated a file matching this repo's real board columns, which then passed `--check`; renaming a column made `--check` exit 1 while `--offline` still passed

## Worth demoing

The pipeline **found and fixed a HIGH-severity defect in its own output** before accepting it. The scaffolder inferred "file written" from an exit code this CLI family deliberately returns as `0` on write-nothing skips — an unauthenticated `gh` would have left consumers with no workflow file while the wizard printed "generated from your live board".

Two things about how it was caught are worth showing:

1. It was found by **executing** the code against throwaway consumer repos, not by reading the diff. The defect is semantic — what an exit code *means* to a caller — so no amount of re-reading would have surfaced it.
2. The fix was verified by **reintroducing the defect** to prove the new regression test genuinely fails. A passing test proves nothing about a fix unless it would fail without it.

The probe branch had zero test coverage, which is exactly why the defect shipped green at 1099/1099 — the same shape of gap this task fixes in `develop-bug`.

## Known limitations

1. `gh-stage --init-workflow` needs an `--issue` to reach a board and the wizard has none to give, so on GitHub the wizard's normal outcome is the template. Handled and commented, but board-derived scaffolding does not happen on GitHub today.
2. The Jira `--check` board half compares against the local workflow record rather than a live probe — credential-free, but would not catch a column renamed since the record was written.

## Artifacts

`task.41.dod.1` (DoD) · `task.41.qa.1`/`qa.2` + `gate.1`/`gate.2` (QA) · `task.41.review.1` (review) · `task.41.bug.1`–`bug.3` (all closed) · `task.41.implementation.1` (audit trail)
