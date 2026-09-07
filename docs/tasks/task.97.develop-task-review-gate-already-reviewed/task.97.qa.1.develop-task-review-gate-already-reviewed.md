# QA Report: Task 97 — /develop-task Step 2 review gate

**Task**: [task.97.develop-task-review-gate-already-reviewed.md](./task.97.develop-task-review-gate-already-reviewed.md)
**Gate File**: [task.97.gate.1.develop-task-review-gate-already-reviewed.yml](./task.97.gate.1.develop-task-review-gate-already-reviewed.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-07
**QA Cycle**: 1 of max 5
**PR**: [#350](https://github.com/Gamaroff/agent-skills/pull/350)
**Gate Status**: FAIL

---

## Executive Summary

The change is well-built where it is built — the helper is pure, fast and genuinely mutation-proved, §9's "develop-story unchanged" claim verifies exactly, and the full suite is green at 2755/2756. **But the freshness rule that authorises the new skip can be driven to `fresh` for a genuinely stale report by four independent, ordinary markdown constructs.** That is precisely the over-correction §10 names as *worse* than the halt this task removes, and it falsifies §9's criterion that a report older than the document's `updated:` still runs the review.

All seven routes were reproduced by executing the module, not inferred from reading it.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All 4 implementation phases completed and verified against the diff
- [x] Tests passing — 2756 tests, 2755 pass, 0 fail, exit 0
- [x] Breaking changes documented (none — §5 states none; verified, `develop-story` untouched)
- [x] Code on feature branch with open PR (#350, OPEN)

### Testing Approach

- [x] Automated testing (full suite + targeted protocol suites)
- [x] Adversarial input testing (the freshness rule, executed against hostile input)
- [x] Regression testing (develop-story protocol + shared parity suites)
- [x] Security review (purity claim verified empirically)
- [x] Code review (Step 3b, read-only Explore subagent over the branch diff)
- [x] Mutation re-proof (independent — QA did not trust the developer's claim)
- [x] Documented-command execution (Step 4b)

### Review Methodology

Direct tools plus one read-only Explore subagent for the Step 3b diff review. The Adaptive Review Strategy's default ("direct tools first; spawn agents if gaps found") was upgraded to include the agent from the start, because the task's own §10 names a specific failure mode — an over-permissive skip — that is only findable by adversarial execution, not by reading.

**Deliberately not trusted, and re-verified from scratch:**

| Claim under test | How QA checked it | Result |
| --- | --- | --- |
| "8/8 mutations proved red" | Applied an independent mutation (`if (reportDate >= taskDate)` → `if (true)`) | ✅ 1 test went red — the suite does catch the most dangerous regression |
| "§9: `develop-story` tables unchanged" | Byte-compared every `#### develop-story` section against `origin/develop` | ✅ identical, 74 lines |
| "the helper is pure, no mtime" | Grepped comment-stripped source for every fs/exec API | ✅ zero `require` calls, no I/O |
| "a green suite is evidence" | — | ❌ **correctly not trusted**: the suite is green and six defect classes are uncovered |

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1 — Establish the actual cause | PASS | Verified | `## Phase 1 Record` present; records conditional reachability, the two blocking gates, and — correctly — what could not be determined |
| Phase 2 — Define "current review report" | **CONCERNS** | Partial | Helper + 27 tests exist and are mutation-proved, but the rule itself is defeatable — see Issues Found |
| Phase 3 — Fix the tables and the message | **CONCERNS** | Partial | All four edit sites present and both ⚠️ notes added, but the post-review table is non-exhaustive (TASK97-007) |
| Phase 4 — Align the surrounding prose | PASS | Verified | `SKILL.md:248` rewritten; eval scenario + fixtures corrected; bundle regenerated and idempotent |

**Overall Phase Completion**: 4/4 complete, 2 with defects.

---

## Success Criteria Verification

| Criterion (§9) | Target | Actual | Status |
| --- | --- | --- | --- |
| Phase 1 records the reachability result with evidence | Yes | Yes, incl. undetermined items | PASS |
| `planned` + current report reaches Step 3 without a ruling | Yes | Yes | PASS |
| `planned` + no report still runs the review | Yes | Yes (`absent`) | PASS |
| **`planned` + report older than `updated:` still runs it** | Yes | **Defeatable 4 ways** | **FAIL** |
| `planned` + unparseable report date still runs it | Yes | Yes — except when the "unparseable" text is itself picked up (TASK97-002) | CONCERNS |
| A review that produces no report still HALTs | Yes | Yes for the no-report case; **not** for a pre-existing stale report (TASK97-007) | **FAIL** |
| Halt message names the failed precondition | Yes | Yes, three facts + config pointer | PASS |
| Freshness from content, not mtime; verified in a fresh clone | Yes | Yes — no fs API at all | PASS |
| Divergence from the resume-contract mtime rule stated | Yes | Yes | PASS |
| `/develop-story` tables unchanged | Yes | Yes — byte-identical | PASS |
| New test file executed by `npm test` | Yes | Yes — glob verified | PASS |
| Resource carries a `Draft`-shaped note | Yes | Two ⚠️ notes | PASS |
| Every new test mutation-proved | Yes | Yes for what it covers — but nothing covers the six broken classes | CONCERNS |

**13 criteria: 9 PASS, 2 CONCERNS, 2 FAIL.**

---

## Issues Found

### HIGH Severity (3) — all reproduced by execution

Against a task with `updated: 2026-06-01`, each of these returns `{verdict: "fresh"}` for a report genuinely dated `2026-01-01` or purely illustrative:

**TASK97-001 — HTML comments and indented code blocks are not blanked**
`blankFences()` handles fenced code only. Both of these yield `fresh` with `reportDate: 2030-01-01`:
- `# R\n<!--\n**Reviewed:** 2030-01-01\n-->\n\n**Reviewed:** 2026-01-01\n`
- `# R\n\nFormat example:\n\n    **Reviewed:** 2030-01-01\n\n**Reviewed:** 2026-01-01\n`

Both are ordinary ways to show *a picture of* the header — exactly what the fence-blanking comment says it exists to prevent. *(Found independently by QA and by the diff review.)*

**TASK97-002 — `\s*` spans newlines, so the date need not be on the label's line**
`**Reviewed:**\n2030-01-01 was the previous revision\n\n**Reviewed:** 2026-01-01` → `fresh`, `2030-01-01`. A bare label adopts the next date-shaped token anywhere below it. Fence-blanking compounds it: intervening fenced content collapses to blank lines, closing the gap.

**TASK97-003 — fence run length is not tracked, so a shorter delimiter closes a longer opener**
The CommonMark rule is the opposite. A ```` block wrapping a ``` example — how this repo writes markdown-about-markdown — leaks the illustrative date:
`` # R\n\n````\n```\n**Reviewed:** 2030-01-01\n````\n `` → `fresh`, `2030-01-01`.

### MEDIUM Severity (5)

- **TASK97-004** — `splitFrontmatter()` treats any leading `---` as frontmatter and closes on the first `\n---`, so a document opening with a thematic break has its **body prose parsed as frontmatter**. A body `updated: 1999-01-01` is returned as the task date — an artificially old task date makes every report current. Duplicate `updated:` keys are last-wins.
- **TASK97-005** — dates are shape-validated, never range-validated. `2026-99-99` parses and lexically outranks every real date, so such a report is `fresh` **permanently**. This is the check that makes "string order is date order" actually safe.
- **TASK97-006** — no `m` flag and `.` not matching `\r` means **every** frontmatter line fails on a CRLF document; `taskUpdatedDate()` returns null. The tie-break makes that *safe* (`stale`), but it silently disables the whole escape hatch on a CRLF checkout — which is the "permanently unstartable card" this task exists to remove, reintroduced in a different guise and with nothing reporting why.
- **TASK97-007** — **the prose reintroduces the permissive skip the code refuses.** The post-review `Planned` rows cover "report exists and is current" and "no report at all", but not a **pre-existing stale** report where the re-run writes none. The Handling Findings bullet then says "Planned unchanged, but a report exists → proceed" with no freshness qualifier. A decision table in a prose deliverable must not be non-exhaustive.
- **TASK97-008** — the eval scenario passes vacuously: all four assertions are satisfied by the untouched replay fixtures. It cannot distinguish a skip from a run, so it does not guard the behaviour its own description names. *(This is an improvement on what was there — the previous single assertion was equally vacuous — but it is not yet a behavioural test.)*

### LOW Severity (2)

- **TASK97-009** — the header's "IT NEVER THROWS" is false for a throwing getter on the input object. Exotic, but it is the contract the gate relies on.
- **TASK97-010** — plain-object frontmatter with a key pattern matching `__proto__` / `constructor`.

**Total: HIGH 3, MEDIUM 5, LOW 2.**

> No bug report files were created. Every finding is a defect in code introduced by *this* change set and is being fixed in the same pipeline run (Step 5b), not handed to a separate owner — a bug file per finding would be an artefact nobody reads. They are tracked in the gate's `top_issues[]`, which is what the fix loop consumes.

---

## Code Review (Step 3b)

Read-only Explore subagent over `git diff origin/develop...HEAD`. Findings are advisory by default (`code_review_blocking` not set by the orchestrator and absent from frontmatter) — **but seven of them were promoted to `top_issues[]` on their own merit**, because they falsify stated §9 success criteria rather than merely being code smells.

**Correctness bugs (10):** the ten listed above.

**Cleanups (5):**

- `develop-pipeline-step-2-review.md` — the documented snippet hardcodes `require("./.agents/skills/develop-task/references/…")`, but this resource is bundled **byte-identically into `develop-story`**, so a develop-story install is told to require a path it does not have. Every other engine invocation in the same file uses the `{develop-story|develop-task|develop-bug}` placeholder.
- `review-report-freshness.js:102` — all three arms of the `blankFences()` `if (m)` return `""`; only the state mutation differs.
- `review-report-freshness.js:143` — `reportReviewedDate()` runs the full key/value frontmatter parse and discards it; a `stripFrontmatter()` would make "frontmatter is never consulted" structural rather than a comment.
- `tests/…:110, 212` — a redundant `notEqual` after an `equal`, and a determinism test that would pass for a function returning a constant.
- `develop-pipeline-step-2-review.md:44` — the table requires "current" for `Planned` but bare "Yes" for the two promoted states, and the surrounding prose argues staleness applies generally. Deliberate or oversight is not distinguishable as written.

**Verified sound (the agent tried and could not break these):** blockquoted and table-cell `**Reviewed:**` lines are correctly ignored; a properly matched equal-length fence blanks correctly; an unterminated fence only ever removes candidates (safe); `**Review Date:**` never wins over `**Reviewed:**`; `>=` on well-formed ISO is correct; a timestamped or oddly-quoted `updated:` falls to `stale`; neither regex backtracks catastrophically; and the snippet's `node -e` argv indexing, quoting and empty-argument handling are all correct.

### Mutation-proof spot check (Step 3c)

| Behaviour | Mutation applied by QA | Result |
| --- | --- | --- |
| Freshness comparison | `if (reportDate >= taskDate)` → `if (true)` | ✅ **red** (1 test) |

`mutation-proven: yes` for the comparison — the suite catches the single most dangerous regression. **But note the asymmetry**: the suite is mutation-proved for the behaviours it covers and has no case for any of the six defect classes above. Mutation-proving establishes that existing tests are not vacuous; it says nothing about coverage that was never written.

---

## Step 4b — Documented Command Execution

The diff modifies `shared/resources/develop-pipeline-step-2-review.md`, a shared-resource protocol document containing 8 fenced `bash` blocks, so the rule fires.

```
8 blocks: 0 runnable, 4 placeholder, 4 mutating
```

**Finding reported by the engine — recorded, not suppressed:** `zero-blocks-executed` (medium) — "none classified runnable (4 placeholder, 4 mutating)".

Per-block breakdown, with every skip and its reason:

| Line | Class | Reason |
| --- | --- | --- |
| 19, 24, 158, 169 | placeholder | template slot (`{task-directory}`, `{id}`, …) |
| **54** | **mutating** | **`unrecognised-command: node` (fail-closed)** — the block added by this change |
| 126, 277, 296 | mutating | write-redirection |

`--bind` was attempted with the correct slot names and did **not** reclassify the placeholders: a `{…}` slot makes a block `placeholder` *by definition* in §2 of the rule, so those four are documentation templates the engine can never execute. The new block at line 54 is refused because `node` is not on the safe-command allow-list — fail-closed, and no configuration changes that.

Shells: bash and zsh both available (`zshAvailable: true`).

**QA ran the one test the engine could not, by hand** — the zsh glob hazard on the gate-check `ls`, which this change makes load-bearing (a report now authorises a *skip*, not just a log line):

| Case | bash stdout | zsh stdout | Verdict |
| --- | --- | --- | --- |
| Reports exist | the report path | the report path | agree |
| No reports | *(empty)* | *(empty)*, plus a stderr diagnostic | **agree** |

Unlike the task.66 multi-glob defect, a single-glob `ls` degrades identically: zsh aborts the command but the pipeline still yields empty stdout, which is the same answer bash gives, and stdout is the load-bearing signal. **No defect.**

---

## NFR Assessment

### Performance — PASS
200k-space adversarial line: 3ms. 1M-line document: 58ms. No catastrophic backtracking — `\s` and `[-*]` are disjoint so each backtrack is O(1), and the `m` flag limits start positions to line starts.

### Reliability — FAIL
The module's core decision can be driven to the **unsafe** verdict by four independent ordinary markdown constructs. A fifth produces an artificially old task date; a sixth silently disables the feature on CRLF checkouts. The design intent — "every ambiguity resolves to `stale`" — is correct and is stated in the header; these six paths resolve to `fresh` instead.

### Security — PASS
The purity claim was verified rather than accepted: zero `require` calls, and no `statSync`/`stat`/`mtime`/`readFile`/`existsSync`/`openSync` in comment-stripped source. No network, no process spawn. The fresh-clone property genuinely holds because the module cannot reach the filesystem at all.

### Maintainability — CONCERNS
The 27 tests are real and mutation-proved, but **they and the defects do not intersect** — there is no case for HTML comments, indented blocks, nested fences, cross-line matching, CRLF, or impossible dates. The prose decision table is non-exhaustive. The documented snippet hardcodes a path for a file that ships to two skills.

---

## Regression Testing

| Area | Check | Result |
| --- | --- | --- |
| `develop-story` pipeline | Every `#### develop-story` section byte-compared to `origin/develop` | PASS — identical |
| `develop-story` Draft HALT | Row still present | PASS |
| Protocol suites | `evals/develop-{task,story}/protocol/*` + `evals/shared/tests/*` | PASS — 290/290 |
| Full suite | `npm run ci:fast` | PASS — 2755/2756, 0 fail, exit 0 |
| Bundle freshness | `npm run bundle` re-run | PASS — idempotent, all skills in sync |
| Eval scenario | `node evals/shared/runner.mjs …/02-review-task` | PASS — 4/4 (but vacuously; see TASK97-008) |

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast                                              # 2755/2756 pass, 0 fail
node --test shared/resources/tests/review-report-freshness.test.mjs   # 27/27
node --test 'evals/develop-task/protocol/*.test.mjs'          # 12/12
node --test 'evals/develop-story/protocol/*.test.mjs' 'evals/shared/tests/*.test.mjs'  # 290/290
node evals/shared/runner.mjs evals/develop-task/step-isolation/02-review-task          # 4/4
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-step-2-review.md --json
```

---

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 70/100
**Deployment Recommendation**: BLOCKED

**Rationale**: The task set out to make a correct-but-unrecoverable gate recoverable, and §10 named the way that could go wrong: *"a skip rule that is too permissive develops against an unreviewed card, which is a worse failure than the halt."* Four ordinary markdown constructs produce exactly that, and the prose adds a fifth route the code would have refused. The work is otherwise strong — and the reason this is catchable at all is that the design intent is written down precisely enough to test against.

**Conditions to clear**: TASK97-001/002/003 fixed and each mutation-proved; TASK97-007 closed so the prose cannot authorise a skip the code refuses.

---

**Next Steps**: `/qa-fix` (Step 5b, cycle 1) against `top_issues[]`, then re-review.
