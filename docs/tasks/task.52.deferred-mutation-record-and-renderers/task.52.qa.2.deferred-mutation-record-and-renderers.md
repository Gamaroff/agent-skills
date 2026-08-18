# QA Report: Task 52 - One deferred-mutation record, four renderings of it (cycle 2)

**Task**: [task.52.deferred-mutation-record-and-renderers.md](./task.52.deferred-mutation-record-and-renderers.md)
**Gate File**: [task.52.gate.2.deferred-mutation-record-and-renderers.yml](./task.52.gate.2.deferred-mutation-record-and-renderers.yml)
**Previous Gate**: [task.52.gate.1.*.yml](./task.52.gate.1.deferred-mutation-record-and-renderers.yml) — FAIL, 25/100
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-18
**Gate Status**: PASS

---

## Executive Summary

All seven HIGH and six of the nine MEDIUM findings from cycle 1 are fixed. Each was verified by
**re-running the exact reproduction from its own bug report** against the fixed code, not by reading
the diff. The two remaining MEDIUMs are interception work — this task's declared Out of Scope — and
are deferred with rationale rather than silently dropped.

The re-review also found one further defect, and it was in the cycle-1 fix itself: BUG-5's
idempotency guard matched a bare `$IDENT` but not a name nested inside a header value, so
`Authorization: Bearer $JIRA_API_TOKEN` was still being masked on the second pass. That is the same
defect one level down, and the cycle-1 regression test passed because it exercised only the bare
form. Fixed and mutation-proven within the cycle.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context — every cycle-1 finding

Verified by executing each bug report's own reproduction command against the fixed code.

| ID | Issue | Status | Evidence |
| -- | ----- | ------ | -------- |
| BUG-1 | Checklist listed dependants twice | ✅ FIXED | 3 records → 3 checkboxes, one occurrence per id |
| BUG-2 | 32+ char rule corrupted content | ✅ FIXED | SHA, base64, URL and branch name all round-trip unchanged |
| BUG-3 | Command execution from the committed script | ✅ FIXED | Hostile records for all three paths executed; **no side-effect file created**; no bare injected line at file scope |
| BUG-4 | Distinct records collapsed to one id | ✅ FIXED | Two bodies → two ids → two records; identical re-emit still one |
| BUG-5 | Redaction not idempotent | ✅ FIXED | `redactArgv` is a fixed point on its own output |
| BUG-5b | *(new)* nested name still masked | ✅ FIXED | Found in this cycle, in the BUG-5 fix; see below |
| BUG-6 | `-u`/`-p` masked for every client | ✅ FIXED | `git push -u origin HEAD` and `mkdir -p` untouched; `curl -u` still masked |
| BUG-8 | Confirm gate aborted with no tty | ✅ FIXED | Guard present; script continues past the gate and reports a skip |
| BUG-9 | Roster truncated silently | ✅ FIXED | A bolded row now throws; count asserted against `EXPECTED_KIND_COUNT` |
| BUG-10 | Dot-env could restrict behind the resolver | ✅ FIXED | Both CLIs capture `ACCESS_TRACKER` before `loadDotEnv` |
| BUG-11 | Redaction holes (keys, userinfo, short) | ✅ FIXED | Key → `«redacted»`; userinfo masked; 7-char secret swept; config word preserved |
| BUG-12 | `GIT_AUTHOR_*` swept as a secret | ✅ FIXED | Author name preserved |
| BUG-13 | `renderMarkdown` mutated records | ✅ FIXED | Idempotent on a shared model; caller's records untouched |
| BUG-14 | Journal path cwd-relative | ✅ FIXED | Both gates pass the repo root |
| BUG-7 | `handover-render` not bundled/invoked | ⏸️ DEFERRED | Interception work — see below |
| BUG-15 | Gate defers without the board read | ⏸️ DEFERRED | Interception work — see below |

### The two deferrals, and why they are correct

Both require changing what **call sites** do — wiring a renderer into a run-end pipeline step, and
performing a board read before deferring so `satisfied` / `would-regress` can be honoured. The task
document places interception explicitly out of scope ("Nothing writes real records yet — tasks
53–56"; "`read-only` verification … nothing populates them until task.57").

Accepting them here would mean this task quietly absorbing the next four. They are recorded in gate 2
as `future` actions with the specific files to change, so the next task in the sequence inherits
them rather than rediscovering them.

### The defect this cycle found in the previous cycle's fix

`alreadyRedacted` tested `/^\$IDENT$/`. That matches `--token $GITHUB_TOKEN` but not
`Authorization: Bearer $JIRA_API_TOKEN`, so the render pass re-masked a header the write pass had
already named — leaving the operator a header they cannot fill in. The guard now matches a variable
reference anywhere in the value, and §16 BUG-5b pins the nested case end to end.

This is the failure mode the fix cycle is most prone to, and it is worth naming: **a fix is new code,
not the closure of a finding.** The cycle-1 test passed honestly; it just tested the shape the author
had in mind rather than the shape the code accepts.

---

## Verification

| Check | Result |
| ----- | ------ |
| `npm test` | **1352 node + 394 shell, 0 failed** |
| `npm run validate:all` | **115 passed, 0 failed** |
| `npm run bundle` | clean, no drift, 0 warnings |
| Command-injection execution tests | 3 paths, no side effects, dry run included |
| Credential invariant, end to end | No secret value in any of the four formats; variable names preserved in `md`/`sh`/`json` |
| Regression tests added | 14, **every one mutation-proven** |
| Existing stage-CLI suites | 160/160 unchanged |
| Gate inertness under `full` | Unset ≡ explicit `full`, byte-identical |

---

## NFR Assessment

### Security — PASS
Both execution paths closed and *proven* closed by tests that run the generated script against
hostile content and assert no side effect — including during the dry run, where the original defect
fired. Redaction holes closed. The end-to-end property that matters is re-verified: no credential
value reaches any output, while the variable names survive, which is what makes a committed script
simultaneously safe and usable.

### Performance — PASS
A Set lookup per rendered record and a regex test per redacted value. Negligible.

### Reliability — PASS
Identity is fixed at the root rather than patched at the renderer. Rendering is idempotent and
side-effect free. The script degrades (skips) rather than aborting without a tty. The roster refuses
a malformed row instead of truncating.

### Maintainability — PASS
Three dead artifacts removed. More importantly, the schema doc now records the contracts the fixes
created — `intent` must be deterministic because it is part of identity; `EXPECTED_KIND_COUNT` moves
with the roster; the high-entropy heuristic is scoped — so the next person does not have to infer
them from the code.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 92/100
**Deployment Recommendation**: APPROVED

Deductions: two MEDIUM findings deferred (correctly, as out-of-scope interception work), and one
defect introduced by a cycle-1 fix — caught here, but a reminder that the fix pass needs the same
adversarial attention as the original review.

**Next Steps**: `/finalise` — verify the Definition of Done and mark the task accepted.
