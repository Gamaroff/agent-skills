# Observation review — 2026-10-27

Second `/observe-work --review` run. The previous one was [2026-10-23](./2026-10-23-observation-review.md). The
backlog held 79 open and 10 parked entries, #5–#110. Checked against `develop` @ `49a69f42`.

## Decided this review

| Id | Decision | Why |
|---|---|---|
| 39, 62, 80, 83 | actioned (were parked) | task.231 merged (PR #752) and accepted. Fix confirmed in code: `scripts/test-tmpdir.mjs`, `tests/tmp-leak-ratchet.json`, `doc-links.js` `[no-anchor]` |
| 87 | actioned (was parked) | task.227 merged (PR #746) and accepted |
| 97 | actioned (was parked) | task.232 merged (PR #748) and accepted. `security-probe.mjs` has `removed` |
| 98 | actioned (was parked) | task.233 merged (PR #751) and accepted. Commit `251b10e4` |
| 103 | actioned (was parked) | task.235 merged (PR #761) and accepted. `select-next.mjs` holds `externalBlock` rows |
| 104 | actioned (was parked) | task.236 merged (PR #763) and accepted |
| 109 | actioned (was parked) | task.237 merged (PR #767). Option 1 applied. You declined option 2 on 2026-10-27 (task.237 § Scope) |
| 107 | superseded by #45 | Test half fixed (`seed-step-block.test.js` counts `out.shells.length`). The CI-read half is #45's defect, so the recurrence was appended to #45 |

Nothing was staged. Skill changes in this repo go through `/create-task`, as in the last review.

## Still open: task clusters

The cluster numbers match the 2026-10-23 table. Cluster 1 is done (task.231). **New** marks ids added since then.
**PROSE** means skill or shared-resource text only. **CODE** means an engine or script change that needs tests. Edit
`shared/resources/` sources, never the bundled `references/` copies.

| # | Cluster | Obs ids | Shape | Main files |
|---|---|---|---|---|
| 2 | qa-fix: probes and moves | 16, 18, 20, 27, 42, 63, 13 (qa-fix half), 36, 56, 85 | PROSE | `skills/qa-fix/SKILL.md` Steps 2.6, 3.5, 4, 7; `mutation-proving.md`; develop-bug step 3 |
| 3 | review-task / create-task checks | 7, 13, 22, 25, 28, 29, 30, 60, 77, 78, 90, **108**, **105** (create-task half) | PROSE | `skills/review-task/SKILL.md` Step 3 checks; review-story mirror; create-task § Success Criteria. #108: check plan fixture literals against `tests/no-consumer-names.test.js` |
| 4 | ~~QA-loop gate and escalation~~ **cut 2026-10-27** | 8, 14, 41, 45 → task.238 (#768); 19, 70, 71, 72 → task.239 (#769); 11 closed (already fixed by the `fence:` probe form, PR #560) | — | Entries parked on their tasks |
| 5 | Finalise AC prompt and measured criteria | 31, 32, 33, 43, 82, 23, **105**, **110** | PROSE + small CODE (110) | `finalise-dod-ac-prompt.md`; finalise CI reading 1 resolves a `DEFERRED-CI` criterion (#110) |
| 6 | Finalise bug mode, publish boundary, machine-written records | 26, 37, 38, 40, 59, **100**, **99** | CODE + PROSE | `fill-verification-complete.sh` (also writes `Completion Time`, #100); `status-history.js` column-count check (#99); finalise 6a `ADD_PATHS` |
| 7 | Finalise CI re-run and probe inputs | 50, 61, 65, 81, **96** | CODE + PROSE | finalise CI gate; `finalise-fix-and-recheck.mjs`; `security-probe-plan.mjs`; `DOD_N` counts every `dod.N.*` file (#96) |
| 8 | security-probe engine | 12, 52, 68, **102** | CODE | `security-probe.mjs`; probe-test mutants out of the scanned tree (#102). Sequence after task.234 (planned, same file) |
| 9 | Snippet parsing and fence readers | 54, 67, 47, 48 | CODE + PROSE | `qa-execute-snippets.mjs`; `unbound-default-reads.test.js`; create-skill rules |
| 10 | qa-task gate writing and docs-only review | 15, 64, 74, 84, 86 | PROSE + CODE (84) | qa-task Steps 3b/3c/10, qa-story mirror. #84 still live: `GATE_MEANING.PASS` (`stakeholder-summary.js:29`) |
| 11 | Pipeline lock, halt scripts, background calls | 46, 49, 75, **94** | CODE | `advance-pipeline-lock.sh --restore`; halt script; `reenter-qa-after-finalise.sh`; tree-equivalence block backgrounded and its child group killed (#94) |
| 12 | Stale resume and halt state | 53, 66, **95** | PROSE + small CODE | develop-next Step 0.1a; develop-task / develop-story check a resume prompt against run state (#95) |
| 13 | Develop orchestrator rules | 5, 6, 69, 92 | PROSE + small CODE (92) | step-3 Test Failure Triage; Step Transition Protocol; hooks doc; `report-lint.js` |
| 14 | create-task multi-task path | 34 | CODE + PROSE | create-task §1.2; issue-body render script |
| — | **Needs your decision** | 88, **106** | — | Should shipped skills show heredocs for bodies and generated scripts? Your global instructions already forbid heredoc payloads, and #106 is a run that hit that conflict. Recommendation: yes, remove them (#106's shape: bundled poll script + file-write tool for JSON) |
| — | observe-work engine | 93 | CODE | `observation-log.js`: name out-of-enum statuses; give `set-status` a repair path |

Each cluster is one `/create-task --from-observation <ids>` run, which parks its entries on the new task.

## Family coherence

meta-skills (`observe-work`, `autoskill`, `remember-insight`, `double-check`): coherent. `families --audit` reports no
gaps.

## Arrived during this run

None. The re-scan before marking showed the same 90 entries and no id above #110.
