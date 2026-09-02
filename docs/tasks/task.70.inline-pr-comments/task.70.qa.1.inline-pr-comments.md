# QA Report: Task 70 — Build the inline PR comment primitive, on GitHub and Bitbucket

**Task**: [Link](./task.70.inline-pr-comments.md)
**Gate File**: [task.70.gate.1.inline-pr-comments.yml](./task.70.gate.1.inline-pr-comments.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-02
**Gate Status**: FAIL → **PASS** after qa-fix cycle 1

---

## Executive Summary

All five implementation phases are present and the design is sound, but the module violates its own core invariant on two paths, and the wiring that connects it to the two review skills cannot execute as written. CI is red on a repository guard that exists to prevent exactly the legacy pattern this file copied.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (5/5 checkboxes ticked)
- [x] Tests passing locally at the time of authoring
- [x] Breaking changes documented (none — additive)
- [x] Code on feature branch with open PR (#308)

### Review Methodology

Direct tools for phase and criteria verification, plus **one independent Explore subagent** for the Step 3b diff code review. The subagent was the right call and is the reason this gate is not a PASS: the code was written by the same pipeline reviewing it, and three of the four highest-severity findings came from the independent lens, not from the self-check. The subagent verified two of them by executing `runGithub` directly rather than by reading.

**Re-review scope**: N/A — first review, whole-branch diff.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| 1: Contract and CLI skeleton | CONCERNS | Verified | Contract written and re-run rule decided before transport code, as required. But the contract documents a stale-anchor degradation the code does not implement (TASK70-008). |
| 2: GitHub path | FAIL | Partial | Batched review, per-comment fallback and head-SHA handling are correct. The duplicate-marker path drops a finding (TASK70-001) and id collisions overwrite one (TASK70-002). |
| 3: Bitbucket path | CONCERNS | Verified (fixtures) | Payload shapes correct, including `from` for deletions. No marker read at all, so every re-run duplicates (TASK70-007). |
| 4: Wire into review skills | FAIL | Not verified | Both jq snippets are wrong against the real findings schema (TASK70-004, TASK70-005) — the path cannot post a single finding. |
| 5: Tests | CONCERNS | 40/40 green | Suite is strong on the degradation paths it covers, and both mandated mutation proofs hold. It is silent precisely on the branch that loses data (TASK70-009). |

**Overall Phase Completion**: 5/5 present, 2 FAIL / 3 CONCERNS

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Valid `file_line` posts inline on GitHub | Yes | Yes — batched review verified by stub | PASS |
| Same works on Bitbucket via `inline` | Yes | Payload shape verified by fixture | PASS |
| A finding outside the diff degrades, never dropped | Always | **Violated** on the duplicate-marker path | **FAIL** |
| GitHub posts one batched review, not N | Yes | Verified — 0 per-comment calls on success | PASS |
| `--dry-run` resolves everything, posts nothing | Yes | Verified with throwing transports | PASS |

### Contract

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Exit codes and `reason` vocabulary match `tracker-comment.js` | Match | Match (0/1/2), verified via spawned binary | PASS |
| `--body-file` only, no inline `--body` | 0 occurrences | 0 | PASS |
| CLI resolves `$VCS` itself | Yes | Yes, on the VCS axis not TRACKER | PASS |

### Code Quality

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Formatting | prettier clean | Clean | PASS |
| Local hermetic suite | green | **1 failure** (`stdout-drain-on-exit` guard) | **FAIL** |
| CI `test` job | green | **red** | **FAIL** |
| Mutation proofs (2 mandated) | both red on revert | Both, plus 2 more | PASS |

---

## Breaking Changes Validation

None declared, none found. The change is additive: both review skills retain summary-comment behaviour as the fallback. **PASS.**

---

## Issues Found

### HIGH Severity (5)

All five are detailed with reproduction in the gate file. In brief:

- **TASK70-001** — duplicate-marker path drops the finding entirely (no inline, no summary, body never printed). The adjacent unreadable-list branch *does* degrade, so this is an asymmetry, not a design choice.
- **TASK70-002** — two findings on one line share an identity; a re-run PATCHes the same comment twice and the second body destroys the first, both reporting `updated`.
- **TASK70-003** — `process.exit()` after a write; the repo guard for new files is red in CI.
- **TASK70-004** — `body: .summary` reads a field the schema does not define; the CLI exits 2 and every finding is lost.
- **TASK70-005** — `.code_review[]` iterates wrapper values, not findings; jq aborts.

### MEDIUM Severity (4)

TASK70-006 (handover verify asymmetry), TASK70-007 (no Bitbucket marker read), TASK70-008 (stale anchor reported `updated`), TASK70-009 (test gap on the losing branch).

### LOW Severity (3, advisory)

- Summary comment carries no marker — a five-cycle qa-fix loop leaves five near-identical summary comments.
- Under a restricted mode, `summaryPrefix` is never journalled; the empty-input short-circuit also sits above the access gate, so a zero-finding restricted run reports `posted` rather than `deferred`.
- The unreadable-list case surfaces as run reason `partial`, while the contract lists it under `unverifiable`.

**Total**: HIGH 5, MEDIUM 4, LOW 3

---

## Code Review

Step 3b, one independent Explore subagent over the whole-branch diff. **Blocking** — the develop-task pipeline sets the run-level `code_review_blocking` override, and the task frontmatter does not opt out. All `bug` + `confidence: high` findings were promoted to gate `top_issues[]`.

**Correctness bugs (11)** — the five HIGH and four MEDIUM above, plus two LOW. Full text, failure scenarios and suggested actions are in the gate file.

**Cleanups (7, advisory):**
- `pr-inline-comment.js` — `repoRootOf` uses `execSync` while everything else uses the injectable `execImpl`, so it always touches real git in tests that omit `repoRoot`.
- `pr-inline-comment.js` — a new `RegExp` is compiled per comment, with the prefix interpolated unescaped; hoist one module-level constant (three copies of the literal exist).
- `pr-inline-comment.js` — `finishRun` takes both `skipCode` and `strict`, two spellings of one fact.
- `pr-inline-comment.js` — the non-anchor rejection branch still says "rejected the anchor", mislabelling a 403 or 500 in text a human reads.
- `pr-inline-comment.js` — `await res.text()` runs where `res` may be null, surviving only on a swallowed TypeError.
- `pr-inline-comment.js` — `loadDotEnv` writes `process.env` while `bbAuthHeader` reads the injected `env`; `tracker-comment.js` documents having already fixed this exact divergence.
- `review-pr/SKILL.md` — the `--inline` call omits `--summary-file`, producing a second bare comment beside the summary review-pr already posts.

### Mutation-proving (Step 3c)

Four proofs were executed during development, each turning exactly its own assertion red and each restored to green:

| Behaviour reverted | Result | mutation-proven |
|---|---|---|
| 422 degradation removed | 3 tests red | yes |
| Bitbucket `from` → `to` on deletions | 1 test red | yes |
| `await postSummary` un-awaited | 1 test red | yes |
| Whitespace id sanitisation removed | (fix added with its test) | yes |

**No proof exists for the duplicate-marker path**, and TASK70-009 explains why: the test asserts the reason and the absence of a PATCH, never that the text was delivered. A test that cannot fail on the defect is not coverage.

---

## Step 4b — Documented Command Execution

Both wired skills contain runnable prose, so the step fired.

| File | Blocks (base → head) | runnable | Verdict |
|---|---|---|---|
| `skills/review-code/SKILL.md` | 3 → 4 | 0 → 0 | pre-existing |
| `skills/review-pr/SKILL.md` | 12 → 13 | 0 → 0 | pre-existing |

`zero-blocks-executed` is raised on both, but it is a **pre-existing property** of both files, not introduced here: every block in each — before and after — classifies `mutating` (write-redirection, `rm -rf`, unrecognised `.` source). The one block this change added to each classifies identically to its neighbours. Recorded as information, not a finding.

**This step did not catch TASK70-004/005, and could not** — the snippets are skipped as mutating, so their jq was never executed. That is the gap TASK70-005's suggested action names: a fixture-driven jq assertion would have caught both before CI.

---

## Regression Testing

| Area | Result |
|---|---|
| `handover-render` + `handover-verify` (kind count 23→24) | 72/72 PASS |
| Repo-level guards (`tests/*.test.js`) | 127/127 PASS |
| Shared resources suite | 904/905 — the one failure is TASK70-003 |
| `review-code` / `review-pr` contract suites | 63/63 PASS |

No regressions introduced. The kind registration is clean.

---

## Test Artifacts

```bash
npm run ci:fast                                            # green pre-commit, red post-commit (see below)
node --test 'shared/resources/tests/*.test.mjs'            # 904/905
node --test 'tests/*.test.js'                              # 127/127
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/review-code/SKILL.md --json
gh run view 33665630998 --log-failed
```

> **Why the local gate passed and CI did not.** `stdout-drain-on-exit.test.mjs` enumerates shipped CLI
> sources from the **tracked** tree. When `npm run ci:fast` ran during development the new file was
> still untracked, so the guard did not see it; CI checks out only tracked files and went red
> immediately. Re-running the identical command after the commit reproduces it locally. This is the
> known asymmetric-failure shape the repo already documents — a working-tree gate cannot see a file
> git does not yet know about.

---

## Recommendations

### Immediate (Blocking)

1. **TASK70-001** — degrade on duplicate markers instead of dropping. This is the invariant.
2. **TASK70-002** — make finding ids unique per finding, and reject duplicate keys in `parseFindings`.
3. **TASK70-003** — `process.exitCode` + return, clearing CI.
4. **TASK70-004 / 005** — fix both jq snippets against the real schema, and add a fixture-driven assertion so they are executed rather than read.

### Short-term (Non-blocking)

1. TASK70-006 — resolve the GitHub verify asymmetry.
2. TASK70-007 — Bitbucket marker read, or scope the contract's re-run table to GitHub and say so.
3. TASK70-008 — implement the stale-anchor degradation the contract already promises.
4. TASK70-009 — close the test gap on the losing branch.

---

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 50/100
**Deployment Recommendation**: BLOCKED

**Rationale**: The architecture, contract and platform handling are genuinely good, and the mutation discipline is better than most work that reaches this gate. But a module whose entire purpose is "a finding is never dropped" drops one on a reachable path, the id scheme both destroys findings and arms that path, and the wiring cannot deliver a single finding as written. None of these is a design problem — all five HIGH issues are local, well-understood fixes.

**Conditions to clear**: TASK70-001 through TASK70-005 resolved, and the CI `test` job green.

---

**Next Steps**: `/qa-fix` on the five HIGH issues, then re-review. The four MEDIUM issues should be addressed in the same cycle where cheap; TASK70-007 may legitimately be resolved by narrowing the contract rather than by writing the Bitbucket marker read.


---

## Bug Resolution Summary — qa-fix cycle 1 (2026-09-02)

All 9 issues resolved in one cycle. Every fix is mutation-proven: the behaviour was reverted and the
named test confirmed red, then restored to green.

| ID | Fix | Verification |
|---|---|---|
| TASK70-001 | The duplicate-marker branch now pushes to `degraded`, so an ambiguous marker still delivers the finding via the summary comment. Ambiguity is a reason not to touch existing comments, never a reason to discard. | §4 test now asserts the finding **text** reaches the summary. **Mutation A**: remove the degrade → §4 red. |
| TASK70-002 | The derived id is anchor **plus** an 8-char body hash, so two findings on one line no longer share an identity. | New §4 test: two findings on `src/a.ts:12` keep both bodies. **Mutation B**: drop the hash → 2 tests red. |
| TASK70-003 | `process.exitCode` and return, replacing `process.exit()`. | Repo guard green; a §9 test asserts the module states its own contract (matching a call, not a mention in a comment). |
| TASK70-004 | `body: (.finding + "\n\n→ " + .suggested_action)` — `.summary` was never a schema key. | Executed against a fixture. |
| TASK70-005 | `.code_review.findings[]?` / `.pr_conformance.findings[]?` — `.[]` iterated the wrapper's values. | **New permanent guard** in both skill test suites extracts the jq from SKILL.md and runs it against a schema-shaped fixture. **Mutation C**: restore the broken jq → red. |
| TASK70-006 | Deferred records carry `target.inline: true`; the GitHub verify recipe returns `UNRELIABLE` for them rather than reading conversation comments where an inline comment never appears. | `handover-verify` suite green. |
| TASK70-007 | The Bitbucket arm now scans `GET …/comments` for markers and `PUT`s the match. Duplicate markers degrade; an unreadable list degrades. | Two new §3 tests. **Mutation D**: remove the update branch → §3 red. |
| TASK70-008 | Stale anchors (`position: null`, or a moved line/path) degrade instead of being PATCHed and reported `updated`. Contract updated to state this is GitHub-only — Bitbucket has no equivalent signal. | New §4 test. |
| TASK70-009 | The test gap that let TASK70-001 ship is closed, plus same-anchor collision and Bitbucket idempotency coverage. | Suite 40 → 46 tests. |

### LOW issues also resolved

- The summary body is journalled under a restricted access mode; the empty-input short-circuit now fires only when there is genuinely nothing to post, so a summary-only run defers rather than reporting `posted`. New §5 test.
- `await res.text()` is guarded rather than relying on a swallowed `TypeError`.
- The non-anchor rejection branch no longer mislabels a 403 or 500 as an anchoring problem in text a human reads.
- One hoisted, escaped `MARKER_RE` replaces three copies of the literal and a per-comment `RegExp` compile.

### Deliberately not done

- **Summary-comment marker + update-in-place** (LOW). A real improvement — five qa-fix cycles leave five near-identical summary comments — but it changes the summary's identity semantics and belongs in its own change rather than at the end of a fix cycle.
- **`loadDotEnv` threading the injected `env`** (cleanup). The divergence is real and `tracker-comment.js` documents having fixed it; the fix touches credential resolution, which is worth its own diff.

**Revised gate**: PASS · **Quality Score**: 95/100 · **Deployment**: APPROVED
