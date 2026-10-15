# Implementation Report: PRD-scoped epic numbering

**Task**: `task.205.prd-scoped-epic-numbering.md`
**Run Number**: 1
**Started**: 2026-10-15 12:01
**Status**: Completed

---

## Summary

Move every epic skill to PRD-scoped `epic.{P}.{E}` numbering, make a parent PRD mandatory, and retire the global epic registry and `epic-registry-manager` (roadmap T205, dispatched by develop-next).

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
| Board status        | In Progress ✅ (gh-stage work-started: transitioned; Priority already P2) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.205.*` exists in git                             | Branch `feature/task.205.prd-scoped-epic-numbering` created at `6872072a`, pushed | —                    | 2026-10-15T10:02Z |
| 2. review-task             | ✅ Done    | `task.205.review.{N}.{name}.md` exists (or skip logged)               | `task.205.review.1.prd-scoped-epic-numbering.md` — READY TO IMPLEMENT 8/10; 7 Important + 1 Optional fixes applied; Planned → Ready for Development | —                    | 2026-10-15T10:05Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan + surface map); 30/30 phases; ci:fast 5663/0; 10 mutation proofs; develop-complete comment posted | —                    | 2026-10-15T10:27Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #674: https://github.com/Gamaroff/agent-skills/pull/674 (commit `91c077e7`) | —                    | 2026-10-15T10:28Z |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.205.qa.{N}.*.md`; `task.205.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 7 cycles (2 granted re-entries); gate 7 PASS 100; PR review CONCERNS (`task.205.pr-review.1`) | — | 2026-10-15T14:09Z |
| 7. finalise                | ✅ Done    | `task.205.dod.{N}.*.md`; task `status: accepted`                      | DoD ACCEPTED; acceptance commit `0b437e47`; CI reading 2 SUCCESS (tree-equivalent); #648 closed | — | 2026-10-15T14:32Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Implementation report committed and pushed | — | 2026-10-15T14:33Z |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-15

- Invoked by develop-next (roadmap T205) with `--defaults`; autonomous run.
- Feature branch base: develop — source: recommended (`--defaults`, no question asked)
- PR target branch: develop — source: recommended (`--defaults`, no question asked)
- Mode: standard — source: detector; skips: none; refused: none
- qa-planning gate: skipped (auto — no prompt)
- Questions asked: 0 (resolver returned `questions: []`)
- Phase 0 run inline (no 0a-parallel agents dispatched): lite-mode inputs derived from the document — risk_level absent (ok), phase_count 7 (≥3), single_module false (shared/resources + ~15 skills) → PIPELINE_MODE=standard
- Tracker: github, issue #648
- Step 1: branch `feature/task.205.prd-scoped-epic-numbering` from develop @ `6872072a`; lock written with answers; tracker-comment work-started: posted; GitHub board: work-started → transitioned (In Progress).
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Status at start: Planned — proceed; Step 2 /review-task validates and promotes
- Precondition check (task Phase 0): task.202 accepted, task.203 accepted, `shared/resources/doc-id.js` present. Note: the engine's allocator is `next epic --prd-dir <dir>`, not `--prd P` as the task text says — implementation follows the engine.

### Step 2 — review-task — 2026-10-15

- review-task invoked (status Planned, no prior report). Output format auto-answered: Comprehensive report.
- Pre-pass: B `drift` (axes source `architecture`; ShellCheck missing, interim notices stale), C `not-implemented`.
- Step 8.5 auto-answered: apply all critical + important fixes (7 Important + 1 Optional applied). Step 9 auto-answered: Yes, fixes complete → Ready for Development.
- Key fix: the allocator is `doc-id.js next epic --prd-dir <dir>` (task said `--prd P`). Consumer vendoring of doc-id becomes `scripts/doc-id.cjs`.
- Review report: docs/tasks/task.205.prd-scoped-epic-numbering/task.205.review.1.prd-scoped-epic-numbering.md; reviewed_blob recorded.
- Review outcome comment: review-task posted its own (`posted`) — pipeline Step 2 comment skipped (one event, one writer).
- Tracker key unchanged (#648 at Step 1) — no work-started re-fire.

### Step 3 — develop — 2026-10-15

- Plan file found: docs/tasks/task.205.prd-scoped-epic-numbering/task.205.plan.prd-scoped-epic-numbering.md — included as implementation context for /develop
- Pre-develop surface map: 25 files identified in shared/resources (doc-id, generator, tracker-issue), 14 skills, scripts/setup-consumer.sh, tests/ (Explore subagent)
- Step 3 inline — /develop not invoked: the plan names every hunk and the surface map was recorded; the inline path owes /develop's Task Completion Checklist (phases ticked, status Ready for Review, one Change Log row)
- Fast gate precondition: `develop.fastGateCommand` unset → `npm run ci:fast`, defined. Run with the gitignored `.agents/skills` symlink moved aside (all three runs).
- Fast gate iter 1: prettier failed on 7 new/edited files (tests never ran) → formatted. Iter 1b: 5662 pass / 1 fail — `tests/unbound-default-reads.test.js` (obs #133) flagged three new `${NAME:?}` guards → declared as block INPUTS with reasons. Iter 1c: **5663 pass, 0 fail**.
- Also clean: `npm run bundle:check`, `npm run lint:shell` (ShellCheck), `quick_validate.py` on 14 changed skills.
- Performance criterion measured (working tree, re-measure on the PR head at finalise): `uptime` load 2.67; `time command node shared/resources/generate-prd-epic-index.mjs --check` → real 0.039 s (bound < 1 s).
- Mutation proofs (each reverted once, seen red, restored): generator one-level discovery (3 fail), generator `doc-id.js`-only load in an ESM consumer (1 fail), generator number-disagreement skip (2 fail); jira-create-epic local `[Epic N]` regex copy (2 fail); sync-jira-epic `(P,E)` child filter (1 fail); tracker-issue rename branch (1 fail); create-epic sentinel re-added (guard 1 fail); sync-github-epic `--rename-from` dropped (1 fail); review-epic bare-number refusal reverted to a glob (1 fail); ensure-task milestone title wrong (1 fail).
- Decisions: `doc-id` vendored to consumers as `scripts/doc-id.cjs` (ESM-safe), generator loads `./doc-id.cjs` then `./doc-id.js`; `--rename-from` success reports `reason: performed` plus `renamedFrom` (the engine's existing vocabulary, not the plan's `ok`); `idLabel` omits a sub-story letter, `findChildStories` appends it; the generator found this repository's domain-level PRD for the first time and wrote its epics index.
- Found and fixed in-session: `"${DOMAIN:?… epic's …}"` — an apostrophe inside a double-quoted `:?` word broke the block's bash parse (observation #47).
- Out of scope, left for their owners: `create-prd`/`review-prd` registry lines (task.204, allowlisted in the guard); story-side milestone key and story `epic:` frontmatter examples (task.206); repo-wide prose (task.207).

### Step 4 — create-pr — 2026-10-15

- SCOPE_PATHS: 52 paths (work-item dir + every changed tracked dir) in `.claude/state/step4-scope-paths.txt`; pre-flight held nothing (every untracked file was in scope).
- Report links checked before commit (doc-links: 0 links, ok).
- Commit `91c077e7` `feat(task.205): …` pushed; PR #674 → develop, `Closes #648`.
- Leak check reported 6 paths under `skills/epic-registry-manager/` — the intended deletion, staged by `git rm` before Step 4; outside the scope list only because the directory no longer exists. Not a leak.
- Tracker: in-review comment posted; GitHub board: in-review → stage-disabled (no `pipeline.in-review` mapping). Post-PR state check (inline `gh pr view`): OPEN.

- QA Cycle 1 — changes-requested: stage-disabled. Findings ingester not dispatched: the findings were in hand from 5a (independence loss — the same session reviewed and fixed).
- Post-fix PR state: OPEN (inline `gh pr view`).

### QA Loop Re-entry — 2026-10-15

- QA loop re-entry: 1 extra cycle granted (operator chose "Resume at 5a with 1 more cycle"); 0 cycle(s) run outside the loop back-filled from disk (gates 1–5 on disk, 5 `### QA Cycle` entries).
- `grant-qa-cycles.sh`: QA_CYCLE=5, extra_cycles_granted=1, qa_max_cycles=6, reenter_at=5a. The lock had survived the escalation HALT (no halt snapshot), so no restore was needed.
- Cycle 6 gates `575addd8` (bugs 12–13). Traceability mapper not dispatched — consistent with cycles 1–5 (no `.summaries/` matrix); qa-task uses its internal mapping.
- QA Cycle 6 — gate CONCERNS (80/100), head `a6897af1`. Diff reviewer 158683 ms, 2 low advisories (none promoted). Fence probe of the Step 7 guard declined `entry-not-probeable` (stray fence, BUG-14); scratch run with the fence removed engaged 8/8. Suite 5690/5676/0.
- QA Cycle 6 — Convergence check: HIGH `1,1,0,2,0,0`, HIGH_6 = 0 → no trip. Route classifier: `continue (not-a-pass-gate)`; route 2 declined `product-defect-signal`.
- QA Cycle 6 — changes-requested: stage-disabled. Third strike: no HIGH on gate 6 → not applicable.
- Narrowing residue — every MEDIUM on gates 5 and 6 names skills/create-epics-from-shards/SKILL.md (TASK-205-QA5-CR1, TASK-205-QA6-1); HIGH 0 on both. This is an OFFER to qa-fix Step 2.6, not a route and not an escalation.
- QA Cycle 6 fix: findings ingester not dispatched — the findings were in hand from 5a (independence loss, as cycles 1–5). Step 2.6 move: consolidate. Commit `6b33e298`, pushed; post-fix PR state OPEN (inline `gh pr view`).
- Loop limit (6/6): route 2c `continue (medium-not-falling)` — MEDIUM reads 1, 1, 1 over cycles 4–6 → escalate.

### QA Loop Re-entry 2 — 2026-10-15

- QA loop re-entry: 1 extra cycle granted (operator approved "Resume at 5a with 1 more cycle"); 0 cycle(s) run outside the loop back-filled from disk (gates 1–6, 6 `### QA Cycle` entries).
- `grant-qa-cycles.sh`: lock restored from the halt snapshot; QA_CYCLE=6, extra_cycles_granted=1, qa_max_cycles=7, reenter_at=5a. Cycle 7 gates `6b33e298` (BUG-14).
- QA Cycle 7 — gate PASS (100/100), head `632d1752`. Diff reviewer 112831 ms, 1 low cleanup. Route 1 (PASS, no open entry) → 5c.
- Step 5c — `/review-pr --effort medium --comment --no-code`: CONCERNS (PC-1 medium scope, PC-2 low scope); report `task.205.pr-review.1.prd-scoped-epic-numbering.md`; PR comment posted. Conformance lens 76847 ms. Carry classify: PC-1 record (not a docs path), PC-2 doc-only but its fix is this note — nothing edited; review report staged for 6a. ready-for-merge: stage-disabled.

### Step 7 — finalise — 2026-10-15

- DoD summary: `task.205.dod.1.prd-scoped-epic-numbering.md` — ✅ ACCEPTED. AC 17/17 (AC9 re-measured on `82762a2b`: 0.172–0.179 s against a 1 s bound; AC11 resolved by the CI re-run), Security PASS (3 fenced controls, 34 executed, 0 reproduced; record `task.205.dod.1.security.run.json`), Compliance N/A, Docs PASS.
- CI reading 1: SUCCESS @ 82762a2b17f5 (5 checks). The `test` job attempt 1 failed 1/6142 (`resolve-pr-number.test.mjs` "explicit: --pr wins": ENOENT copying a shared `/tmp/executed-prose-*/origin.git` fixture template — a fixture race outside this diff; `82762a2b` differs from the green `632d1752` only under `docs/`). Re-ran the failed job; attempt 2 SUCCESS.
- CI reading 2: SUCCESS (tree-equivalent to 82762a2b17f5) @ 0b437e47f588, over 5 checks, after 30 s.
- Acceptance commit `0b437e47` (`docs(task.205): accept — DoD, sprint review; registry ticked; 5c review carried`), pushed; 6b assertions passed; registry-tick: ticked. CHANGELOG cites task 205.
- PR canonical summary comment posted. DoD body posted to PR — comment URL: https://github.com/Gamaroff/agent-skills/pull/674#issuecomment-6194586481
- Tracker #648: Document link already on a durable branch (unchanged); done comment posted; issue close confirmed CLOSED; board transition: already (Done).
- Accept gap: tracker-actions journal empty → no tracker debt.
- DoD security cases: the DoD's own cases file (1.6 MB, fixture copies embedded per case) is committed. The two re-used QA cases files (0.8–1.0 MB each) are kept outside the tree in `.claude/state/`.
- A DoD section was first inserted between `<!-- change-log-start -->` and `## Change Log`; it was moved above the marker before commit (append-only check ok).
- Task completed.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- Step 3: first fast gate failed on formatting (7 files) and second on the obs #133 unbound-read guard (3 new `:?` inputs). Both fixed; third run green.

### QA Loop Limit Reached — 2026-10-15

The pipeline completed 5 qa-task/qa-fix cycles without a clean PASS.

**Final gate status**: CONCERNS (gate 5, 80/100, head `941446e8`). Both of its gating findings are fixed in `575addd8`, but no gate has read that fix.
**HIGH findings per cycle**: 1, 1, 0, 2, 0 — not monotone; cycle 3's `0` rests on a recorded re-rating (CR-1 HIGH → MEDIUM on a measurement). At the original rating, the Convergence check would have escalated at cycle 3.
**MEDIUM findings per cycle**: 1, 4, 2, 1, 1
**Remaining issues** (from gate 5 — both fixed in `575addd8`, ungated):
- MEDIUM — the shards batch presence check accepted a misnamed batch epic that the id check skipped (TASK-205-BUG-12) — `skills/create-epics-from-shards/SKILL.md`
- LOW — the shards id check discarded its reason (TASK-205-BUG-13) — `skills/create-epics-from-shards/SKILL.md`

Advisory and pre-existing items not fixed (gate 4/5 `recommendations.future`): later blocks of sync-github-epic and ensure-epic-github-issue still use bare `references/` paths. The issue-body blocks read `DOC_URL` / `NEW_BODY` / … bound elsewhere, which is identical on `develop`. Two blocks bind `epic-meta` values they never use.

**What was attempted per cycle**:
- Cycle 1: the shared-milestone rename hijack (HIGH); task milestone lookup ignored the PRD root; story-title strip regression — fixed in `a1d73c9e`.
- Cycle 2 (refute pass): an unbound `$EPIC_REF` (HIGH); a second title parser; rename/edit inputs never bound; a failed lookup under `--rename-from` creating a duplicate; the review-epic resolver ignoring the PRD root. Fixed by consolidating on `doc-id epic-meta`, in `67d5dd32`.
- Cycle 3: the create-epic preflight and the ensure-epic blocks read values bound in other blocks (one rated HIGH, re-rated MEDIUM). The population of cross-block reads was enumerated and fixed in `134e9630`.
- Cycle 4: the cycle-3 self-binding fixes mixed repository-root and skill-relative helper paths (HIGH ×2, one root); the batch guard joined its inputs. Fixed in `941446e8`, with a test that fails on any mixed block.
- Cycle 5: the batch presence check was wider than the id check; the id check discarded its reason. Fixed in `575addd8`.
- Gate-the-last-fix half-cycle: **declined** — `medium-not-falling` (MEDIUM reads 2, 1, 1 over cycles 3–5; route 2c needs it strictly falling, or 0 on the last gate).

**Likely root cause**: this is not one file being circled. The task introduced many new executable skill blocks across ~10 skills, and each review cycle found the next layer of the same class: blocks that are correct as prose but fail when run as their own shell (unbound inputs, cross-block reads, mixed working directories, guards narrower than what they guard). Each fix made more blocks self-contained, and that exposed the next layer. The findings fell in severity: the last two gates had no HIGH after the re-rating question, and gate 5's findings are one MEDIUM and one LOW in a single block. The loop was converging, but the budget ended on a fix.

**Recommended next steps**:
1. Run one `/qa-task` on `575addd8` to gate the cycle-5 fix (bugs 12–13). If it reads PASS or CONCERNS with no open entry, take option 2 below.
2. Then run Step 5c (`/review-pr --effort medium --comment --no-code`) and `/finalise`; `/develop-task` resume offers "Resume at 5a with {k} more cycles".
3. File a follow-up task for the pre-existing issue-body block reads and the per-skill (not per-block) path-root rule in the GitHub epic skills.

### QA Loop Limit Reached — 2026-10-15 (after a 1-cycle re-entry)

The pipeline completed 6 qa-task/qa-fix cycles (5 + 1 granted) without a clean PASS.

**Final gate status**: CONCERNS (gate 6, 80/100, head `a6897af1`). Its one gating finding is fixed in `6b33e298`, but no gate has read that fix.
**HIGH findings per cycle**: 1, 1, 0, 2, 0, 0 — 0 on the last two gates
**MEDIUM findings per cycle**: 1, 4, 2, 1, 1, 1
**Remaining issues** (from gate 6 — fixed in `6b33e298`, ungated):
- MEDIUM — a stray fence hid Steps 6–7 of create-epics-from-shards, so no engine could reach the Step 7 guard (TASK-205-BUG-14) — `skills/create-epics-from-shards/SKILL.md`

Advisory, not fixed: CR-1, where under zsh `nomatch` a missing `epic.P.E` aborts the presence loop without its message (it still fails closed), and CR-2, where a duplicate P.E still reads "is missing". The carried gate 4/5 `recommendations.future` items are unchanged.

**What was attempted per cycle**:
- Cycles 1–5: see the first escalation entry above.
- Cycle 6 (granted): verified cycle 5's fixes (bugs 12–13 closed, both mutation-proven). Found BUG-14 when the boundary probe declined `entry-not-probeable`. Fixed in `6b33e298` by deleting the fence. The test now uses the shared fence reader, so it can no longer pass on a block the engines cannot see.
- Gate-the-last-fix half-cycle: **declined** — `medium-not-falling` (MEDIUM reads 1, 1, 1 over cycles 4–6).

**Likely root cause**: the loop is converging, but each gate finds exactly one MEDIUM, so the MEDIUM count stays flat and route 2c never fires. BUG-14 is a different kind of defect from cycles 1–5: a pre-existing document-structure fault, found by the probe rather than the reviewer. Like cycle 5's finding, it is a one-site fix in one file. No HIGH has been raised for two gates.

**Recommended next steps**:
1. Grant one more cycle (`/develop-task` resume → "Resume at 5a with 1 more cycle") to gate `6b33e298`. If it reads PASS, or CONCERNS with no open entry, it hands to 5c and finalise.
2. Or accept gate 6: run Step 5c (`/review-pr --effort medium --comment --no-code`), then `/finalise`. Finalise's security probe of the Step 7 guard should now engage, because the fence is fixed.
3. File the follow-up named in the first entry, plus a repository-wide guard that every SKILL.md fence closes where it opens.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-15
**Gate Result**: FAIL
**Issues Found**: 3 gating — CR-1 HIGH (`sync-github-epic` renames any milestone the epic issue is on), CR-4 MEDIUM (task milestone lookup ignores a configured PRD root), CR-6 LOW (story-title strip regressed); 4 advisory (unbound `TITLE`/`ISSUE_NUM`/`PRD_DIR` reads in new skill blocks)
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: CR-1 (rename only the epic's own milestone), CR-4 (resolve PRD root), CR-6 (strip dash/sub-story ids); advisory CR-2/3/5/7 (bind or guard block inputs). Fast gate attempt 1 red — bundled `doc-id.js` copies stale after a prettier pass; rebundled, attempt 2 green (5666/0). Mutation-proven: CR-1, CR-3, CR-4, CR-6. Step 3.5 probe: phrase `rename-from` → `shared/resources/tracker-issue-cli.md` (unaffected — CLI contract unchanged), `skills/sync-github-epic/SKILL.md` (updated); plus the work item's restatements (task doc lines on the rename rule, CHANGELOG item 3) updated. Population 2.
**Commit**: `a1d73c9e`

### QA Cycle 2 — 2026-10-15
**Gate Result**: FAIL
**Issues Found**: refute pass — cycle 1 fixes verified (bugs 1–2 closed, CR-6 partial). New: CR-1 HIGH (task milestone block reads unbound `$EPIC_REF`), CR-2/3/4/5 MEDIUM (second title parser; rename/edit inputs never bound; failed lookup creates a duplicate milestone; review-epic ignores PRD root), CR-6/8 LOW; 2 advisory
**HIGH findings**: 1
**MEDIUM findings**: 4
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: Step 2.6 move = consolidate (trigger: repeat subject — the unbound-input class from cycle 1). New `doc-id.js epic-meta` is the one milestone-key definition; every block this task added takes only its document path (ensure-task, ensure-epic, sync-github-epic id/rename/edit) or a substituted `{placeholder}` (create-epic id check, shards Steps 4/7) and resolves `PRD_ROOT` via `resolve-paths.sh`. tracker-issue `--rename-from` fails closed on a failed lookup. stripIdPrefix hyphen rule. Fast gate green first attempt (5673/0). Mutation-proven: CR-1, CR-2, CR-3, CR-4, CR-5, CR-8, CR-9. Step 3.5 probe: phrases `Epic {P.E} —` / `epic-meta` → ensure-epic, ensure-task, sync-github-epic (all updated); plus `tracker-issue-cli.md` (fail-closed rule added) and CHANGELOG item 3. Population 3.
**Commit**: `67d5dd32`

### QA Cycle 3 — 2026-10-15
**Gate Result**: CONCERNS
**Issues Found**: cycle 2 fixes verified (bugs 3–7 closed). New: CR-1 create-epic preflight reads another block's PRD_DIR/P/E (reviewer HIGH, **re-rated MEDIUM** on a measured loud exit 2 on an advisory step, base identical — at HIGH the Convergence check would have tripped at `1, 1, 1`); CR-2 MEDIUM ensure-epic milestone/create blocks read Step E1 values; advisory CR-3/4/5 (CR-4 reproduced under TMPDIR=/var/tmp), cleanup CR-6
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)
**Fixes Applied**: BUG-8 (preflight takes `{epic file}`), BUG-9 (ensure-epic milestone/create blocks bind via `epic-meta`); advisory CR-3 (shards batch floor), CR-4 (test fixture path; green under `TMPDIR=/var/tmp`), CR-5 (rename block tracker-issue path + failure reported), CR-6 (docblock). Population check run first: all 14 fenced blocks this branch touched scanned for reads of values another block binds — the two QA named were the last; the rest are declared inputs or base patterns. Fast gate green first attempt (5675/0). Mutation-proven: CR-1, CR-2, CR-3, CR-4.
**Commit**: `134e9630`

### QA Cycle 4 — 2026-10-15
**Gate Result**: FAIL
**Issues Found**: cycle 3 fixes verified (bugs 8–9 closed). New: CR-1/CR-2 HIGH, one root — touched blocks mix repository-root and skill-relative helper paths (BUG-10); CR-5 MEDIUM shards guard joins its inputs (BUG-11); CR-3/CR-4 pre-existing (identical on develop) → future; CR-6 cleanup
**HIGH findings**: 2
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)
**Fixes Applied**: BUG-10 — population first (scan of every bash block in nine epic skills: 3 blocks mixed the two path roots), all three fixed, and a test now fails on any mixed block; BUG-11 — per-input validation; CR-6 cleanup — one frontmatter parser. Pre-existing CR-3/CR-4 left unchanged (identical on develop; follow-up). Fast gate green first attempt (5676/0). Mutation-proven: CR-1, CR-2, CR-5, CR-6.
**Commit**: `941446e8`

### QA Cycle 5 — 2026-10-15
**Gate Result**: CONCERNS
**Issues Found**: cycle 4 fixes verified (bugs 10–11 closed). New: CR-1 MEDIUM shards presence check accepts a misnamed batch epic (BUG-12); CR-4 LOW id-check reason discarded (BUG-13); CR-2/CR-3 advisory (medium confidence, pre-existing path forms); CR-5 cleanup
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached
**Fixes Applied**: BUG-12 — presence loop requires exactly one `epic.P.E.{slug}/epic.P.E.{slug}.md` (the shape the id check reads); BUG-13 — id-check output printed on failure; CR-2 advisory — create-epic card-preflight from the repository root. Fast gate green first attempt (5676/0). Mutation-proven: CR-1, CR-4.
**Commit**: `575addd8`

### QA Cycle 6 — 2026-10-15
**Gate Result**: CONCERNS
**Issues Found**: cycle 5 fixes verified (bugs 12–13 closed, both mutation-proven). New: QA6-1 MEDIUM — a stray four-backtick fence at create-epics-from-shards SKILL.md:334 (pre-existing on develop) hides Steps 6–7, so the fence probe cannot reach the Step 7 guard this task added (probes_executed 0; BUG-14); advisory CR-1 (zsh nomatch message), cleanup CR-2 (duplicate-P.E message)
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached
**Fixes Applied**: QA6-1 / BUG-14 — deleted the early closing fence in the Step 5 index template; the retirement test now reads every bash block through `qa-execute-snippets.mjs` `extractBlocks` (Step 2.6 move: consolidate — the test's nesting-blind regex and the engines' fence reader disagreed). Fence probe against the fixed doc: engages 8/8 (not recorded — QA's artifact). Fast gate attempt 1 red — `bundle-missing-source.test.js` load-sensitive budget (20.6 s / 20 s; 7/7 green alone); attempt 2 green (5690/5676/0). Mutation-proven: stray fence restored → Step 7 test red. Step 3.5 probe: population 1 (`create-epics-from-shards/SKILL.md`, updated); all 9 epic skills' fence-reader block counts equal their raw fence counts. Advisory CR-1/CR-2 left (no gate left to read a change to the presence loop).
**Commit**: `6b33e298`

### QA Cycle 7 — 2026-10-15
**Gate Result**: PASS
**Issues Found**: cycle 6 fix verified (BUG-14 closed; all 14 bugs closed); Step 7 guard probed against the committed doc, engages 8/8 (`probes_executed: 8`); 1 low cleanup (test hook style)
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: CONCERNS — `task.205.pr-review.1.prd-scoped-epic-numbering.md` (conformance lens only, `--no-code`; 2 scope findings, anchors verified)
**Loop exit**: n/a — this exit not taken
**Action**: Proceeding to 5c (PR conformance review)
**Carried to 6a**: docs/tasks/task.205.prd-scoped-epic-numbering/task.205.pr-review.1.prd-scoped-epic-numbering.md
**Findings recorded, not fixed**: PC-1 (medium) — `skills/documentation-standards-validator/SKILL.md` is edited outside §7 and half-converted to `epic.{P}.{E}` (its examples mix the two schemes). It is not a docs path, so 5c does not fix it; it goes to the task.207 prose sweep. PC-2 (low) — the onboarding PRD gained a generated epics-index block: it was produced by `generate-prd-epic-index.mjs`'s new domain-level discovery and is kept (no edit at 5c), and is noted here as the review asks.

---

## Completion

**Finished**: 2026-10-15T14:33Z
**Final Status**: Completed
**Branch**: feature/task.205.prd-scoped-epic-numbering
**PR**: https://github.com/Gamaroff/agent-skills/pull/674
**QA Iterations**: 7 (5 budgeted + 2 granted re-entries; final gate 7 PASS 100/100; Step 5c PR review CONCERNS)
**DoD Summary**: `task.205.dod.1.prd-scoped-epic-numbering.md` — ✅ ACCEPTED
**Tracker debt**: none

### Completion Summary

Implemented PRD-scoped epic numbering. Every epic skill now names `epic.{P}.{E}` through `doc-id.js` (`next epic`, `epic-meta`), a parent PRD is mandatory, tracker titles read `Epic P.E`, existing GitHub milestones are renamed in place (`tracker-issue --rename-from`, fail-closed), and the global epic registry and `epic-registry-manager` are retired. The QA loop took 7 cycles. Each cycle found the next layer of one defect class: executable skill blocks that read correctly as prose but fail when run as their own shell (unbound inputs, cross-block reads, mixed path roots, guards narrower than what they guard). The loop escalated twice at its budget with one MEDIUM left, and the operator granted one cycle each time. Cycle 6 found that a stray fence, present on develop since May, hid the Step 7 guard from every engine. The fix also moved the retirement test onto the shared fence reader. Gate 7 read PASS 100. Step 5c returned CONCERNS with two scope findings: `documentation-standards-validator/SKILL.md` is half-converted (left for task.207), and the onboarding PRD gained a generated index block. `/finalise` accepted the task (17/17 AC, 34 security probes, 0 reproduced). CI reading 1 needed one re-run of a fixture-race flake outside the diff, and reading 2 was SUCCESS by tree-equivalence. Issue #648 is closed.
