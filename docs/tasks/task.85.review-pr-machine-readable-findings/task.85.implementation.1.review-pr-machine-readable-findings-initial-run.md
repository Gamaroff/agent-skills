# Implementation Report: Give `/review-pr` a machine-readable findings block

**Task**: `task.85.review-pr-machine-readable-findings.md`
**Run Number**: 1
**Started**: 2026-09-09
**Status**: In Progress

---

## Summary

Emit a structured `findings:` YAML block from `/review-pr` Step 7 alongside the existing rendered
text, and make the qa-fix ingester prefer that block while still parsing legacy reports.

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
| 1. create-branch           | ✅ Done    | Branch `feature/task.85.*` exists in git                               | `feature/task.85.review-pr-machine-readable-findings` created from `develop` at `08293212`, pushed, tracking origin | —                    |
| 2. review-task             | ✅ Done    | `task.85.review.{N}.{name}.md` exists (or skip logged)                 | Ran (status `Draft`, no prior report). 5/10 NEEDS REVISION as found → 3 Critical + 4 Important fixed in place → 9/10 READY TO IMPLEMENT. Promoted `draft → ready-for-development`. Report: `task.85.review.1.review-pr-machine-readable-findings.md` | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Phases 1-3 landed in 1 iteration (no stall, no re-invoke). 13 mutations proven. `npm run ci:fast` green: prettier clean + 2965 tests, 0 fail | —                    |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #363: https://github.com/Gamaroff/agent-skills/pull/363. Issue comment skipped — no linked tracker issue. Leak check: OK | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.85.qa.{N}.*.md`; `task.85.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.85.dod.{N}.*.md`; task `status: accepted`                        |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-09-09

- **Invoked by `/develop-next`** (autonomous run). Item T85 selected from the **task-registry**
  fallback frontier — no roadmap phase held an actionable row. Dependency `task.77` is `accepted`.
- Feature branch base: **develop** — auto-answered per the develop-next AUTONOMOUS RUN directive
  (Q1 recommended option; current branch is `develop`).
- PR target branch: **develop** — auto-answered per the same directive (Q2 recommended option).
- qa-planning gate: skipped (auto — no prompt).
- Step 1 branch: `feature/task.85.review-pr-machine-readable-findings`, base `develop`, created at `08293212` and pushed with upstream tracking. Implementation report stashed before branch creation and restored after (`git stash pop` clean).
- **Signal Work Started skipped** — `TRACKER_ISSUE` is empty (the task has no `github_issue:`), so there is no card to comment on or move. Step 2 (`/review-task`) is the step that creates it.
- Phase 0b: no previous run detected (no `feature/task.85.*` branch, no open PR, no prior
  implementation report) → started fresh. The resume prompt therefore never fired.
- Pipeline mode: **standard**. `risk_level: low` ✅ and the task defines fewer than 3 implementation
  phases ✅, but it is **not single-module** — it changes `skills/review-pr/`, the shared resource
  `shared/resources/qa-findings-ingester-prompt.md` (which fans out into every bundled skill), and
  `evals/shared/tests/`. All three lite-mode conditions must hold; one fails, so standard.
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles` — all three
  verified present on disk.
- Tracker: `TRACKER=github`, but the task frontmatter carries no `github_issue:` → `TRACKER_ISSUE`
  is empty and tracker references are skipped until Step 2 (`/review-task`) creates the card.
- **review-task Step 0 auto-answered**: "Comprehensive report" — required for the pipeline audit trail.
- **review-task Step 0a auto-skipped**: already on `feature/task.85.*`, so no branch was created.
- **review-task Step 8.5 auto-answered**: "Yes, apply all critical + important fixes" — pipeline
  proceeds autonomously and needs the task fully corrected before Step 3 runs `/develop`.
- **review-task Step 9 auto-answered**: "Yes, fixes complete" — outcome was READY TO IMPLEMENT
  post-fix, so `draft → ready-for-development` was promoted in both frontmatter and body, with a
  transition row appended to the Change Log. The sign-off gate does not apply (`sign-off.enabled`
  absent from `skills-config.yaml`).
- **review-task Step 2 check 5 — tracker sync declined.** The task has no `github_issue:`, which is
  an Important gap. It was **not** created: the skill's rule is that a remote issue is never created
  unprompted, and an autonomous run cannot prompt. The recent corpus agrees (tasks 77, 82, 103 carry
  no tracker issue). Run `/sync-github-task` later if a card is wanted.
- **review-task Step 10 skipped silently** — no `github_issue`, so there is no issue to comment on.
- **review-task Step 8.6 skipped** — `TRACKER=github`, not Jira.
- Phase 0 was run **inline rather than via the 0a-parallel subagent fan-out** — this session
  operates under a standing user instruction not to dispatch the Agent tool unless asked. The three
  agents' outputs (document resolution, tracker poll, lite-mode + always-load) were each derived
  directly and are recorded above.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Phase 0c names a "production lite-mode CLI" that does not exist in this tree.** `0c` says
  `PIPELINE_MODE` is resolved by "the production lite-mode CLI" run by 0a-parallel Agent 3, and `0c-load`
  reads `LITEMODE_RESULT.always_load_files` from the same agent. No such script exists —
  `find . -name "*lite*"` returns only the `develop-pipeline-lite-mode.md` doc and its bundled copies.
  Both values were therefore derived directly from the documented rule and from `skills-config.yaml`.
  Logged as observation #25 rather than fixed here: out of scope for task 85.

- **`review-task` Phase 1.5 pre-pass agents were not dispatched.** Same standing instruction as
  Phase 0. Both axes were covered inline and the substitution is recorded in the review report's
  Review Metadata, so the report does not claim a pre-pass that did not run: architecture alignment
  by reading the four contract files directly, already-implemented status by confirming no
  `Machine-Readable` heading and no `findings:` block exists in `skills/review-pr/SKILL.md` or in any
  `.pr-review.*.md` on disk.

---

### Step 3 — Develop — 2026-09-09

- **Pre-develop surface map (derived inline, not via Explore — standing no-Agent-tool instruction).**
  5 files, all already read during the Step 2 review:
  - `skills/review-pr/SKILL.md` — Step 6 renderer + Step 7 report template (the emitter)
  - `shared/resources/qa-findings-ingester-prompt.md` — the consumer; bundles to `skills/qa-fix/references/`
  - `evals/shared/tests/pr-review-loop-parity.test.mjs` — the contract pin (already in the `npm test` glob)
  - `shared/resources/code-review-prompt.md` / `pr-conformance-prompt.md` — the two subagent schemas (read-only; out of scope)
  - `docs/tasks/task.66.review-pr/task.66.pr-review.1.review-pr.md` — the real legacy fixture
- **Plan file**: none (`task.85.plan.*.md` does not exist). Proceeded on §6 of the task document.
- **Draft/Planned gate**: not reached — Step 2 had already promoted the task to `ready-for-development`.
- **High-risk gate**: not reached — `risk_level: low`.
- **Alignment mismatch gate**: not reached — no pre-existing implementation (verified: no
  `Machine-Readable` heading and no `findings:` block anywhere in `skills/review-pr/SKILL.md` or any
  `.pr-review.*.md` on disk).
- **Fence-nesting defect found and fixed during Phase 1.** The new ```` ```yaml ```` block sits inside
  Step 7's report template, which was itself a 3-backtick ```` ```markdown ```` fence — so the inner
  block's closing fence terminated the *outer* one, pushing `## Recommended Actions` outside the
  template. Widened the template fence to 4 backticks. Not in the plan; found by checking the fence
  count rather than by a test, and worth stating because no assertion in this repo would have caught it.
- **Mutation proof — 12 mutations, all held.** Each new assertion was shown to go red when the
  behaviour it names was reverted, then restored:

  | # | Mutation | Result |
  | --- | --- | --- |
  | M1 | `## Machine-Readable Findings` heading renamed | ✅ red |
  | M2 | fence untagged (```` ``` ```` not ```` ```yaml ````) | ✅ red |
  | M3 | `ref:` dropped from both block entries | ✅ red |
  | M4 | `id: CR-1` entry removed (one lens only) | ✅ red |
  | M5 | the `ref` ← `file_line` normalisation sentence removed | ✅ red |
  | M6 | block emits `file_line:` for the `CR-*` entry | ✅ red |
  | M7 | the `findings: []` empty-emit rule removed | ✅ red |
  | M8 | "Prefer the structured block" removed from the ingester | ✅ red |
  | M9 | the `Fallback — the rendered three-line shape` heading removed | ✅ red |
  | M10 | the old whole-file `severity:` claim restored | ✅ red |
  | M11 | the empty-vs-absent note removed from the ingester | ✅ red |
  | M12 | a block back-filled into the legacy fixture | ✅ red |

  > **M5 first reported STILL GREEN, and that reading was wrong — the mutation had not applied.** The
  > sentence appears twice in `SKILL.md` and wraps at a different word in each, so the first `perl`
  > pattern matched neither, then a second matched only one. Re-run with fully flexible inter-word
  > whitespace it removed both and the assertion went red. Recorded because "the test stayed green"
  > and "the mutation did not happen" are indistinguishable from the output alone, and only the first
  > is a finding. Every mutation above is reported with a before/after count for that reason.

- `npm run bundle` run after Phase 2. One consumer regenerated:
  `skills/qa-fix/references/qa-findings-ingester-prompt.md`.
- **Scope addition, declared:** `skills/review-pr/tests/review-pr.test.js` was edited although the
  task's Files Summary did not list it. Its test `"the report template is given literally"`
  enumerates the template's section headings, so leaving the new one out would have left that test
  asserting a template that no longer exists — a test made quietly incomplete by this change. One
  line added, mutation-proven (rename the heading → red). Files Summary updated to record it.
- **Fast gate**: `npm run ci:fast` → exit 0. `prettier --check .` "All matched files use Prettier
  code style!"; `node --test` 2965 tests, 2964 pass, 0 fail, 1 skipped (pre-existing).
  The slow tier (`npm run eval:all`, part of `npm run ci`) has **not** run yet — it runs once at
  `/develop-next`'s merge gate, by design.

---

### Step 4 — Create PR — 2026-09-09

- **Staging scope**: `docs/tasks/task.85.…`, `evals/shared/tests`, `shared/resources`,
  `skills/qa-fix/references`, `skills/review-pr`. Pre-flight guard held **0** files — both untracked
  paths were inside the work-item dir. Post-commit leak check: OK, nothing outside scope.
- **Two commits, and the split is deliberate**: `16267305` carries the whole contract change
  (emitter + consumer + the test that pins both) and `2b2959b0` the task documentation. Emitter and
  consumer were **not** split from each other because the test asserts the ingester's exact wording —
  landing the ingester without the re-pinned test, or vice versa, leaves a red commit in between.
- **A pre-commit hook ran `npm run bundle`** during commit 1 and reported every skill in sync, so the
  bundled copy committed in the same commit was already current. One pre-existing warning surfaced,
  `⚠️ shared/resources/<name> not found` — a literal placeholder in another skill, unrelated to this
  change and not introduced by it.
- PR body records the `npm run eval:all` tier as **not yet run** rather than implying full CI passed;
  it runs once at `/develop-next`'s merge gate.

---

## QA Iteration History

### QA Cycle 1 — 2026-09-09

**Gate**: FAIL (70/100) — `task.85.gate.1.review-pr-machine-readable-findings.yml`
**Report**: `task.85.qa.1.review-pr-machine-readable-findings.md`
**PR Review**: _pending — Step 5c runs only on a clean gate_

| Id | Sev | File | Finding | Status |
| --- | --- | --- | --- | --- |
| TASK85-001 | HIGH | `shared/resources/qa-findings-ingester-prompt.md` | The block-to-output mapping contradicted itself — `suggested_action` was said to "carry across by name" **and** to "become `suggested_fix_path`", and the output schema defines no `suggested_action` key — and gave no destination for `id`, `category` or `confidence` | ✅ Fixed |
| TASK85-002 | MEDIUM | `skills/review-pr/SKILL.md` | The template's yaml block used literal example values (`id: PC-1`, `ref: "AC-3"`) under "ALWAYS use this exact template structure", against the brace convention every sibling section uses | ✅ Fixed |
| TASK85-003 | LOW | `shared/resources/qa-findings-ingester-prompt.md` | `truncated_count` summing conflicted with the field's own schema comment | ✅ Fixed |

**Fixes applied (cycle 1):**

- **TASK85-001** — replaced the prose sentence with an 8-row per-field mapping table. Every block
  field now names a destination or an explicit **Dropped.**, and the table opens by stating that
  **no** field carries across by name, which is the assumption that produced the contradiction.
  `id` renumbering (`PC-1`/`CR-1` → `F{n}`) is spelled out; `category` and `confidence` are marked
  dropped with the reason, including "do not fold `confidence` into `severity`".
- **TASK85-002** — converted the block's example entries to the template's own brace convention and
  added a comment line stating the lens ordering.
- **TASK85-003** — replaced "add the block's `truncated_count` to your own" with a paragraph naming
  what each count measures and why the sum is the right answer for the field's consumer.

**A test in this file was itself over-fitted, and the fix exposed it.** The cycle-1 assertions
`assert.match(body, /id: PC-1/)` and `/id: CR-1/` pinned the *literal example values* — so a
correct placeholder rewrite turned them red. They now assert the id **shape** (`PC-n|PC-\d`) plus the
stated lens ordering. Worth recording: the assertion was green while the defect it sat next to was
live, and went red only when the defect was fixed. That is the signature of a test pinned to an
example rather than to a rule.

**4 further mutations proven (M14-M17), all red:**

| # | Mutation | Result |
| --- | --- | --- |
| M14 | "**No field carries across by name**" softened | ✅ red |
| M15 | the `confidence` row removed from the mapping table | ✅ red |
| M16 | the `**Dropped.**` markers removed | ✅ red |
| M17 | the lens-ordering comment removed from the template block | ✅ red |

`npm run ci:fast` green after the fixes: prettier clean, 2965 tests, 0 failures. `npm run bundle`
re-run; the one bundled consumer is in sync.

---

### QA Cycle 2 — 2026-09-09

**Gate**: PASS (95/100) — `task.85.gate.2.review-pr-machine-readable-findings.yml`
**Report**: `task.85.qa.2.review-pr-machine-readable-findings.md`
**PR Review**: _Step 5c — see below_

All three cycle-1 findings verified fixed. Mandatory cycle-2 **refute pass** (unscoped, whole-branch,
because `PRIOR_GATES=1`) found nothing in the fixes. One new LOW — TASK85-004, `truncated_count` is
carried on the block path but dropped on the legacy fallback — pre-existing, and its remedy needs a
stable text shape for the rendered omitted-count note, which §4 Out of Scope forbids changing here.

**Full `npm run ci` run at this point rather than deferred**, exit 0 including `eval:all`. Success
criterion 10 says *full* `npm run ci`; cycle 1 could only mark it PARTIAL because only the fast tier
had run, and a criterion marked PARTIAL at acceptance is a criterion nothing verified.

**Two further probe misreadings this cycle**, both recorded in the QA report where they occurred:

- The Step 4b engine reported an `execution-failure` at high confidence in **both** shells — the
  strongest shape that finding takes. It was the probe's own binding: `DOC_FILE` was bound to a
  repo-relative path while `--copy` places the directory's *contents* at the temp root, so `dirname`
  yielded a directory absent from the sandbox and `find` exited 1 with stderr suppressed.
- An exhaustiveness regex reported the mapping table's `id` row missing — the very defect just fixed,
  apparently reintroduced. The row reads ``| `id` (`PC-1`, `CR-1`) |`` and the pattern expected a bare
  backticked word.

Together with cycle 1's M5, that is three probes in one task whose output was a claim about the
instrument. Logged as observation **#26**; the pattern is that a probe's result — positive *or*
negative — is not evidence until the probe is shown to have acted on its subject.

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.85.review-pr-machine-readable-findings`
**PR**: [#363](https://github.com/Gamaroff/agent-skills/pull/363)
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
