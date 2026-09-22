# QA Report: Task 139 - The Change Log engine is unreachable from a skill whose prose runs it

**Task**: [task.139.change-log-engine-reachability.md](./task.139.change-log-engine-reachability.md)
**Gate File**: [task.139.gate.3.change-log-engine-reachability.yml](./task.139.gate.3.change-log-engine-reachability.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-22
**Testing Completed**: 2026-09-22
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3 reviews what landed **after** 5c approved: the obs #154 addition (`shared/resources/doc-links.js`, its test file, and edits to `review-task`, `review-story`, `finalise`), plus the line-63 quotation fix and the "41"→42 corrections. The original task deliverable is unchanged since gate.2. The new engine is the right shape but ships three medium/high defects — a fence state machine that a line-initial backtick run desyncs (task.42's document parses to **0 links**, so the corpus guard passes vacuously on it), cwd-relative `git ls-files` (5 false dead links when launched from a skill directory), and `process.exit` after stdout writes (the repo's exit-after-write guard is red now that the file is tracked) — and the two review-skill blocks read an unbound variable and address the engine by a path the create-skill rule forbids. Five entries promoted; six advisories.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: BLOCKED until TQ-1, CR-1..CR-4 are fixed and re-reviewed

---

## Re-Review Context

Re-review scope: since 2026-09-22T06:04:46Z (gate.2; default narrowing — `SAFETY_REPROBE=false`, security `OK reasoned`). 12 files changed since the gate (bundle re-renders excluded); the scoped diff is 1,617 lines.

| Prior item | Status | Verification |
| --- | --- | --- |
| gate.2 (PASS 100) — no open entries | n/a | — |
| 5c PC-1 "41" → 42 | **FIXED** | `grep -c '41 bundl'` → 0 |
| finalise gap — line 63 quoted link | **FIXED** | `doc-links.js` on the document → `ok`, 5 relative links resolve; CI `link-check` on `5022ad02` pending at review time |

---

## New Findings This Cycle

Scoped review (files changed since gate.2). Reviewer exercised the engine against the corpus and 12 edge-case strings and ran the corpus guard.

**Promoted (bug, high confidence):**
- **[medium/high]** `shared/resources/doc-links.js:214` — `process.exit(main(...))` after stdout writes (bug.3 class); repo guard red under `ci:fast`. (TQ-1 — from Step 4, not the reviewer)
- **[medium/high]** `shared/resources/doc-links.js:46` — `FENCE_RE` opens a fence on any line-initial backtick run; task.42's document → 0 links, corpus guard vacuous on it. (CR-1)
- **[medium/high]** `shared/resources/doc-links.js:97` — `git ls-files` without `--full-name`; from `skills/review-task` the task doc reports 5 false dead links. (CR-2)
- **[medium/high]** `skills/review-task/SKILL.md:797`, `review-story:927` — `$TASK_FILE` / `$STORY_FILE` unbound (the skills use `$TASK_FILE_PATH` / `$STORY_FILE_PATH`) → `--file ""` → usage exit 2. (CR-3)
- **[medium/high]** `skills/finalise/SKILL.md:2359` + 3 sites — bare `node references/doc-links.js` where the repo rule requires `.agents/skills/{skill}/references/…` from the root; MODULE_NOT_FOUND from the root. (CR-4)

**Advisory:**
- **[medium/medium]** `finalise` 8a clause satisfies `inside-files-summary` by declaration; the "When this step applies" sentence still says CI red never qualifies. (CR-5)
- **[low/high]** reference-style definitions, HTML anchors, nested brackets, spaced/quoted/parenthesised targets not extracted. (CR-6)
- **[low/medium]** code-span stripping is line-scoped; a wrapped backticked quotation is reported dead. (CR-7)
- **[low/low]** the "not a git repo" fixture inherits the parent repo when `TMPDIR` is inside a worktree. (CR-8)
- **[cleanup]** `--root`/`--file` without an operand throws instead of usage exit 2. (CR-9)
- **[cleanup]** KNOWN keyed on `file:line` is brittle. (CR-10)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phases 1–4 (original deliverable) | PASS | unchanged since gate.2 | 4/4 parity tests green |
| obs #154 addition (engine, tests, skill prose) | CONCERNS | 5/5 engine tests green but vacuous on task.42 (CR-1); exit-after-write guard red (TQ-1) | see findings |

---

## Success Criteria Verification

SC1–SC7 unchanged from gate.2 (all PASS). The addition has no criteria of its own in § 9; its acceptance is the corpus guard + the review-skill and finalise prose being executable as written — which CR-3/CR-4 show they are not yet.

---

## Breaking Changes Validation

None declared; none found (the engine is additive; the review/finalise prose adds a check). PASS.

---

## Issues Found

### HIGH Severity Issues (0)
### MEDIUM Severity Issues (6)
TQ-1, CR-1, CR-2, CR-3, CR-4 (promoted), CR-5 (advisory — medium confidence).
### LOW Severity Issues (5)
CR-6..CR-10 (advisory).

**Total Issues**: HIGH: 0, MEDIUM: 6, LOW: 5

---

## NFR Assessment

### Performance — PASS
Corpus guard 0.3 s after sharing the tracked set.
### Reliability — CONCERNS
CR-1 and CR-2 both make the engine report clean when it did not look — the failure mode it exists to remove.
### Security — PASS
- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0 (`boundary: false` — the engine classifies links, not inputs that gate an action)
### Maintainability — PASS

---

## Code Review

Step 3b — blocking, scoped (cycle 3). 8 bugs + 2 cleanups; 4 promoted from the reviewer + 1 from the test run (TQ-1). Provenance: all in files added on this branch.

**Mutation proofs (Step 3c)**:
- mutation-proven: code-span stripping removed → "extractor: a quoted relative link in prose IS a link…" red → `covered`
- mutation-proven: tracked-tree resolution replaced by `null` → "resolver: against a git repo it is the TRACKED tree…" red → `covered`
- mutation-proven: task doc line 63 reverted → corpus guard red naming line 63 → `covered`

**Step 4b**: fired on the three changed SKILL.md files — with `--bind` for the document path: 1 runnable block each, 0 findings; remaining placeholders are pre-existing template slots.

**Working tree after QA**: unchanged from entry (implementation report only).

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` | **FAIL** — 3895/3896; `guard: no NEW file adopts exit-after-write` (TQ-1) |
| `npm run bundle:check` | PASS — 129 skills, 0 problems |
| `shared/resources/tests/doc-links.test.mjs` | PASS 5/5 (vacuous on task.42 — CR-1) |

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast
npm run bundle:check
node shared/resources/doc-links.js --file docs/tasks/task.42.change-log-spec-and-engine/task.42.change-log-spec-and-engine.md --json   # links: 0 (CR-1)
(cd skills/review-task && node references/doc-links.js --file ../../docs/tasks/task.139.…/task.139.….md)                                # 5 false dead (CR-2)
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/{review-task,review-story,finalise}/SKILL.md --json --bind …
```

---

## Recommendations

### Immediate Actions (Blocking)
1. TQ-1 — `process.exitCode`.
2. CR-1 — CommonMark fence rules; fence-open-at-EOF is a finding; fixture with a line-initial backtick run.
3. CR-2 — repo-root anchoring (`git rev-parse --show-toplevel`, `ls-files --full-name`); test from a subdirectory.
4. CR-3 + CR-4 — root-anchored `.agents/skills/{skill}/references/doc-links.js` with the `{resolved … path}` placeholder at all four sites.

### Short-term Actions (Non-Blocking)
CR-5..CR-10; carried C2-CR-1..4 and 5c CR-1/CR-2.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Five medium/high defects in the addition landed after 5c; the original deliverable is unchanged and green.
**Quality Score**: 50/100

**Deployment Recommendation**: BLOCKED
**Conditions**: TQ-1, CR-1..CR-4 fixed and re-reviewed.

---

**QA Report**: co-located at `task.139.qa.3.change-log-engine-reachability.md`
**Gate File**: co-located at `task.139.gate.3.change-log-engine-reachability.yml`
**Next Steps**: `/qa-fix` on gate.3; cycle 4 re-review.
