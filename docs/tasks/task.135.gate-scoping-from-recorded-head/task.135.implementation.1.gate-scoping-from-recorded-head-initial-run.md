# Implementation Report: Gate scoping from a recorded head, not a typed timestamp

**Task**: `task.135.gate-scoping-from-recorded-head.md`
**Run Number**: 1
**Started**: 2026-09-30 14:20
**Status**: Completed

---

## Summary

Record the reviewed commit (`head:`) on every QA gate, stamp `updated:` from `date -u`, and move the re-review trigger, the cycle-3+ scope and the 5c conformance row off the typed timestamp and onto the head.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | medium                                                                     |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (gh-stage work-started: already In Progress; Priority P2 Medium already set) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.135.*` exists in git                             | Branch created at `ddacea6d` | —                    |
| 2. review-task             | ✅ Done | `task.135.review.{N}.{name}.md` exists (or skip logged)               | review.1 — READY TO IMPLEMENT 8/10; 0 critical, 6 important applied; Planned → Ready for Development | —                    |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline, 1 iteration; 3/3 phases; 21 new tests; 4 mutation proofs | —                    |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #531: https://github.com/Gamaroff/agent-skills/pull/531 | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.135.qa.{N}.*.md`; `task.135.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 4 cycles (FAIL 60 → FAIL 40 → FAIL 40 → CONCERNS 90); 13 bugs closed; 5c APPROVE (task.135.pr-review.1) | —                    |
| 7. finalise                | ✅ Done | `task.135.dod.{N}.*.md`; task `status: accepted`                      | DoD PASS — task.135.dod.1; accepted (1.2); CI reading 2 SUCCESS @ 987e2e45 | —                    |
| 8. commit-changes          | ✅ Done | All artifacts committed and pushed                                     | Final report commit + push | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-30

- Invoked by `/develop-next` (AUTONOMOUS RUN directive); item T135 selected from the task-registry fallback.
- Feature branch base: develop — auto-answered (Q1 recommended option; develop-next autonomous directive)
- PR target branch: develop — auto-answered (Q2 recommended option; develop-next autonomous directive)
- Upfront questions asked: 0 (both auto-answered per the directive; required count 2 satisfied by auto-answers)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline (no subagents dispatched): resolver unnecessary (exact path supplied); lite-mode inputs derived from the document — risk_level=medium (risk_ok=false), phase_count=3, single_module=false → PIPELINE_MODE=standard
- Always-load files resolved: 3 files — from skills-config.yaml devLoadAlwaysFiles; all present
- Document status at start: Planned — Step 2 (/review-task) validates and promotes
- Tracker: TRACKER=github, TRACKER_ISSUE=444
- Branch: `feature/task.135.gate-scoping-from-recorded-head` (from develop @ `ddacea6d`, pushed with upstream). Implementation report stashed before branch creation, restored after.
- Tracker comment work-started: posted. GitHub board: work-started → already (In Progress).


### Step 2 — review-task

- review-task invoked (Planned + no report → run). Output: Comprehensive report (autonomous default). Step 8.5 auto-answered: apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete.
- Review report: docs/tasks/task.135.gate-scoping-from-recorded-head/task.135.review.1.gate-scoping-from-recorded-head.md
- Q1–Q3 resolved autonomously: include qa-gate template; both-shell while-read array loop over mapfile; add a 5c gate trail row rather than rewrite § D.
- Pre-pass agents B/C not dispatched — performed inline (independence lost).
- Tracker re-read: github_issue 444 unchanged since Step 1 — no re-fire. Comments: review-task posted; review posted.


### Step 3 — develop

- Pre-develop surface map: 10 files identified in qa-task, qa-story, qa-gate, shared/resources (qa-re-review-scope.md, code-review-prompt.md, pr-conformance-prompt.md, tests/), evals/shared/tests — built inline during the Step 2 review (no Explore subagent; independence lost).
- Plan file found: docs/tasks/task.135.gate-scoping-from-recorded-head/task.135.plan.gate-scoping-from-recorded-head.md — included as implementation context for /develop
- Step 3 inline — /develop not invoked: the plan names every hunk and the surface map was already measured; the inline path wrote the one develop Change Log row.
- Fast gate: develop.fastGateCommand unset → `npm run ci:fast` (script exists — precondition passes).
- Deviation from the plan, recorded: qa-task Phase 0's document check measures from the commit that last wrote the gate (`git log -1 -- <gate>`), not from `head:`. A QA cycle edits the task document after the head it records and commits those edits with the gate, so measured from the head every gate reads "document moved" and the skip branch could never fire. Proven by test F2 and by mutation M4.
- Extra sites the review had not listed, changed for the no-`--since` criterion: qa-task Phase 0 step 5 prose snippet, qa-story Phase 0 re-review scope bullet list, shared code-review-prompt.md's QA re-review line.
- New bundled copy: skills/qa-gate/references/qa-re-review-scope.md (qa-gate now cites the rule by fragment — one file, no closure).
- Mutation proofs: M1 scope source reverted to `--since` → B[bash], B[zsh], E red; M2 author-time comparison removed → "precedes its head's author time" red; M3 head-presence check removed → "no head: is red" red; M4 document measured from head → F2[bash], F2[zsh] red. All restored; 79/79 on the three suites after restore.
- ci:fast: 4650 pass / 2 fail on first run — tests/test-clean-checkout.test.js over its 10 s budget under load (13/13 alone); tests/bundled-links.test.js flagged the untracked new bundled copy (7/7 once staged). Prettier and bundle:check clean.
- Development completion comment posted to github issue 444.


### Step 4 — create-pr

- SCOPE_PATHS: docs/tasks/task.135.gate-scoping-from-recorded-head, CHANGELOG.md, evals/shared/tests, shared/resources, skills/{develop-story,develop-task,qa-gate,qa-story,qa-task,review-code,review-pr,review-security}/references, skills/{qa-gate,qa-story,qa-task}. No out-of-scope untracked files — nothing held.
- Commit `79ba80e7` (30 files, implementation report included). Leak check: OK.
- PR created: https://github.com/Gamaroff/agent-skills/pull/531 (base develop, Closes #444). Post-PR state check: PR #531 state = OPEN. errors = 0 (checked inline).
- Tracker comment in-review: posted. GitHub board: in-review → stage-disabled.
- Lock pr_url updated.


### Steps 5–6 — QA loop

- QA_MAX_CYCLES = 5 (lock has no qa_max_cycles). Traceability mapper skipped: Success Criteria are a checklist, not a table.
- GitHub board: QA-start re-assert → stage-disabled.
- QA Cycle 1 — changes-requested: stage-disabled.
- Cycle 2: whole-branch refute pass (fresh Explore reviewer, 5.4 min). Gate 2 FAIL 40/100, head `60b4ef6e`. Bugs 1–4 closed (1 partial → 6). No Convergence check (cycle < 3); route classifier: no exit at cycle 2.
- Pre-strike shape noted at cycle 2: gate-head-freshness.test.mjs carries a HIGH on both gates, both on its history rules (mechanism: judging existence/ancestry in the corpus). Move chosen for CR2-2: **replace** — the corpus test keeps only rewrite-proof rules; existence/ancestry move to the in-loop scope block (already) and the 5c conformance lens.
- QA Cycle 2 — changes-requested: stage-disabled.
- Cycle 4: SAFETY_REPROBE=true (clause 3 again); whole-branch safety re-probe by a fresh Explore reviewer (11.6 min, ran the blocks under /bin/bash 3.2, bash 5.3 and zsh). Gate 4 CONCERNS 90, head `bbd7d2ba`, top_issues empty → §5c route 3. Evidence committed in `65ea8a96` (path 1) and pushed.
- Step 5c: /review-pr --effort medium --comment — both lenses (Explore, parallel). Verdict ✅ APPROVE: 5 findings, all low (PC-1–3 document consistency, CR-1 step-5 helper rc unchecked, CR-2 field() trim order). PC-1–3 applied to the task document (document-only). CR-1/CR-2 carried as follow-ups with CR4-1, CR4-2, CR3-4, CR3-7. Report: task.135.pr-review.1.gate-scoping-from-recorded-head.md; PR comment posted. ready-for-merge → stage-disabled.
- Observation #234 written (test-clean-checkout load flake); observation #181 recurrence appended (pre-existing BSD mktemp defect).
- Cycle 3: SAFETY_REPROBE=true (clause 3 — gate 2 FAIL, Success Criteria say "never"); whole-branch safety re-probe by a fresh Explore reviewer (6.3 min). Dogfood of the shipped blocks on this task: step 5 → false; Step 3b unset → HALT; false → 30-file narrowed scope from gate 2's head; true → whole branch. Pre-existing BSD mktemp defect surfaced (not this branch; obs #181 recurrence appended). Gate 3 FAIL 40/100, head `e451c70f`.
- Convergence check cycle 3: HIGH 1, 2, 1 — does not trip (1 ≥ 2 false). Route classifier: no exit. Third strike: none (the freshness test is not in gate 3's HIGH set).
- QA Cycle 3 — changes-requested: stage-disabled. Structural move for cycle 3's fix (Step 2.6, repeat subject — the unbound-input class, three cycles running): consolidate — every block that reads a work-item path validates it and HALTs.
- qa-fix cycle 1: findings ingested inline (the orchestrator wrote gate.1 — ingester not dispatched; independence loss recorded). No third strike. Step 3.5 probe populations: CODE_MOVED 1 file, LAST_GATE_HEAD 3 (one pinned block), "files changed since the last gate" 4 — all updated.
- Cycle 1: /qa-task (code_review_blocking=true), independent Explore reviewer (4 min). Gate 1 FAIL 60/100, head `79ba80e7` — the corpus's first schema-2 gate.

### Step 7 — finalise

- /finalise: four DoD agents in parallel (Explore). AC 7/7 PASS; Security PASS — boundary recorded `internal` (reason `shared/resources/tests/gate-head-freshness.test.mjs#checkGate`, checked against the disqualified table: not listed); Compliance NOT_APPLICABLE; Docs PASS. Gate CONCERNS judged non-blocking (no open entry; 5c APPROVE). Decision: ACCEPTED.
- CI reading 1: SUCCESS @ 8e7f6496cbdd over 5 checks; CI reading 2: SUCCESS @ 987e2e457ca6 over 5 checks after 120s (background poll).
- Acceptance commit `655be5d4` (document, DoD, sprint review, registry ticked) + `987e2e45` (sprint review test count corrected to the measured 60 before reading 2); both pushed; tracked-and-on-origin assertions passed.
- CHANGELOG cites task 135 (6d). PR canonical comment posted. Tracker: done comment posted; #444 closed (CLOSED confirmed); board done → already; Document link already on develop.

---

## Completion Summary

Implemented task.135: QA gates record the commit they judged (`head:`, schema 2) and a clock-written `updated:`; the cycle-3+ re-review scope and qa-task's re-review trigger derive from that head, not from a typed timestamp; two 5c trail rows check a gate's head and timestamp; a rewrite-proof freshness test covers every schema-2 gate. Four QA cycles (FAIL 60 → 40 → 40 → CONCERNS 90) found and closed 13 bugs — chiefly the unbound-input class (fenced blocks are separate shells), which surfaced one level up each cycle until every block this branch touches validated its own inputs. Notable decisions: the Phase 0 document check measures from the gate's commit, not the head; criterion 3 amended (rewrite-proof rules) because develop-batch rebases open PRs; the 5c § D row kept and a trail row added instead. Pre-existing defects found and logged, not fixed here: BSD mktemp in Step 3b (observation #181), the test-clean-checkout load flake (observation #234).
---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-09-30
**Gate Result**: FAIL
**Issues Found**: CR-1 (high) freshness test red after rebase/squash; CR-2 (medium) Step 3b reads `$LATEST_GATE` from another shell; CR-3 (medium) trigger counts five dirs; CR-4 (medium, advisory) uncommitted doc edits invisible; CR-5/CR-6 low; 2 cleanups
**HIGH findings**: 1
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fix commit**: `60b4ef6e` — CR-1 (branch-scoped history rules), CR-2 (Step 3b binds its gate; HALT on unreadable), CR-3 (full-tree CODE_MOVED), CR-4 (doc vs working tree); CR-5–CR-8 addressed. Mutations M5–M10 red. Fast gate: 4665/4667, the one failure the load-sensitive test-clean-checkout (13/13 alone). Post-fix PR state: OPEN.

### QA Cycle 2 — 2026-09-30
**Gate Result**: FAIL
**Issues Found**: CR2-1 (high) cycle 3+ narrows after a security FAIL — `$SAFETY_REPROBE` unbound in Step 3b; CR2-2 (high) freshness test breaks on develop-batch in-flight rebase; CR2-3 (medium) Phase 0 step 3 reads `$LATEST_GATE` unbound; CR2-4 (medium) `:(exclude)docs` too wide; 5 low
**HIGH findings**: 2
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fix commit**: `e451c70f` — CR2-1 (SAFETY_REPROBE a bound input; step 5 probe binds its gate), CR2-2 (freshness mechanism replaced: rewrite-proof rules; ancestry in-loop + 5c; criterion 3 amended), CR2-3, CR2-4/5; lows. Mutations M11–M16 red. Fast gate 4675/4676, 0 fail. PR OPEN.

### QA Cycle 3 — 2026-09-30
**Gate Result**: FAIL
**Issues Found**: CR3-1 (high) unchecked `$TASK_FILE` → "." → SAFETY_REPROBE=false; CR3-2 ":(exclude)." excludes the tree; CR3-3 Step 3b unchecked `$TASK_DIR`; CR3-5 zone-less updated:; CR3-6 C-quoted paths; CR3-4 advisory; 2 low. Pre-existing mktemp defect found by dogfood (obs #181).
**HIGH findings**: 1
**MEDIUM findings**: 5
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)
**Fix commit**: `bbd7d2ba` — CR3-1/2/3 (input validation at every touched block), CR3-5 (zoned timestamps), CR3-6 (NUL-delimited list), CR3-8. Mutations M17–M21 red. Fast gate: attempt 1 red on prettier (fixed); attempt 2: 4690/4692, sole failure the LOAD-SENSITIVE test-clean-checkout (13/13 alone) — committed on that basis, not re-gated (bounded at 2). PR OPEN.

### QA Cycle 4 — 2026-09-30
**Gate Result**: CONCERNS
**Issues Found**: none promoted — CR4-1 (medium/medium, advisory) the Phase 0 trigger trusts a malformed head:; CR4-2 (low) pathspec magic in FILES; both in recommendations.future. Bugs 9–13 closed.
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE
**Loop exit**: n/a — this exit not taken
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: 2026-09-30 14:06 UTC
**Final Status**: Completed
**Branch**: feature/task.135.gate-scoping-from-recorded-head
**PR**: https://github.com/Gamaroff/agent-skills/pull/531
**QA Iterations**: 4 QA cycles (3 qa-fix cycles) + 5c PR review (APPROVE)
**DoD Summary**: docs/tasks/task.135.gate-scoping-from-recorded-head/task.135.dod.1.gate-scoping-from-recorded-head.md
**Tracker debt**: none
