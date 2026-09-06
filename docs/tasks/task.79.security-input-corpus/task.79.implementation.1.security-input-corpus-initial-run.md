# Implementation Report: Write down the inputs that defeat each sink, once

**Task**: `task.79.security-input-corpus.md`
**Run Number**: 1
**Started**: 2026-09-06 00:00
**Status**: In Progress

---

## Summary

Ship the adversarial security input corpus as a shared resource pair (`security-input-corpus.md` + `.mjs`) with a schema test, and fold the DoD security prompt's hand-rolled axes table into a reference to it.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | low                                                                        |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.79.*` exists in git                                | Branch created at `a7d9bcb6`, pushed to origin | —                    |
| 2. review-task             | ✅ Done    | `task.79.review.{N}.{name}.md` exists (or skip logged)                  | READY TO IMPLEMENT, 8/10. Report: `task.79.review.1.security-input-corpus.md`. 0 critical, 6 important — all applied | `.summaries/step-2-prepass-c.json` |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                       | 1 loop iteration, no stall. 3 files added, 3 modified, 6 regenerated. `npm run ci` green (2529 pass / 0 fail + eval:all exit 0). 3 mutation proofs held | `.summaries/step-3-surface-map.json` |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                            |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.79.qa.{N}.*.md`; `task.79.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.79.dod.{N}.*.md`; task `status: accepted`                         |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                      |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-06

- Questions asked (2, matches develop-task required count):
  - Q1 Feature branch base: **develop** — current branch is `develop`; standard Gitflow base
  - Q2 PR target branch: **develop** — standard Gitflow target
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 resolution done inline (input `79` resolved directly to `docs/tasks/task.79.security-input-corpus/`); no resolver subagent dispatched. GitHub issue #79 is an unrelated closed story — the task file carries no `github_issue`, so `TRACKER_ISSUE` is empty and all tracker signalling is skipped.
- Tracker: github (git remote), no linked issue → 0c-reg skipped entirely.
- Pipeline mode: **standard** — computed from risk_ok=true (`low`), phase_count=4 (NOT < 3), single_module=false (touches `shared/resources/`, `evals/`, and regenerated `skills/finalise/references/`). Lite requires all three.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md (all verified present).
- Branch `feature/task.79.security-input-corpus` created from `develop` at `a7d9bcb6` and pushed; implementation report stashed before branch creation and restored after.
- Tracker signal (0c-reg) skipped: no linked tracker issue.
### Step 2 — review-task — 2026-09-06

- review-task output format auto-answered: **Comprehensive report** — required for pipeline audit trail.
- review-task Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds autonomously.
- Step 0a branch setup auto-skipped — already on `feature/task.79.security-input-corpus`.
- Gate check: status `Ready for Development` **and no review report present** → review ran (per the decision table, a status set without a completed review still runs).
- Pre-pass: 2 Explore agents dispatched in parallel, both returned. Architecture alignment = `aligned`; codebase scan = `not-started`.
- Review report: `docs/tasks/task.79.security-input-corpus/task.79.review.1.security-input-corpus.md`
- Outcome: **READY TO IMPLEMENT**, readiness 8/10 — 0 critical, 6 important, 3 optional.
- Important fixes applied to the task document (13 edits): `bug.3` requalified as `task.67.bug.3` with a full-path link (unqualified it resolved to an unrelated stdout-truncation bug); bug.6 count corrected 12 → 13 fail-open + 2 over-refusals, with the over-refusals routed to seed the required `legitimate` direction; Phase 4's collision with the pre-existing five-axis assertion at `finalise-dod-prompt-contract.test.mjs:126-140` declared; test renamed `security-corpus.test.mjs` → `security-input-corpus.test.mjs` in all four places to preserve the source↔test mapping; §7 Files Regenerated named the transitively-bundled `skills/finalise/references/security-input-corpus.md`; `CHANGELOG.md` assigned to Phase 4 (was listed in §7 but orphaned from every phase); prettier constraint on the new `.mjs` noted.
- **Verified true**, and worth recording because it is the claim most likely to be wrong in this repo: `package.json`'s hand-maintained `test` glob already contains `shared/resources/tests/*.test.mjs`, so Phase 3's "no package.json edit needed" holds.
- review-task Step 9 skipped — status was already `Ready for Development` (no promotion needed).
- review-task Step 10 (tracker comment) skipped silently — no `github_issue` in frontmatter.
- Tracker sync declined: this repo's tasks are roadmap-driven (task.73–task.83 all unlinked); the skill contract forbids creating a remote issue unprompted. Logged as Optional, not a gap.
- No previous run detected (no `feature/task.79.*` branch, no PR, no implementation report) → starting fresh.

---

### Step 3 — develop — 2026-09-06

- Plan file discovery: no `task.79.plan.*.md` — proceeded without one (plan files are optional).
- Always-load files read and used as context: 3 (coding-standards, tech-stack, source-tree).
- Pre-develop surface map: 1 Explore subagent, returning verbatim seed data (BUG3_ROUTES ×14, BUG6_FAIL_OPEN ×13, BUG6_OVER_REFUSED ×2), shared-module and test conventions, and the exact prompt/contract-test edit targets. Summary persisted to `.summaries/step-3-surface-map.json`.
- Develop loop: **1 iteration**, exited on `Ready for Review` with every phase complete. No stall, MAX_ITER not approached.

**Design decision — the prose doc is generated from the module, and a test holds them in step.**
Phase 1 asks for per-sink entries in `security-input-corpus.md` and Phase 2 for the same cases in
`security-input-corpus.mjs`. Writing both by hand would recreate the exact failure the task's own Risk
Assessment names (a second copy that drifts, as `task.74` found). The `.md` case tables were therefore
**generated from the module**, and two tests now assert bidirectional parity — every module case must
appear in the doc with the module's wording, and the doc must carry no row the module does not back.
Mutation proof 1 turned the second of those red as a side-effect, confirming it is live.

**What was built**
- `shared/resources/security-input-corpus.md` (300 lines) — sink definition, method ordering (execute > read the dependency's source > mutate > grep), both-directions rationale, generated per-sink case tables, usage, and an explicit "what this corpus is not".
- `shared/resources/security-input-corpus.mjs` — `SINKS` (5), `DIRECTIONS`, `CASE_FIELDS`, `corpusFor(sink)`, `allCases()`. **73 cases**: url-authority 9+3, sql-orm 7+3, shell-exec 27+4, path 8+3, template-render 6+3 (hostile+legitimate). Frozen at every level; nothing executes on import.
- `shared/resources/tests/security-input-corpus.test.mjs` — 17 tests across shape, both-directions, per-sink floors, unknown-sink-throws, and doc parity.
- `shared/resources/finalise-dod-security-prompt.md` — the axes table at `:110-118` replaced by a reference plus a `corpusFor` import example. **All five axis names kept** (the review-flagged collision with `finalise-dod-prompt-contract.test.mjs:126-140`); the guarded literal "legitimate inputs that must still be accepted" preserved and now naming the corpus's `legitimate` cases.
- `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` — 2 guards added: the prompt references the corpus, and it does not restate its inputs. The non-restatement guard **reads the corpus** rather than a hand-written literal list, so a case added later is covered the moment it lands.
- `CHANGELOG.md` — entry under `[Unreleased] → Added`.

**Mutation proofs (all three from §8 held)** — procedure per `shared/resources/mutation-proving.md`, each with a pre-mutation copy and a `diff` confirming the edit landed before the re-run:
1. Removed every `legitimate` case from `template-render` → `every sink carries at least one legitimate case` went **red** (plus the floors and doc-parity tests). Restored → green.
2. `corpusFor` returns `[]` instead of throwing → `corpusFor throws on an unknown sink rather than returning []` went **red**. Restored → green.
3. Re-added two corpus input literals to the DoD prompt → `probe mode does not restate the corpus's inputs` went **red**, naming `url-authority.host-with-slash, shell-exec.sort-output-long`. Restored → green.

**Gate evidence**
- `npm run ci:fast` exit 0 — 2530 tests, **2529 pass, 0 fail**, 1 skipped.
- The new suites were confirmed to have **run**, not merely be registered (the distinction the task calls out): the gate log carries `probe mode sources its candidates from the shared corpus`, `probe mode does not restate the corpus's inputs`, `every sink carries at least one legitimate case`, `corpusFor throws on an unknown sink rather than returning []`, `the prose peer renders every case in the module`.
- `npm run eval:all` exit 0 — so `npm run ci` (both halves) is green.
- `npm run bundle` run and **re-run**: idempotent. It pulled in three transitive outputs, one more than the review predicted — `security-input-corpus.md`, `security-input-corpus.mjs`, and `mutation-proving.md` (a second hop, via the corpus doc's method-ordering link). §7 of the task was corrected to name all three.
- `prettier --check .` clean.
- Development completion tracker comment skipped — no `TRACKER_ISSUE`.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.79.security-input-corpus
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
