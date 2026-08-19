# QA Report: Task 55 — Build the Jira comment endpoint and route the prose sites through it

**Task**: [task.55.tracker-comment-cli.md](./task.55.tracker-comment-cli.md)
**Gate File**: [task.55.gate.1.tracker-comment-cli.yml](./task.55.gate.1.tracker-comment-cli.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-19
**PR**: [#257](https://github.com/Gamaroff/agent-skills/pull/257)
**Gate Status**: **FAIL**

---

## Executive Summary

The design is sound and the implementation is close, but two verified HIGH correctness bugs cause **silent content loss** — the precise failure mode this task exists to eliminate. Neither is visible to the 1483 passing tests, and both were found by executing the shipped code rather than by reading it.

The irony is worth stating plainly: the task's own motivation is that *"a silent failure looks like success"*, and the marker bug reintroduces exactly that for whole comments.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED
**Quality Score**: 55/100

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All 8 implementation phases marked complete
- [x] Tests passing (1483/1483 node, 9 shell suites, validate:all 115)
- [x] Breaking changes documented (REST v2 → v3 ADF at the former `curl` site)
- [x] Code on feature branch with open PR #257

### Review Methodology

Parallel agents — the Adaptive Review Strategy's large/high-risk rule applies (8 phases, three top-level trees, `risk_level: high`). Three read-only Explore agents ran concurrently: an adversarial diff code review (Step 3b), a success-criteria verifier, and an NFR + regression analyst. Findings below are the union, deduplicated, **and each one independently re-verified by executing the shipped code** before being recorded.

> The success-criteria agent had not returned after 20 minutes. The gate was written without it because two agents had already produced mutually-corroborating, independently-confirmed HIGH findings, and delaying would only postpone the fix. Its scope overlaps what the other two established.

---

## Implementation Verification

| Phase | Status | Verified by | Notes |
|---|---|---|---|
| 0. ADF renderer extensions | **CONCERNS** | Executing the renderer | Works for the common case; two fence-parsing defects (QA-2, QA-3) |
| 1. `addComment()` | PASS | Code read + ADF round-trip | Correctly transcribes `putIssueAtomic`; deferral shape matches |
| 2. `tracker-comment.js` | **CONCERNS** | Execution + arg fuzzing | Contract honoured; `--stage` fails open (QA-4), stage unvalidated (QA-5) |
| 3. The marker | **FAIL** | Execution | Prefix collision suppresses comments (QA-1) |
| 4. Rewrite the sites | PASS | Independent recount | 24 occurrences across 15 files + 8 README mentions + the 25th site all routed |
| 5. Fold the `curl` site | PASS | grep | No `rest/api/N/issue/*/comment` outside a table row remains |
| 6. Parity guard | PASS | Mutation | 5 new assertions; the guard found the 25th site the inventories missed |
| 7. Tests, docs, bundle | **CONCERNS** | Coverage analysis | Green, but the Jira branch is untested (QA-6) |

**Overall**: 4/8 PASS, 3 CONCERNS, 1 FAIL.

---

## Issues Found

### HIGH Severity (2)

**QA-1 — Marker prefix collision silently suppresses whole comments**
- **Category**: Functional / correctness
- **Observation**: the search uses `COMMENT_MARKER_PREFIX + stage` as a **substring**, so `agent-skills-comment:review` matches an existing `review-story`, `review-task` or `review-bug` marker; `qa-cycle` matches `qa-cycle-2`. Verified live on both trackers.
- **Live collision**: `develop-pipeline-step-2-review.md` posts `--stage review` on the same issue `review-story/SKILL.md` already commented on with `--stage review-story`. The search returns count 1, the CLI reports `already`, and the Step 2 review comment is **never posted** — with an exit code of 0 and a log line saying it was already there.
- **Impact**: comments vanish silently. The exact harm the task was written to remove.
- **Recommendation**: search the full delimited marker. `markerHtml(stage)` is self-terminating (`<!-- … -->`); the Jira footer needs an exact text-node match rather than a substring.

**QA-2 — A multi-word code-fence info string swallows the rest of the document**
- **Category**: Functional / correctness (data loss)
- **Observation**: `RE_CODE_FENCE = /^\s*(`{3,}|~{3,})(\S*)\s*$/` requires a single-token info string, so ` ```js title="x" ` does not match. The opening line renders as prose, and the **closing** fence is then read as an opening one.
- **Verified**: `intro / ```js title="x" / const a=1; / ``` / tail prose` renders as `[paragraph "intro", paragraph "```js title=\"x\"", codeBlock "\ntail prose"]`. Everything after the block is absorbed and lost as prose.
- **Second-order**: it puts `RE_CODE_FENCE` in direct disagreement with the extractor's `RE_FENCE` (`:1108`), which *does* match that line — so section extraction believes it is inside a fence while the renderer believes it is prose. The comment block at `:1110-1126` warns about precisely this class of disagreement.
- **Recommendation**: capture only the first token as the language and tolerate the remainder; assert that anything matching `RE_FENCE` also matches `RE_CODE_FENCE`.

### MEDIUM Severity (5)

- **QA-3** — a 4-backtick fence is closed by a 3-backtick line; only the delimiter character is compared, never the run length. Not hypothetical: three shipped documents in this repo use 4-backtick fences to nest examples.
- **QA-4** — `--stage` **fails open**. A missing or flag-shaped value leaves `stage` undefined, the marker is dropped, and the comment re-posts on every resume. `--issue` and `--body-file` fail closed in the same situation; this asymmetry is the dangerous direction.
- **QA-5** — `COMMENT_STAGES` is never consulted at runtime. It is documentation enforced only by a prose-scanning guard that cannot see placeholders, shell variables, or downstream consumers.
- **QA-6** — the entire Jira branch (`runJira`, ~110 lines) and the gh post-failure path have **zero** tests. The stub defines a `postFails` knob no test ever passes, so the failure branch is dead code as far as CI is concerned.
- **QA-7** — the marker search is unpaginated at 100 comments on both trackers and truncation is undetected, so a marker beyond the window reads as absent and the CLI posts a duplicate.

### LOW Severity (5, documented only)

- An empty-rendering body (e.g. `---`) produces `{type:"text", text:""}`, which ADF rejects — Jira 400s and the run reports `unverifiable` instead of posting.
- `runJira` calls `getAuth()`, which reads `process.env` directly, while `run()` used the injected `env` — the two can disagree, and the Jira branch cannot be driven through the DI seam.
- A Jira issue key is interpolated into the REST path unvalidated and unencoded. Low risk (the key comes from local frontmatter), but it is the one unclean interpolation in an otherwise argv-array-clean file.
- `gh` stderr is discarded on a post failure, so the warning says only "Command failed" — the operator's only signal, stripped of its content.
- `adf.codeBlock`'s conditional spread always produces an `attrs` key, contradicting its own comment.

**Total**: HIGH 2, MEDIUM 5, LOW 5.

---

## NFR Assessment

### Security — PASS
No shell string ever carries body content: every subprocess is `execFileSync("gh", [array])` with no `shell: true`, the only `execSync` is a constant, and the body reaches `gh` via stdin and Jira via `JSON.stringify`. Redaction was confirmed to run **before** hashing and to cover `command.stdin` and `manual.fields[].value`. The visible Jira footer leaks nothing — a stage name from a fixed vocabulary, no key, URL, branch or credential. One unvalidated path interpolation (LOW, above).

### Performance — PASS
+3 round-trips per marked site (auth check, list, post) versus 1 before: about **+18 GitHub / +9 Jira** calls on a two-cycle run. Bounded and trivial against a pipeline already making dozens.

### Reliability — CONCERNS
Every anticipated failure path returns a `reason` and nothing throws uncaught — a journal it cannot write is a warning, never a licence to post. But `--stage` fails open (QA-4), the search is unpaginated (QA-7), and the Jira branch is untested (QA-6).

### Maintainability — CONCERNS
The duplicated marker **prefix** is genuinely guarded by a parity assertion. The three duplicated helper **functions** are not, and can drift until every marker search silently stops matching. `COMMENT_STAGES` is documentation rather than a constraint (QA-5).

---

## Regression Analysis

`textToAdfNodes` has exactly two in-repo callers; everything reaching a Jira card goes through `summariseSection` first. The **prose** branch collapses newlines, so a fence line cannot survive there — safe. The **list** branch preserves lines verbatim, and that is the live surface: a document whose criteria list embeds a fenced example now publishes as two lists split by a code block instead of one hard-break paragraph. Better output, but a real visual change on every re-sync of an existing card of that shape.

`capDescriptionAdf` handles a `codeBlock` structurally — it is shape-agnostic and drops whole top-level blocks, so no invalid ADF is produced. But it uses `continue`, not `break`, so it drops an oversized block from the **middle** while keeping later ones, under a notice claiming *trailing* omission. Pre-existing, but the fence branch makes it far likelier to fire: a long listing that previously fragmented into several sub-limit paragraphs is now one indivisible block that either fits or vanishes whole. Filed as a future action.

**Coverage gap that matters**: no pre-existing `jira-sync` or `sync-jira-*` test feeds fenced content through `textToAdfNodes` at all. The one adjacent test calls `blockToAdf` directly and never traverses the new branch. **The 1483 green tests are not evidence the fence branch is safe** — all three fence defects were found by running the renderer, not by a test.

---

## Test Artifacts

```bash
node --test shared/resources/tests/tracker-comment.test.mjs      # 30/30
node --test evals/shared/tests/transition-protocol-parity.test.mjs # 25/25
node --test 'skills/sync-jira-*/tests/*.test.js'                  # 311/311
npm run validate:all                                              # 115 passed
```

All green — see the coverage gap above for why that is not sufficient.

---

## Recommendations

### Immediate (blocking)
1. **QA-1** — search the full delimited marker on both trackers.
2. **QA-2** — tolerate a multi-word fence info string.
3. **QA-3** — compare fence delimiter length, not just the character.
4. **QA-4 / QA-5** — make every value-taking flag fail closed; validate the stage at runtime.
5. **QA-7** — detect marker-list truncation and degrade to `unverifiable`.
6. **QA-6** — cover the Jira branch and the post-failure path.

Each fix must land with a test that fails without it.

### Future (non-blocking)
1. `capDescriptionAdf` middle-drop and its false "trailing" notice.
2. Guard the three duplicated helper functions the way the prefix constant is guarded.
3. Surface `gh` stderr on a post failure.

---

## Final Assessment

**Gate**: **FAIL** — deterministic rule 1 (a `top_issues` entry of severity `high`).
**Rationale**: two verified HIGH bugs, both causing silent content loss, both invisible to a fully green suite.
**Deployment**: BLOCKED until QA-1 and QA-2 are fixed and covered by tests that fail without the fix.

The underlying work is good — the contract, the access gate, the cardinality rule and the parity guard are all sound, and the guard already earned its place by finding a call site three separate inventory passes missed. These are correctable defects in an otherwise well-built change.
