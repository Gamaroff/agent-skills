# Implementation Report: finalise's diff fallback is one commit, and its gap body leaks a marker

**Task**: `task.321.finalise-diff-and-gap-body.md`
**Run Number**: 1
**Started**: 2026-11-28 11:41
**Status**: In Progress
**Report format**: 2

---

## Summary

Give `/finalise` one reader for the PR's whole change (`finalise-diff.sh`) that names its source or refuses, and end `dod-gap-count.sh --body` at the change-log marker.

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
| Board status        | In Progress ✅ (work-started → transitioned)                               |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.321.*` exists in git                             | Branch created at `1fd2cc223`; pushed with tracking | —                    | 2026-11-28T11:42Z |
| 2. review-task             | ✅ Done    | `task.321.review.{N}.{name}.md` exists (or skip logged)               | `task.321.review.1.finalise-diff-and-gap-body.md` — READY TO IMPLEMENT 8/10; 0 critical, 3 important fixed; Planned → Ready for Development | —                    | 2026-11-28T11:58Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan names every hunk); 17 files, 21 tests; `ci:fast` 9045/0 fail after a format-only re-run; develop-complete posted | —                    | 2026-11-28T12:15Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #969: https://github.com/Gamaroff/agent-skills/pull/969 | —                    | 2026-11-28T12:22Z |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.321.qa.{N}.*.md`; `task.321.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted | 3 cycles: CONCERNS 90 → CONCERNS 90 → PASS 96; 5c `/review-pr` APPROVE (0 findings) | —                    | 2026-11-28T13:21Z |
| 7. finalise                | ✅ Done    | `task.321.dod.{N}.*.md`; task `status: accepted`                      | `task.321.dod.1.finalise-diff-and-gap-body.md` — ACCEPTED; acceptance commit `f60bacdf1` | —                    | 2026-11-28T13:45Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Implementation report final commit | —                    | 2026-11-28T13:46Z |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-28

- Dispatched by `/develop-next` (item T321, source `task-registry`) with `--defaults`; autonomous run.
- Phase 0 run inline (path given): no 0a-parallel agents dispatched. Lite-mode inputs derived from the document: risk_level `low`, phase_count 4, single_module false → PIPELINE_MODE `standard`.
- Feature branch base: develop — source: recommended (`--defaults`, no question asked)
- PR target branch: develop — source: recommended (`--defaults`, no question asked)
- Mode: standard — source: detector. Skips: none. Refused: none.
- AskUserQuestion: 0 questions (`questions[]` empty under `--defaults`).
- qa-planning gate: skipped (auto — no prompt)
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Task status at start: `planned` — proceeding; Step 2 `/review-task` validates and promotes.
- Tracker: github, issue #941.
- Branch: `feature/task.321.finalise-diff-and-gap-body` from `develop` (`1fd2cc223`). Implementation report stashed before branch creation, restored after.
- Tracker comment `work-started`: posted. GitHub board: work-started → transitioned.
- Priority-default block not run at Step 1; review-task's `set-github-project-priority.sh 941` then set the board Priority to P2.

### Step 2 — review-task

- review-task ran (status `planned`, no review report existed). Output format: Comprehensive report (pipeline default).
- Pre-pass B: `aligned` (axes source `architecture`); pre-pass C: `not-implemented`.
- Step 8.5 auto-answered: Yes, apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete → `ready-for-development`.
- Fixes: I1 prompts' own status words (no `NEEDS_MANUAL_REVIEW` token exists); I2 fix-evidence check 5 reads `<DIFF_FILE>.names`; I3 eleven pattern-pinning tests listed; O1 anchor `:1281`→`:1345`; O2 criterion names its test. Plan file corrected for I1/I2.
- Review report: `docs/tasks/task.321.finalise-diff-and-gap-body/task.321.review.1.finalise-diff-and-gap-body.md`; `reviewed_blob` stamped.
- Review outcome comment skipped — review-task reported `posted` (stage `review-task-1`).
- Tracker key unchanged (941 at Step 1) — no work-started re-fire.

### Step 3 — develop

- Plan file found: `docs/tasks/task.321.finalise-diff-and-gap-body/task.321.plan.finalise-diff-and-gap-body.md` — included as implementation context for /develop.
- Pre-develop surface map: inline (independence loss recorded) — `finalise-diff.sh` (new), `skills/finalise/SKILL.md` Steps 3a/3e, the AC/docs/fix-evidence prompts, `dod-gap-count.sh`, three test files.
- Step 3 inline — /develop not invoked: the plan names every hunk. Inline path owes /develop's Task Completion Checklist; written below.
- Phase 3 test-first: the marker cases were red (4 of 5; the parity floor green) before the rule, green after.
- Phase 1 was **not** test-first: the script was written before `finalise-diff.test.mjs`, whose cases were green on first run. Each rule was mutation-proven instead, each alone and restored:
  - exclusion lookup disabled → "a bundled copy is excluded …" and "every changed file is a bundled copy …" red (bash + zsh);
  - `[ ! -s "$OUT" ]` empty-patch rule disabled → "every changed file is a bundled copy …" red;
  - forge-arm empty check disabled → "the branch adds nothing and the forge diff is empty" red;
  - `dod-gap-count.sh` marker rule disabled → "--body stops at every start marker …" and "--body keeps a fenced marker …" red;
  - the marker rule's `!infence` dropped → "--body keeps a fenced marker …" red.
- Beyond the plan: an executed-prose case cuts Step 3a's diff lines out of `SKILL.md` and runs them in bash and zsh for merge-base, forge, unresolved and a usage error (exit 2 → HALT, no `**PR diff:**` line).
- `SRC_DIR="shared/resources"` held in a variable: the literal `shared/resources/${rel}` read to the bundler as a file to bundle (`bundle:check` warned). The bundled copy was not rewritten (only `.md`/`.js` are), so behaviour was unaffected.
- shellcheck at the lane's `--severity=warning`: clean. One SC1091 info (`pr-read.sh` not followed), the same as `pr-read.sh`'s own sourcing.
- Fast gate iteration 2: `npm run test:remote` (`ci:fast`), GATE_RC=0 — 9045 tests, 9042 pass, 0 fail, 3 skipped. CHANGELOG placement: base 987 bullets below the first release heading, new 987 — ok. develop-complete comment: posted.

### Step 4 — create-pr

- Base pre-supplied: develop. Three commits, scoped: `615fea202` gap body, `0cfc949a9` diff reader and wiring, `d7eb2ce2c` task records + CHANGELOG (the implementation report's first commit). The first commit used `BUNDLE_PRECOMMIT_WARN=1`: the hook flagged the untracked `finalise-diff.sh` copy, which belongs to the second commit.
- PR body written by the orchestrator, not the summariser subagent (this session wrote the change).
- PR #969: https://github.com/Gamaroff/agent-skills/pull/969. Lock `pr_url` set; develop-next run state `prNumber: 969`.
- Tracker comment `in-review`: posted. GitHub board: in-review → stage-disabled.
- Post-PR state check: PR #969 state = OPEN (read inline with `gh pr view`, not the poller subagent). errors = 0.

### Steps 5–6 — QA loop

- QA Cycle 1 — gate CONCERNS (90), 2 open (1 medium, 1 low). Route: continue (not-a-pass-gate). Convergence check: one reading, cannot trip.
- QA Cycle 1 — changes-requested: disabled (`stage-disabled`).
- QA Cycle 1 — qa-fix: fix commit `6230df1b1` carries the fix, gate 1 and QA report 1; push-policy `qa-cycle` → push (code changed). `ci:fast` on the LAN server 9050 tests, 0 failed. qa-fix PR comment and `qa-fix-1` tracker comment: posted.
- A `qa-read-back.js` run before the fix commit HALTed (`the newest QA gate row comes before a qa-fix row`). That check reads the 5a state, and the loop runs it only before a 5c commit; it had passed at 5a. Committed without it.
- QA Cycles 2–3: see QA Iteration History. 5c `/review-pr --no-code` APPROVE; the report rode the acceptance commit.

### Step 7 — finalise

- Preconditions `ok`; record-criteria `ok`; re-run-at-head `not-configured`; re-run scope `full (no-prior-record)`.
- PR diff via `finalise-diff.sh`: `source=merge-base base=1fd2cc2234e2 head=19c106141e6f files=21 excluded=7`. The new reader judged its own PR.
- DoD agents: AC PASS 11/11 (extracted, verified); security PASS; compliance NOT_APPLICABLE; docs PASS.
- Security: the DoD agent recorded `boundary: true` for `dod-gap-count.sh`, where QA had `internal`. QA's reason named no `path#export` entry, which Step 3c forces to FAIL. Probe plan (2 entries, 7 inline cases) run by /finalise: 14 executed, 0 reproduced, 0 escapes, 0 refusals.
- CI reading 1: SUCCESS @ `19c106141e6f` over 6 checks; CI reading 2: SUCCESS (tree-equivalent to `19c106141e6f`) @ `f60bacdf164f` over 6 checks.
- Registry tick: `ticked` (planned → accepted), `staged`. 6d: CHANGELOG cites (task 321).
- Acceptance commit `f60bacdf1` (DoD, sprint review, AC record, security records; registry ticked; 5c review carried), pushed; 6b assertions passed.
- PR canonical comment posted (#issuecomment-7240123442). Tracker: Document link already on `develop`; `done` comment posted; issue #941 CLOSED (verified); board `done` → `already`.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 3 fast gate, iteration 1 — failed at `format:check`**, before any test ran: Prettier flagged the three test files this run wrote (`finalise-dod-prompt-contract.test.mjs`, `finalise-diff.test.mjs`, `finalise-gaps-path.test.mjs`). The background command had reported exit 0 because a trailing `echo` owned the exit code; the log's own `rc=1` showed the failure. Fixed with `prettier --write` on the three files, then `prettier --check .` was clean; gate re-run with its own exit code.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-11-28
**Gate Result**: CONCERNS
**Issues Found**: 2 — T321-CR-101 (medium: the Step 3e cleanup reads `$DIFF_FILE` with no writer in its own shell, deleting `./.names` and leaving both state files); T321-CR-102 (low: the forge patch keeps bundled copies the contract says it leaves out). Both reproduced by execution.
**HIGH findings**: 0
**MEDIUM findings**: 1
**Traceability**: skipped (no Success Criteria table)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

#### qa-fix (5b)

- Findings ingester not dispatched: both findings were already in this session's context from the cycle-1 gate it wrote. Independence loss recorded.
- **T321-CR-101 (medium):** Step 3a now writes to a fixed `.claude/state/finalise-pr.diff`, and Step 3e binds the same path in its own block and runs `rm -f -- "${DIFF_FILE:?}" "${DIFF_FILE:?}.names"`. Test first: `finalise-diff.test.mjs` "Step 3e binds the same DIFF_FILE path Step 3a writes" and "[bash|zsh] Step 3e, run in its own shell, removes what Step 3a wrote and nothing else" were red (3 of 3), then green. Mutations: dropping the Step 3e bind → all 3 red; Step 3a back to `pr-diff-$(date +%s)` → all 3 red. Both restored. The contract test's source-text check of the old `rm` line was removed; the executed test holds it now.
- **T321-CR-102 (low):** documented, not filtered. The forge arm has no head tree to look a source up in, so a filter would exclude by another rule. The header, Step 3a's prose, the AC prompt and the fix-evidence prompt now say the patch leaves the copies out only on `source=merge-base`. New test "[bash|zsh] source=forge keeps a bundled copy in the patch as well as the names".

```
Probe: comm -23 <(git grep --full-name -l -F -i -e '<phrase>' -- SKILL.md / references / shared .md,.sh) <(generated copies), phrases: "without bundled", "without those copies", "leaves the copies out", "leaves out bundled", "excluded from the patch"
  shared/resources/finalise-diff.sh — updated (header line 7, Bundled copies paragraph)
  skills/finalise/SKILL.md — updated (Step 3a prose)
  shared/resources/finalise-dod-ac-prompt.md — updated (Step 3 rule 1)
  shared/resources/finalise-dod-fix-evidence-prompt.md — updated (paths paragraph, check 5)
  docs/tasks/task.321…/task.321.finalise-diff-and-gap-body.md:507 — unaffected — describes the merge-base exclusion and the forge fallback, claims nothing about the forge patch's copies
  CHANGELOG.md — updated (outside the command's population; first recorded as unaffected, then read and found to state the rule)
Population: 4 (5 with CHANGELOG.md)
Move: patch — the four sites state one contract of one script; each now points at the `source=` line the script prints, which is the one definition.
```

### QA Cycle 2 — 2026-11-28
**Gate Result**: CONCERNS
**Issues Found**: 2 — T321-CR-201 (medium: the AC and fix-evidence prompts read Step 3a's `**PR diff:**` line, which no agent receives; introduced by cycle 1's CR-102 fix); T321-CR-202 (low: the merge-base patch takes the host's git config, reproduced). Cycle 1's CR-101 verified fixed.
**HIGH findings**: 0
**MEDIUM findings**: 1
**Traceability**: skipped (not re-run — cycle 2)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

#### qa-fix (5b)
- T321-CR-201: `<DIFF_LINE>` added to the AC, docs and fix-evidence dispatch rows (`skills/finalise/SKILL.md` Step 3b) and read by the AC and fix-evidence prompts in place of "Step 3a's `**PR diff:**` line". `**PR diff:** {DIFF_LINE}` added to the story/task Append 1 template and the bug template's Step 2 block, and the idempotent re-run replaces that one line (CR-2's half). Held by three new `finalise-dod-prompt-contract.test.mjs` tests: they went red before the fix (3), and red again under mutation (bug row without `<DIFF_LINE>`, and Append 1 without the slot: 2 red), then were restored.
- T321-CR-202: the merge-base `git diff` calls pin `--no-color --no-ext-diff --no-textconv --no-relative --src-prefix=a/ --dst-prefix=b/`; `gh pr diff` passes `--color=never`. Held by "[bash|zsh] a hostile user git config does not reach the patch": red before (ANSI escapes), green after, and red again with `PIN` removed from the patch diff.
- Local result: 133 of 133 in the three task suites; `bundle:check` 0 problems; shellcheck clean; validate passes for finalise, review-story and review-task.

```
Population: 3 dispatch sites (AC, docs, fix-evidence) + 2 Step 2 templates
Move: patch — the placeholder rule is now held for every DoD prompt by a test that reads the dispatch table, not by a list
```

### QA Cycle 3 — 2026-11-28
**Gate Result**: PASS
**Issues Found**: 0 gating — T321-CR-201 and T321-CR-202 verified fixed; 3 low cleanups recorded as future work (CR-301 to CR-303)
**HIGH findings**: 0
**MEDIUM findings**: 0
**Traceability**: skipped (not re-run — cycle 3)
**PR Review**: APPROVE — task.321.pr-review.1.finalise-diff-and-gap-body.md (conformance lens only, 0 findings)
**Loop exit**: route 1 — clean PASS gate
**Action**: 5c APPROVE — proceeding to Step 7

---

## Completion

**Finished**: 2026-11-28T13:46Z
**Final Status**: Completed
**Branch**: `feature/task.321.finalise-diff-and-gap-body`
**PR**: #969 — https://github.com/Gamaroff/agent-skills/pull/969
**QA Iterations**: 3
**DoD Summary**: `task.321.dod.1.finalise-diff-and-gap-body.md` — ACCEPTED
**Tracker debt**: none
