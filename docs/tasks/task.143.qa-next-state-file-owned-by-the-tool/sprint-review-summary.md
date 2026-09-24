# Sprint Review Summary - qa-next: uat-status.mjs owns the run state file

**Story/Task ID:** task.143
**Completed Date:** 2026-09-24
**Completed By:** develop-task pipeline (Claude), accepted by the operator
**Pull Request:** [#475](https://github.com/Gamaroff/agent-skills/pull/475)

---

## Summary

`/qa-next`'s run state file used to be a JSON shape described in prose across SKILL.md Steps 0–6. It is now owned by `uat-status.mjs`: four `--state-*` subcommands and one exported `STATE_FIELDS` schema, so tests hold every field's writer and reader. The three LOW deferrals task.141 left in the same area are closed.

---

## What Was Delivered

### Success Criteria Met

- [x] `--state-init --item <id>` / `--state-init --next` write the state and print the same payload `--item` / `--next` print
- [x] A second `--state-init` over any existing state exits 5 `run-in-progress` and writes nothing. When inits race, exactly one wins (exclusive `link()` create)
- [x] `--state-get` returns the pre-run `priorRuns` and `bug` after the run file is written
- [x] `--state-set` refuses unknown fields, init-only fields and backward `phase` moves, each by name
- [x] A legacy (v0.51.0) state file resumes: `targeted`, `priorRuns`, `bug` and `filedBug` are derived and named in `derived`. A best-effort value is also named in `unverifiable`
- [x] `--env 10`, `--env a/b` and `--env ..` are refused before anything is written

### Key Features Implemented

- **Tool-owned state**: `--state-init / --state-get / --state-set / --state-clear`, with exit codes 5 (`run-in-progress`), 6 (`no-state`) and 1 (`state-malformed`)
- **One schema in code**: `STATE_FIELDS` names each field's writer (`init` or `set`), value type and readers; the schema tests are derived from it
- **SKILL.md speaks commands**: every state read and write in Steps 0–6, the resume map and the stop conditions names the command that does it
- **Legacy migration, stated honestly**: from `executed` on, an old state's `priorRuns` is flagged `unverifiable` rather than presented as exact, because v0.51.0 never recorded which run file was its own

---

## Technical Details

### Files Modified/Created

- `skills/qa-next/scripts/uat-status.mjs`: state subcommands, `STATE_FIELDS`, legacy derivation, `--env` built-name guard
- `skills/qa-next/SKILL.md`: § State file, Steps 0–6, resume map and stop-condition table rewritten to commands
- `skills/qa-next/README.md`: owner commands
- `evals/qa-next/unit/uat-status.test.mjs`: 44 → 63 tests
- `shared/resources/tests/security-probe.test.mjs`: the cli-consumer test now asserts `engages`
- `CHANGELOG.md`: `[Unreleased]` entries citing (task 143), with a Migration line

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** `--env` refuses labels that would collide with the `-NN` sequence suffix or leave `runs/<id>/` (Migration line in the CHANGELOG)

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 63 in `evals/qa-next/unit/uat-status.test.mjs`, green under `TMPDIR=/tmp` and in five timezones (UTC, +14, −11, Tokyo, local)
- **QA loop:** 7 cycles (5 + 2 granted), HIGH 0 throughout, MEDIUM `2, 1, 2, 0, 1, 1, 0`. The final gate (gate.7) is CONCERNS 90/100 and was **accepted by the operator**. Its one LOW entry was fixed in `f8b2c958` and was not re-gated
- **Security:** 47 probes executed at DoD. The `--state-set` field guard engages (22/22). The only `--env` labels that reproduce (whitespace and control characters) are identical on `develop`, so they are pre-existing and routed to a follow-up

### Code Review

- **Reviewers:** none. The Step 5c `/review-pr` conformance review did **not** run: the operator accepted gate.7 at the loop limit and finalised directly. The per-cycle diff reviews inside the QA loop (qa-task Step 3b) are the only code review this change had
- **Approval Status:** ⚠️ no review recorded on PR #475

---

## Security & Compliance

- Security: ✅ PASS. No secrets and no unsafe exec; both boundary controls were executed against hostile input
- Compliance: not applicable (no personal, payment, health or UI surface)

---

## Demo Notes

### How to Verify

1. `node skills/qa-next/scripts/uat-status.mjs --state-init --item D.1 --json` in a repo with a UAT registry prints the item payload and writes `.claude/state/qa-next.state.json`
2. Run it again: exit 5 `run-in-progress`, nothing written
3. `--state-set targeted true` is refused as init-only; `--state-set phase resolved` works; `--state-set phase selected` afterwards is refused as a backward move
4. `--state-clear` removes the file

---

## Known Limitations and Follow-ups

- `--env` accepts whitespace-only and control-character labels (pre-existing; probe-reproduced on `develop`)
- A v0.51.0 run interrupted inside Step 4 leaves its half-written file beside the fresh one, and a later run counts it (bug 6's documented trade-off against overwriting an earlier run)
- No lock-ownership check on `--state-set` (QA cycle 2 CR-1)
- Two test cleanups: the test takes its date from a separate clock read (CR-3), and one assertion only restates `--run-path` behaviour (CR-4)
