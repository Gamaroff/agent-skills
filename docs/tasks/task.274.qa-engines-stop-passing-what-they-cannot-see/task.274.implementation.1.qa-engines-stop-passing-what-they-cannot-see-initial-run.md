# Implementation Report: QA engines stop passing what they cannot see

**Task**: `task.274.qa-engines-stop-passing-what-they-cannot-see.md`
**Run Number**: 1
**Started**: 2026-11-09 00:00
**Status**: In Progress

---

## Summary

Run the full develop-task pipeline for task 274: five QA engine defects (snippet-runner base scan and syntax blindness, probe record key, shared fixtures, status-history row width), with the Phase 1 owner decisions already recorded in the task document.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.274.*` exists in git                              | Branch created at `598e16fe` |  —                    | 2026-11-09T08:54Z |
| 2. review-task             | ✅ Done | `task.274.review.{N}.{name}.md` exists (or skip logged)                | Review 8/10, READY TO IMPLEMENT; 6 important fixes applied; status promoted to Ready for Development | —                    | 2026-11-09T09:20Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline; Phases 2–5 implemented, mutation-proven, suite green | —                    | 2026-11-09T09:20Z |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #863; no linked issue, so no comment | —                    | 2026-11-09T09:22Z |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.274.qa.{N}.*.md`; `task.274.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted | 3 gates (FAIL 70, FAIL 80, CONCERNS 90); PR review APPROVE |  —                    | 2026-11-09T11:38Z |
| 7. finalise                | ✅ Done | `task.274.dod.{N}.*.md`; task `status: accepted`                       | Accepted; CI readings 1 and 2 SUCCESS (reading 1 after one re-run of an unrelated leak check) | —                    | 2026-11-09T12:36Z |
| 8. commit-changes          | ✅ Done | All artifacts committed and pushed                                     | Report committed with the final commit | —                    | 2026-11-09T12:37Z |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-09

- Feature branch base: develop — source: recommended (`--defaults`)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector (risk_level absent, 5 phases, so not lite)
- Skips: none
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 ran inline (no Explore subagents dispatched): inputs derived by the orchestrator from the document. No `github_issue` / `jira_key` in frontmatter, so all tracker operations are skipped.
- Always-load files resolved: 3 files from skills-config.yaml `devLoadAlwaysFiles`.
- Phase 1 owner decisions (recorded in the task doc, commit 598e16fe): refuse variable arguments to deny-listed commands (no value tracking); shared fixtures via `--fixture-copy`.

### Step 3 — develop (inline) — 2026-11-09

- Plan file found: task.274.plan.qa-engines-stop-passing-what-they-cannot-see.md — included as implementation context for /develop.
- Pre-develop surface map: shared/resources/{qa-execute-snippets.mjs, security-probe.mjs, status-history.js}, their four test files, review-security.test.js (two tests encoded the old name-collapsing key), probe-boundary-rule.md, qa-runnable-prose-detection.md, CHANGELOG, 17 bundled copies.
- Step 3 inline — /develop not invoked: the plan was already phase-by-phase with tests-first order and owner decisions recorded; the work was done in this session's context.
- Shape 4 (variable argument to a deny-listed command) applies to a block's own text only: skipped in helper mode and for `forwardedHazard` re-classification, because shipped helpers use `find "${dir}"` / `"$@"` and the helper rules already judge forwarded arguments.
- Syntax check is `<shell> -n -c <code>` (parses, runs nothing) rather than a temp file in `mktemp -d`: no file, nothing to remove.
- `--fixture-copy` lives in security-probe.mjs, not security-probe-plan.mjs: the plan entry's argv already reaches the engine; proven by a plan-runner test against the real engine. The record gains `fixture_copy`.
- Unnamed JS controls keep their key and entry-file name; named ones key on the name. Two review-security tests asserting the old collapse were updated.
- Retained `$(…)` inside double quotes has its own quotes collapsed (found by the real-docs diff on task.45's bug: `grep 'a\|b'` split the command).
- Real-docs diff (old vs new classifier, 3,621 blocks in 4,285 tracked docs): 1 newly refused (`sed '2d' "$f"` in historical task.90 doc), 0 newly runnable. Left as written.
- Verification: `CI=true npm test` 8,124 pass / 2 fail before the review-security fix; those two fixed and re-run green; `bundle --check` 0 problems. Perf measurement is a QA criterion.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1

- Gate FAIL (70/100): T274-QA-1 (high, `--fixture-copy` follows a symlinked directory), T274-QA-2 (high, dash-prefixed expansion still runnable), T274-QA-3 (medium, syntax check flags templates). QA reproduced all three by execution, each with a control.
- Fix 1: realpath containment in `security-probe.mjs`. Fix 2: `couldBeFlag` plus delimiter-aware segment scan. Fix 3: template skip in `isSyntaxCheckable`, wider angle-slot shape, `--` before the code string; `response-envelope-enforcer/SKILL.md` pseudo-code fence marked `text`.
- Mutation proofs (all `covered`, committed tests went red, file restored byte-identical each time): reverted `couldBeFlag` → three base-scan tests; dropped the slot test, dropped `--` → the syntax-controls test; disabled the realpath check → the fixture-copy decline test.
- Population probe (rule restated): `qa-runnable-prose-detection.md` updated; the other hits of the search phrase restate nothing about this rule.
- Not done in this cycle, owed to QA cycle 2: the timing criterion (the first pair was contaminated by concurrent probes and was discarded; re-measure clean on the final commit), `wc -c` of a task.205-shape cases file.

### QA Cycle 2

- Gate FAIL (80/100), one finding: T274-QA-4 (high, an ANSI-C `$'-delete'` and a backslash-newline split flag classify runnable and delete files when run). Found by the refute pass, reproduced by QA with controls. Bugs 1-3 verified fixed and closed. Timing criterion met (median +4.7%, load 7-9, so noisy); task.205-shape cases file 8,813 bytes.
- Fix (Step 2.6, repeat subject → narrow the contract): continuations folded (odd backslash runs only) right after `stripProse`; `hasDecodedQuote` refuses an unquoted `$'…'` / `$"…"` argument to a deny-listed command. Docs: `qa-runnable-prose-detection.md`, CHANGELOG.
- Mutation proofs (all `covered`): dropping the fold → two tests red; dropping the `hasDecodedQuote` call → three red; widening the opener to any `$` → the controls test red. Real-docs diff: 3,435 shell blocks, 0 newly refused. Suite 8,135 pass, 0 fail. The findings-ingester subagent did not run (one finding, read inline).
- **Action**: Running qa-fix (cycle 2 → cycle 3)

### QA Cycle 3

- Gate CONCERNS (90/100), `top_issues[]` empty. Bug 4 verified fixed and closed (all four bugs closed). Unscoped safety re-probe (gate 2 failed on security): the reviewer found five other deny-list gaps (function shadowing an allow-listed name, the `<>` redirection, `find -fprint0`, sed `e` command and `s///e` flag, `sort --compress-program`); QA reproduced four by execution. Provenance: identical on develop, not a shape the task names, 0 hits in the 3,435 tracked shell blocks, so `pre-existing` and routed to the gate's `recommendations.future` with a named follow-up.
- Probe record: 39 cases, 0 reproduced, 0 escaped. Mutation proofs (all `covered`) repeated at `1d60b861`. `TMPDIR=/tmp` run of the two engine test files: 509 pass.
- Judgement call for the owner: the five gaps are not fixed on this branch. Fixing them is another fix cycle (2 gates remain); the structural answer is an allow-list.
- **Action**: Proceeding to 5c
- **PR Review**: APPROVE — `task.274.pr-review.1.qa-engines-stop-passing-what-they-cannot-see.md` (conformance lens only; 2 low findings: unticked criteria and absent `pr_number`, both for finalise)

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: {populated after Step 1}
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
