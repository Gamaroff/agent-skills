# Implementation Report: advance-pipeline-lock.sh reports success for an advance that did not happen

**Task**: `task.90.pipeline-lock-silent-success.md`
**Run Number**: 1
**Started**: 2026-09-04 12:42
**Status**: In Progress

> **This file was rebuilt on 2026-09-04 after QA finding T90-QA1-001.** The original was corrupted to
> 480,884 lines / 28 MB and committed in `293da69`. Cause and prevention are recorded in the Issues
> Log below rather than being quietly dropped.

---

## Summary

Fix the silent-success hole in `advance-pipeline-lock.sh` — a lock carrying no state was reported as
advanced — harden the `$LOCK.tmp` write against symlink follow, extend the test suite under bash and
zsh, add a roadmap legend `touches:` tag covering the script, and refresh all 9 bundled copies.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature branch base | develop                                                                                                                                      |
| PR target           | develop                                                                                                                                      |
| qa-planning gate    | skipped (auto)                                                                                                                               |
| Task risk level     | medium                                                                                                                                       |
| Pipeline mode       | standard                                                                                                                                     |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (no issue linked)                                                                                                                        |

---

## Pipeline Progress

| Step                       | Status        | Required Artifacts                                     | Notes                                                                                                                                                                                        |
| -------------------------- | ------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. create-branch           | ✅ Done       | Branch `feature/task.90.*` exists in git               | `feature/task.90.pipeline-lock-silent-success` cut from `develop` at `8a42819`. Tracker signal skipped — no linked issue.                                                                     |
| 2. review-task             | ✅ Done       | `task.90.review.1.*.md`                                | READY TO IMPLEMENT, 8.6/10 (5.2/10 as filed). 2 Critical + 5 Important + 3 Optional, all applied. `draft` → `ready-for-development`.                                                          |
| 3. develop                 | ✅ Done       | Task status == `Ready for Review`                      | 5/5 phases in one iteration. 22 tests green under bash **and** zsh. Both fixes mutation-proved. 9 bundled copies refreshed. `npm run ci` exit 0.                                              |
| 4. create-pr               | ✅ Done       | PR URL; issue comment posted                           | [PR #313](https://github.com/Gamaroff/agent-skills/pull/313) → `develop`. Commits `a1e836a` (fix) + `293da69` (docs). Issue comment skipped — no tracker issue. No out-of-scope leak.         |
| 5–6. qa-task / qa-fix loop | ✅ Done       | `task.90.qa.N.*.md`; `task.90.gate.N.*.yml`; Step 5c   | 2 of 5 cycles. Cycle 1 **FAIL** 60/100 (1 HIGH, 2 MEDIUM, 1 LOW) → qa-fix → cycle 2 **PASS** 100/100, all verified by execution. Step 5c `/review-pr` CONCERNS, both findings closed in `1cb04a0`. |
| 7. finalise                | ✅ Done       | `task.90.dod.N.*.md`; task `status: accepted`          | `task.90.dod.1.*.md`. 11/11 criteria executed. CI SUCCESS on the final head (sampled PENDING first and waited). 24 security probes, 23 held. |
| 8. commit-changes          | ✅ Done       | All artifacts committed and pushed                     | Terminal commit; lock removed.                                                                                                                                                               |

---

## Decisions Log

### Pipeline Startup — 2026-09-04

- **Invoked by `/develop-next`** (autonomous run) — item **T90** selected from the roadmap frontier
  (PHASE 5, line 94, no deps, `source: roadmap`).
- Feature branch base: `develop` — auto-answered (recommended option, AUTONOMOUS RUN directive).
- PR target branch: `develop` — auto-answered (recommended option, AUTONOMOUS RUN directive).
- qa-planning gate: skipped (auto — no prompt).
- Phase 0a: file path supplied directly by develop-next; resolver subagent not dispatched. Tracker
  poller not dispatched — no `github_issue` / `jira_key`. Lite-mode inputs read inline.
- Pipeline mode: **standard** — `risk_level: medium` fails the `risk_ok ∈ {low, absent}` membership
  test, so the AND is false regardless of the other two inputs.
- Tracker: `github` (`JIRA_URL` unset); `TRACKER_ISSUE` empty — every tracker signal and board move
  skipped for this run.
- Task status on entry: `draft` — proceeded per the develop-task status table; Step 2 promoted it.
- Phase 0b: no prior run. Starting fresh.

### Step 2 — review-task — 2026-09-04

- Output format auto-answered: **Comprehensive report**.
- Step 8.5 auto-answered: **Yes, apply all critical + important fixes**.
- Step 9 auto-answered: **Yes, fixes complete** — `draft` → `ready-for-development`.
- Step 0a branch setup auto-skipped — already on the task branch.
- Pre-pass Explore subagents not dispatched (session directive forbids subagent dispatch unless the
  user asks); architecture-alignment and codebase scans done inline.
- Sign-off check skipped — `sign-off.enabled` absent from `skills-config.yaml`.
- Tracker-card preflight skipped — `TRACKER=github`, no linked issue.
- Review report: `task.90.review.1.pipeline-lock-silent-success.md`.

### Step 3 — develop — 2026-09-04

- Pre-develop surface map: **6 files** (Explore subagent not dispatched — session directive; map
  built inline, every file read in full during Step 2): the script, its test file,
  `tracker-access.test.sh` (for the `command -v zsh` pattern), the roadmap, `package.json:26`, and
  `.github/workflows/test.yml` (ubuntu-latest carries no zsh → the skip guard is mandatory).
- Plan file: none (optional). Fast gate: `npm run ci:fast` (default).
- Alignment: **no implementation** of either fix existed — greenfield change to an existing script.
  Both defects reproduced byte-for-byte before any edit.
- `/develop` completed in **one iteration** — no stall, no test-failure triage.
- **Operator error, corrected**: while smoke-testing a bundled copy, `advance-pipeline-lock.sh 5` was
  run without `PIPELINE_LOCK` set, advancing the *real* pipeline lock 3 → 5. Detected immediately and
  restored to 3 with `jq`. No step was skipped. Recorded because the lock's integrity is this task's
  own subject.

### Step 5b — qa-fix cycle 1 — 2026-09-04

- Fix order was **not** strict severity order: the code fix (T90-QA1-003) went first so the two
  document corrections could describe the final state rather than be rewritten twice.
- T90-QA1-003 fixed rather than waived. It was out of the task's stated §4 scope, but it is the same
  defect class, one predicate away, and leaving it would have made the corrected §2 incoherent.
- **The guard was restructured mid-cycle on mutation-proof evidence** — see Issues Log.

---

## Issues Log

### Step 2 — review-task findings (all resolved by the auto-fix pass)

- **[Critical]** No `## 6. Implementation Plan` and no `## 8. Testing Strategy` — the task carried 5
  of the 11 mandatory sections. `/develop` had no phases to execute. Both authored.
- **[Important]** Three factual errors about the tree, each of which would have misdirected the work:
  the failing guard is at `:138-142`, not `:94-104`; there are **9** bundled copies, not 10 (10 is the
  total including the source, so the criterion as filed was unsatisfiable); and the test file runs
  under **bash only** — the `command -v zsh` pattern lives in `tracker-access.test.sh`, so zsh
  coverage had to be *added*, with the skip guard, because ubuntu-latest has no zsh.
- **[Important]** The fix was silent on which invocation paths the guard covers. Guarding `--complete`
  would make a corrupt lock permanently unclearable. Resolved (exempt) and pinned by a test.
- **[Important]** No Files Summary / Risk Assessment / Rollback Plan. Authored.
- **[Important, not acted on]** No `github_issue`. Left unlinked: 0 of the last 4 tasks carry one, and
  the autonomous path makes no remote changes.
- **[Optional]** `noclobber` does not close the symlink hole for a dangling target; `mktemp` does.
  `mktemp`'s `0600` mode change documented. `estimated_effort_hours` 3 → 5.

### Step 3 — a false finding about the bundler, raised and retracted

**Retained deliberately.** A first pass at the "verify **by content**" criterion compared `sha256` of
each bundled copy against the source, found all 9 different, and concluded `npm run bundle` was
leaving them stale — that it had reproduced `task.86`. **That was wrong.**

A bundled copy is the source **plus one line**: an `AUTO-GENERATED — DO NOT EDIT` banner at position 2.
A raw checksum can therefore never match, however fresh the copy. All 9 sharing one hash that differs
from the source is exactly what a *correctly* bundled set looks like.

Compounding it: `npm run bundle` prints one line per skill across ~130 skills, and only the last
fifteen were read — none of which carry this file. The nine `✅ … 1 bundled` lines were in the unread
part. "Reported `in sync` for every skill" was an inference from an unrepresentative sample, stated as
an observation.

**Consequence**: acting on the false finding, an interim `cp` of the raw source over the 9 copies
**stripped the AUTO-GENERATED banner from all of them**. The pre-commit hook re-ran `npm run bundle`
and restored it before `a1e836a` landed, so nothing shipped.

Verified afterwards: a probe marker appended to the source propagates to the bundled copy in a single
`npm run bundle`. `task.86` remains open on its own merits; **this run produced no evidence either
way**.

Correct check, now used: `diff <(sed '2d' "$copy") "$source"` — 9 checked, 0 mismatched.

### Step 5 — QA cycle 1 findings (gate FAIL, 60/100)

- **[HIGH] T90-QA1-001** — this file was corrupted to 480,884 lines / 27,992,499 bytes, one paragraph
  repeated 12,326 times, and committed in `293da69` and pushed to PR #313.

  **Cause**: a correction script computed `old = s[start:end]` where `end` (a Decisions Log heading)
  occurs *earlier* in the file than `start` (an Issues Log heading). Python returns `''` for a reversed
  slice, and `str.replace('', X)` inserts `X` between **every character** — len+1 copies.

  ```python
  "hello"[3:1]                  # ''
  "hello".replace("", "<X>")    # '<X>h<X>e<X>l<X>l<X>o<X>'
  ```

  **Why nothing caught it**: the file is well-formed markdown, so `prettier --check` passes, and
  `npm run ci` had run before the corruption existed. No gate in this repo asserts a plausible size for
  a committed artifact.

  **Fixed**: rebuilt from real content; `wc -l` verified before committing. Prevention for future
  slice-based edits: assert `end > start` rather than trusting document ordering.

- **[MEDIUM] T90-QA1-002** — the inherited "18 values all preserve the lock and exit non-zero / single
  hole in an otherwise well-behaved validator" claim is false: 6 of the 8 named inputs advance and
  exit 0. Shipped in the task §2, `CHANGELOG.md` and the PR body. **Fixed in all three.**

- **[MEDIUM] T90-QA1-003** — a whole-file `null` lock fabricated `{"current_step":5}` and reported
  success — the same defect class, pre-existing and out of stated scope. **Fixed**, scope widened, test
  scenario 12 added.

- **[LOW]** A NUL-byte-only lock makes bash print `warning: command substitution: ignored null byte in
  input` to stderr before the guard correctly fires. Outcome is right; noise only. Not fixed.

### Step 5b — the redundant-guard finding, from mutation proof

Fixing T90-QA1-003 by *appending* a `jq -e 'type == "object"'` check after the existing emptiness
check produced a suite that was green — and a mutation proof that had quietly stopped holding.
Neutering the **emptiness** branch left all 30 tests passing, because the type predicate already
rejects empty and whitespace-only input (`jq -e` exits 4 on empty).

The emptiness branch had become **control flow no test could falsify** — precisely the shape
`mutation-proving.md` warns about, introduced by the fix for a finding rather than by the original
work.

**Resolved by restructuring rather than by keeping both**: one decision predicate
(`jq -e 'type == "object"'`), with the emptiness test demoted to choosing the error message. Removing
that single predicate now turns 6 scenarios red (empty, whitespace, `null` × 2 interpreters).

**Recorded honestly**: scenario 12's `[]`, `"str"` and `42` shapes are asserted but **not**
mutation-proved against the predicate — they already failed closed through the write path. They
document intent; they do not bind it.

---

## QA Iteration History

| Cycle | Gate | Score | Findings | Outcome |
| ----- | ---- | ----- | -------- | ------- |
| 1     | FAIL | 60/100 | 1 HIGH, 2 MEDIUM, 1 LOW | All 10 success criteria met and both mutation proofs independently re-derived by QA; failed on a 28 MB corrupted artifact in the PR and a false claim in `CHANGELOG.md`. qa-fix cycle 1 applied all three. |
| 2     | **PASS** | **100/100** | 0 HIGH, 0 MEDIUM, 3 LOW | Unscoped refute pass over the whole branch diff. All three cycle-1 findings verified fixed **by execution**. Cycle 1's own honest-limit claim about scenario 12 checked and confirmed accurate. |
| 5c    | CONCERNS | — | 0 code, 2 conformance | `/review-pr`: a self-contradicting criterion (the retracted task-86 claim — found in **two** places, the review named one) and a stale `npm run ci` tick. Both closed in `1cb04a0`. |

---

## Completion

**Finished**: 2026-09-04
**Final Status**: Completed — ACCEPTED
**Branch**: `feature/task.90.pipeline-lock-silent-success`
**PR**: [#313](https://github.com/Gamaroff/agent-skills/pull/313)
**QA Iterations**: 2 of a 5-cycle budget (plus one Step 5c review)
**DoD Summary**: [`task.90.dod.1.pipeline-lock-silent-success.md`](./task.90.dod.1.pipeline-lock-silent-success.md) — ACCEPTED
**Tracker debt**: none — no tracker issue linked, nothing deferred
