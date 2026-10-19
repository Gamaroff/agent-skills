# Sprint Review Summary - security-probe: run a Python CLI under the `cli:` entry form

**Story/Task ID:** task.215
**Completed Date:** 2026-10-19
**Completed By:** Lorien Gamaroff (develop-task pipeline)
**Pull Request:** [#692](https://github.com/Gamaroff/agent-skills/pull/692)

---

## Summary

The security probe engine can now run a Python script through the existing `cli:` entry form. A
Python boundary, such as omarchy-leak-radar's `threatradar.py`, can be probed at `/finalise` instead
of failing the zero-candidates guard. A Python crash is scored `errored`, never as a refusal.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] SC1 — `cli:<fixture>.py` returns `executed > 0` with the expected verdicts
- [x] SC2 — a `.py` entry is no longer declined for its extension; every other decline reason is unchanged
- [x] SC3 — the result and run record carry `interpreter` (`python3` and its version) for `.py`, `null` otherwise
- [x] SC4 — a Python crash is `errored`, never `rejected`; a plain `sys.exit(1)` refusal stays `rejected`

### Key Features Implemented

- **Extension → interpreter map**: `.mjs`/`.js` run under Node; `.py` runs under `python3 -E -s -B`. If `python3` will not run, the entry is declined once, with a detail naming it.
- **Positive exit record**: a bootstrap writes `answer <nonce>` or `crash <nonce>` on fd 3. A missing record is `errored`, and a crash record outranks an answer.
- **Shutdown failure**: a `.py` exit 120 (a failed flush at interpreter shutdown) is `errored`.
- **Stated limits**: the safe direction (`closerange`, `os._exit`, `exec`, a `python3` that will not start → `errored`) and the false-alarm direction (a worker-thread, atexit or finaliser exception that leaves exit 0). Both are stated once, in `probe-boundary-rule.md` §5.

---

## Technical Details

### Files Modified/Created

- `shared/resources/security-probe.mjs` — the Python arm, bootstrap, exit record and `interpreter` field (plus bundled copies in finalise, qa-story, qa-task, review-security)
- `shared/resources/probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `security-review-prompt.md` — the routing docs and the stated limits
- `skills/{qa-task,qa-story,review-security}/SKILL.md` — "a Node or Python CLI"
- `shared/resources/tests/security-probe.test.mjs` — 23 Python tests; 25 `.py` fixtures
- `CHANGELOG.md` — `[Unreleased]` entry

### Architecture/Design Decisions

The `cli:` form is extended by file extension rather than with a new `py-cli:` prefix, because the
`cli:` contract does not depend on the runtime. The verdict comes from a positive exit record, not
from stderr heuristics, after seven QA cycles showed that crash detection based on stderr could be
evaded.

### Dependencies

- **New Dependencies Added:** None (`python3` is the consumer's interpreter, resolved from `PATH`)
- **Breaking Changes:** None

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 23 Python tests in `shared/resources/tests/security-probe.test.mjs`; the full suite passes (5929 tests, 0 failures)
- **QA:** 7 cycles, ending at gate 7 PASS 95; bugs 1–10 found and closed
- **DoD probe:** 12 controls, 71 executed, 0 reproduced, 0 escapes

### Code Review

- **Reviewers:** QA's diff reviewer on every cycle; Step 5c `/review-pr` APPROVE
- **Approval Status:** ✅ Approved (the host requires no formal review)
- **Review Comments Addressed:** PC-1 and PC-2 (LOW) fixed

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] Case input reaches argv only as a whole element; the spawn uses no shell
- [x] The child runs in the sandbox `caseEnv` with `-E -s -B`; no escapes recorded
- [x] No secrets; no new dependencies

### Compliance Review

✅ **Not applicable**: internal tooling with no personal, payment, UI or health data.

---

## Documentation

### Updated Documentation

- [x] `probe-boundary-rule.md` §5: the Python arm and both stated limits
- [x] Routing docs in the skill prompts and SKILL.md files
- [x] CHANGELOG `[Unreleased]`

---

## Demo Notes

### How to Verify

1. `command node shared/resources/security-probe.mjs --sink url-authority --entry 'cli:shared/resources/tests/fixtures/security-probe/cli-refuser.py' --argv '["--mode","strict","--host","{input}"]' --json`
2. The verdict is `engages`, `executed > 0`, and `interpreter.name` is `python3`.
3. Swap in `cli-crasher-excepthook.py`: its hostile cases are `errored`, never `rejected`.

---

## Impact & Value

### User Impact

Consumer repositories with Python boundaries (omarchy-leak-radar story 3.1.1 and the PRD 3 leak
guard) can pass `/finalise` on measured probe evidence instead of a human override.

### Technical Impact

The probe engine gains a fourth runtime under an existing form. Its crash-versus-answer decision now
rests on a positive record, not on stderr shapes.

---

## Known Limitations & Future Work

### Current Limitations

- An exception Python prints and swallows outside the main frame (a worker thread, atexit handler or finaliser) leaves exit 0, so a hostile case reads `accepted`. This is a false alarm, never a pass, and it is stated in `probe-boundary-rule.md`.
- No `.py` test runs under the `path` sink (the setup is shared with the Node arm, which is tested).

### Suggested Follow-Up Stories

- Release and re-vendor into consumers; prove `cli:scripts/threatradar.py` against omarchy-leak-radar (Deferred Work).
- TASK-215-QA7-1 to QA7-3 (LOW): the thread-crash test's cwd dependence; stderr in the exit-120 detail; CHANGELOG wording.

---

## Metrics _(if applicable)_

- **QA Cycles:** 7
- **Lines of Code Changed:** +8921 / −162 across 97 files (most of it fixtures, QA artefacts and bundled copies)

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
