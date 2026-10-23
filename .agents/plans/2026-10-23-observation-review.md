# Observation review — 2026-10-23

First `/observe-work --review` run (`last-review-date.txt` read `never`). The backlog held 77 open and 5 parked entries,
#5–#92. Each one was checked against `origin/develop` @ `473f98f9` by four read-only verification passes, and every
verdict cites a file:line.

## Decided this review

| Id | Decision | Why |
|---|---|---|
| 9, 24, 79, 91 | actioned (were parked) | Their unpark conditions are met: task.188, task.222 and task.230 are merged, and the fix is in live code |
| 55, 58, 76, 44 | actioned | Already fixed by task.190, task.216, commit a4a86e7d and PR #668 |
| 51 | actioned | task.230 lifts misplaced sections and a corpus test guards it. The optional engine writer is not pursued |
| 89 | actioned | Tie-breaker added to auto-memory `feedback_tasks_go_through_pipeline.md` |
| 35 | declined | The omarchy skill is package-owned (`omarchy-settings`), so the route is upstream |
| 87 | still parked | task.227 is `planned` |

## Still open: proposed task clusters

Clustered by the decision each needs, not by the skill it was filed against. **PROSE** means skill or shared-resource
text only. **CODE** means an engine or script change that needs tests. Edit `shared/resources/` sources, never the
bundled `references/` copies.

| # | Cluster | Obs ids | Shape | Main files |
|---|---|---|---|---|
| 1 | **Test-infra leaks and gaps** (urgent: `/tmp` inodes were 72% used and still rising on 2026-10-23) | 83, 39, 62, 80 | CODE | test temp-dir helpers + a leak guard; `observation-log.test.mjs` scratch root; `qa-loop-lock-fields-parity.test.mjs`; `doc-links.js` anchors + CI |
| 2 | qa-fix: probes and moves | 16, 18, 20, 27, 42, 63, 13 (qa-fix half), 36, 56, 85 | PROSE | `skills/qa-fix/SKILL.md` Steps 2.6, 3.5, 4, 7; `mutation-proving.md`; develop-bug step-3 |
| 3 | review-task / create-task checks | 7, 13, 22, 25, 28, 29, 30, 60, 77, 78, 90 | PROSE | `skills/review-task/SKILL.md` Step 3 checks 2/11/13/15/20 + new checks, Step 6 check 4; review-story mirror; create-task § Success Criteria |
| 4 | QA-loop gate and escalation | 8, 14, 19, 41, 70, 71, 72, 11 (early warning), 45 | PROSE | `develop-pipeline-step-5-6-qa-loop.md` (5b 0a, 5c CONCERNS, escalation templates, convergence); resume contract (it contradicts itself on grant windows, :668 vs :694); both develop SKILL.md files |
| 5 | Finalise AC prompt and measured criteria | 31, 32, 33, 43, 82, 23 | PROSE | `finalise-dod-ac-prompt.md` (:45, :56); develop completion checklist; qa-task Step 5 / qa-story Phase 5 cite the quantifier rule |
| 6 | Finalise bug mode and publish boundary | 26, 37, 38, 40, 59 | CODE + PROSE | `fill-verification-complete.sh`; finalise bug-mode section, 7.1/8.1, 7.7, When to Use; 6a `ADD_PATHS` |
| 7 | Finalise CI re-run and probe inputs | 50, 61, 65, 81 | CODE + PROSE | finalise CI gate; `finalise-fix-and-recheck.mjs`; `security-probe-plan.mjs`; `finalise-dod-security-prompt.md` |
| 8 | security-probe engine | 12, 52, 68 (+ #58 residual) | CODE | `security-probe.mjs` (uniform-failure decline, shared fixtures, controlKey) |
| 9 | Snippet parsing and fence readers | 54, 67, 47, 48 | CODE + PROSE | `qa-execute-snippets.mjs` (`bash -n`, idempotent strip, quoted spans); `unbound-default-reads.test.js`; create-skill rules |
| 10 | qa-task gate writing and docs-only review | 15, 64, 74, 84, 86 | PROSE + CODE (84) | qa-task Steps 3b/3c/10, qa-story mirror; `stakeholder-summary.js` `open_count` slot |
| 11 | Pipeline lock and halt scripts | 46, 49, 75 | CODE | `advance-pipeline-lock.sh --restore` refuses gaps snapshots; a halt script; `reenter-qa-after-finalise.sh` message order |
| 12 | develop-next stale halt | 53, 66 | PROSE | `skills/develop-next/SKILL.md` Step 0.1a (recurred twice) |
| 13 | Develop orchestrator rules | 5, 6, 69, 92 | PROSE + small CODE (92) | step-3 Test Failure Triage; Step Transition Protocol; hooks doc on shadowing skills; `report-lint.js` suffix rule (#92's main scenario is already caught) |
| 14 | create-task multi-task path | 34 | CODE + PROSE | create-task §1.2; an issue-body render script for ensure-task-github-issue |
| — | **Needs your decision first** | 88 | — | Should skills show heredocs for bodies and generated scripts? 48 heredocs in 22 files |
| — | observe-work engine | 93 (new) | CODE | `observation-log.js`: name out-of-enum statuses; give `set-status` a repair path |

Each cluster is one `/create-task --from-observation <ids>` run, which parks its entries on the new task.
