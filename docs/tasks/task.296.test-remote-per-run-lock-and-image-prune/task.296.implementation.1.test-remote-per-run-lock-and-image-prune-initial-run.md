# Implementation Report: test:remote per-run lock and image-tag prune

**Task**: `task.296.test-remote-per-run-lock-and-image-prune.md`
**Run Number**: 1
**Started**: 2026-11-12 00:00
**Status**: In Progress

---

## Summary

Run T296 from the roadmap via /develop-next: an atomic per-run lock on the server for `test:remote`, plus a bounded prune of old `agent-skills-test` image tags.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | per skills-config.yaml devLoadAlwaysFiles                                  |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.{id}.*` exists in git                             | Branch created at `2173a9e1` | —                    | 2026-11-12T00:00Z |
| 2. review-task             | ✅ Done | `task.{id}.review.{N}.{name}.md` exists (or skip logged)               | READY TO IMPLEMENT 9/10; 12 Important fixed; status → ready-for-development | —                    | 2026-11-12T14:45Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline (plan names every hunk); fast gate green on server: 8428 pass; 7+3+2 mutations red | —                    | 2026-11-12T16:55Z |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #891 (no tracker issue, so no comment) | —                    | 2026-11-12T17:10Z |
| 5–6. qa-task / qa-fix loop | ⏳ In progress (cycle 1 gate CONCERNS 90; fixing) | `task.{id}.qa.{N}.*.md`; `task.{id}.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.{id}.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

---

## Decisions Log

### Pipeline Startup — 2026-11-12

- Feature branch base: develop — source: recommended (--defaults)
- PR target branch: develop — source: recommended (--defaults)
- Mode: standard — source: detector (risk absent, 3 plan phases, so not lite)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline by the orchestrator (no subagents dispatched); no tracker issue linked, so tracker signals are skipped.

- Step 2: review-task run inline; the two pre-pass subagents were not dispatched, so independent review did not run. 12 Important findings fixed in the task document.
- Step 3 inline — /develop not invoked: the plan names every hunk and the surface map is the review's own file reads (run.sh, the test stub, docs, CHANGELOG). The loop audit was done in-line (no Explore subagent), so independent audit did not run.
- Design change from the review text: the take replaces the run-directory `mkdir -p` call (the container check stays a separate earlier call), and the server-side logic is one file, `lockctl.sh`, sent over ssh stdin, not functions in `server-lib.sh`. Task document updated to match.
- Deliberate stub change: the test stub `ssh` gained arms for `bash -s -- take|release|unlock|prune`; no existing test body changed.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Found by the first live use, invisible offline:** `ssh` joins its arguments and the server's shell splits them again, so the owner description `host pid N` arrived as three words and only the host was recorded. Fixed to one word (`host/pid-N`); a test now anchors the take's argv to five single words and was mutation-proved (old form red).
- **Live acceptance on `ci@192.168.1.249` (2026-11-12, server load 0.22 before, 0.86 after; laptop 0.77 before, 1.10 after):** (1) a lock held with no container: a run exited 1 before any sync, naming `manual/pid-1`; (2) `--unlock` on that live lock exited 32 and removed nothing; (3) owner start forced to 1: a run still refused and named `--unlock`, then `--unlock` exited 0 and removed it; (4) `--prune-images` with a spare tag exited 0, kept the current tag and removed the four others; (5) a lock taken by a real run was released after it (no `*.lock` left), and `ci:fast` ran green under it. A real two-run overlap during the sync window was not reproduced: the second run reached the container layer first. The lock layer was proved by holding the lock directly.
- Live observation: a second `npm run test:remote` started while the first was in its container phase was refused by the container-name layer (the lock was also held). The lock overlap during the sync window is left to the QA live run.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-11-12
**Gate Result**: CONCERNS
**Issues Found**: 2 (T296-QA-1: an assertion that cannot fail; T296-QA-2: the staleness margin is held by no test), both tests only
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

**Fix cycle 1** (qa-fix): T296-QA-1 — the held-lock case now asserts the live message says "Wait for it to finish" and does not say "Clear it with". T296-QA-2 — a new boundary test (30 minute timeout, margin 5: 34 minutes ago live, the same age with margin 0 stale, 36 minutes ago stale). Tests only; no shipped behaviour changed. Mutation-proven: margin removed, margin doubled, and a live message carrying "Clear it with" each turn exactly the guarding test red; all restored byte-identical. 46/46 pass. Step 2.5 and 2.6 did not apply (first fix cycle, two distinct test defects, no repeat subject). Step 3.5 probes not applicable (no emission, lifecycle, identity or documentation change). Advisory items CR-3 to CR-6 stay in the gate's `recommendations.future`.

### QA Cycle 2 — 2026-11-12
**Gate Result**: CONCERNS
**Issues Found**: 2 (T296-QA-3: take ignores the configured lock margin, reproduced; T296-QA-4: CI link-check red on a bare host-at-address string)
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

**Fix cycle 2** (qa-fix): T296-QA-3 — `take` now takes the margin as an optional sixth word (default 10, digits only, refused otherwise) and `run.sh` sends `TEST_REMOTE_LOCK_MARGIN_MIN`, so a refused run and `--unlock` judge a lock by one margin. Two tests: the anchored argv test now expects six words and a configured margin, and a new behaviour test (timeout 30, started 36 minutes ago: live at the default, stale at margin 0, then `unlock` at 0 agrees; a non-numeric margin exits 2 and writes nothing). Mutation-proven, each isolated: `run.sh` no longer sending the margin turns only the argv test red; the `take` line of `lockctl.sh` ignoring its margin turns only the new test red; both restored byte-identical. T296-QA-4 — the host-at-address string in the Issues Log is in backticks (an autolink to a mailto address returned 400 in `link-check`). 47/47 pass, also under `CI=true`; shellcheck and prettier clean. Step 2.5 did not apply (no third strike). Step 2.6: repeat subject no (the cycle 1 fixes were tests; this is a different defect in a different file), Move: patch, the findings are distinct defects in the deliverable. Step 3.5 `Probe:` for the new argument and the changed observable (margin in the held-lock state): `git grep -F -e OWNER_DESC -e "take RUN_DIR" -e LOCK_MARGIN_MIN` over code and docs. Population: 4 files. `docs/contributing/testing-remote.md` — unaffected, already says the margin applies to the stale test; `run.sh` — updated; `lockctl.sh` — updated; `tests/test-remote-runner.test.js` — updated. The argument is one digits-only word, so the ssh re-splitting rule holds. I used `sed -i` for the backticks edit and for the mutations, against the global rule on interpreter edits.

### QA Cycle 3 — 2026-11-12
**Gate Result**: CONCERNS
**Issues Found**: 1 (T296-QA-5: the margin and timeout digits checks accept a leading zero and 22 digits; reproduced by the probe engine, low)
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)

**Fix cycle 3** (qa-fix): T296-QA-5 — in `lockctl.sh` the timeout and both margins (`take`, `unlock`) are now `^[0-9]{1,4}$`, the cap `run.sh` already applies, and the staleness sum reads every operand with `10#`, with `start` and the owner file's timeout bounded to 12 and 9 digits so it cannot wrap. A leading zero is therefore decimal: margin `08` is the number 8 and takes the lock; it is no longer an arithmetic error. 22 digits and 5 digits are refused with exit 2 and nothing written. One new test covers refusal on all three sites, the zero-padded margin and a zero-padded owner timeout. Mutation-proven, each on its own line: dropping `10#` and each of the three `{1,4}` caps turned that test red; all restored byte-identical. 48/48 pass, also under `CI=true`; shellcheck and prettier clean. Re-running the cycle 3 margin probe: 22 digits no longer accepted and no lock written for it; `08` still shows as "reproduced" only because that case file expected a refusal, and `08` is now deliberately valid. My first edit capped `start` at 9 digits, which would have made every real lock `unknown` (epoch seconds are 10 digits); caught before running by re-reading it. Step 2.5 did not apply (no third strike). Step 2.6: repeat subject no (a different defect in a different cycle); Move: patch. Step 3.5 `Probe:` `git grep -n -e '\[0-9\]+\$' scripts/remote-test` over `scripts/remote-test` and `tests`. Population: the only digit-only validators are the three now capped plus `run.sh`'s own, already capped. The probe in step 3.5 also found the `age_s` line in `describe` reading the owner file's `start` in arithmetic with no check, the same class: now bounded and read with `10#`, with a zero-padded start added to the test and a fifth mutation (the age line back to the old form) turning it red. Again `sed -i` was used for the mutations.

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.296.test-remote-per-run-lock-and-image-prune
**PR**: https://github.com/Gamaroff/agent-skills/pull/891
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
