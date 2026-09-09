# Definition of Done Verification

**Task:** task.87.execute-table-cell-snippets
**Verification Started:** 2026-09-09 21:05
**Status:** IN PROGRESS

---

## Step 0: Method — and one deviation, stated up front

The four DoD checks (AC traceability, security, compliance, docs/changelog) are specified as four
parallel Explore subagents. **This session's operating instructions prohibit calling the Agent tool
unless the user requests it, so all four were performed inline.** Recorded here rather than left
implicit, because it changes what the evidence is: every citation below was produced by running a
command or reading a file directly, and none was produced by a subagent's summary of one.

No prior `## Definition of Done` block exists in the task body (`grep -cE` → 0), so this is run 1 and
nothing is inherited.

---

## Step 1: QA Report Review ✅

**QA Reports Found:** `task.87.qa.1.*.md` (cycle 1), `task.87.qa.2.*.md` (cycle 2)
**Gate Files Found:** `task.87.gate.1.*.yml`, `task.87.gate.2.*.yml`
**PR Review Report:** `task.87.pr-review.1.*.md` (Step 5c)

**Final Gate:** `task.87.gate.2.execute-table-cell-snippets.yml`
**Gate Status:** ✅ **PASS**
**Quality Score:** 100/100
**`top_issues`:** `[]` (empty)
**`waiver.active`:** false

**NFR validation (from gate 2):**

- Security: ✅ PASS — `evidence: measured`, `probes_executed: 14`
- Performance: ✅ PASS
- Reliability: ✅ PASS
- Maintainability: ✅ PASS

**`recommendations.immediate`:** `[]` — no blocking issues
**`recommendations.future`:** 2 — both accepted documented limitations, neither with a corpus instance

**`bug_resolution`:** 2 fixed, 0 remaining, 2 iterations

**Gate 1 is retained rather than overwritten**, so the CONCERNS(90) → PASS(100) history is legible on
disk. Gate 2 carries only its own cycle's findings, as the third-strike rule requires.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ **PASS** — 10/10
**PR Status:** OPEN (PR #365) · **PR Review Decision:** no formal GitHub review requested
(`reviewDecision` empty). Single-maintainer repository; the pipeline's substitute is Step 5c
`/review-pr` (⚠️ CONCERNS, its one finding fixed) plus two QA cycles with a gate. **Recorded as a
stated residual, not rounded up to APPROVED** — same handling as task.85.

Every criterion traced to **both** code and test by grep, not by reading a claim about it:

| # | Criterion | Code evidence | Test evidence | Status |
|---|---|---|---|---|
| 1 | Table-cell command extracted, classified, executed under both shells | `qa-execute-snippets.mjs` → `export function extractTableCellCommands` | `"a command column's backticked span is extracted with its row's line number"` | ✅ PASS |
| 2 | Task-77 predicate is a shell-disagreement finding (mutation proof) | `channel: "status"` | `"MUTATION PROOF: the task-77 predicate in a table cell is a shell disagreement"` | ✅ PASS |
| 3 | No change for fenced blocks (document with no command column) | `origin: "fence"` | `"a document with no tables produces the pre-change report exactly"` | ✅ PASS |
| 4 | `\|` unescaped before execution; one span = one unit | `export function unescapeCell` | `"an escaped pipe is unescaped before the code becomes shell"` | ✅ PASS |
| 5 | `origin` on every result, visible in the report | `origin: block.origin` | `"origin is carried onto every result and onto findings"` | ✅ PASS |
| 6 | `zero-blocks-executed` still fires when nothing runs | `zero-blocks-executed` | `"zero-blocks-executed still fires when nothing runs, cells included"` | ✅ PASS |
| 7 | A pipe inside a code span is content (TASK87-001) | `function splitOnDelimiters` | `"TASK87-001: an unescaped pipe in a SIBLING cell no longer drops the command"` | ✅ PASS |
| 8 | An escaped backtick is literal (TASK87-002) | `line[i + 1] === "\`" && spanLen === 0` | `"TASK87-002: two escaped backticks no longer collapse the row"` | ✅ PASS |
| 9 | Corpus surface measured and recorded | — (process criterion) | Measurement table in the implementation report and both QA reports; 182 files → 4 affected, 42 blocks, 0 findings | ✅ PASS |
| 10 | Full `npm run ci` green | — (process criterion) | `CI_EXIT=0`, 2983 pass / 0 fail, `eval:all` and `format:check` both ran | ✅ PASS |

**Mutation proof — the seven-mutation matrix.** Baseline 127 pass / 0 fail. A un-merge extractor
**4 fail** · B no `unescapeCell` **4 fail** · C no status channel **2 fail** · D no code-span awareness
**5 fail** · E no unclosed-span fallback **1 fail** · F no escaped-backtick branch **2 fail** · G no
`spanLen` guard **1 fail** · restored **127/0**. G was `mutation-proven: no` on first attempt — a
vacuous test, reported as a QA finding rather than quietly repaired.

---

## Step 2b: CI Status — the hard gate

**`CI_ROLLUP` = ✅ SUCCESS**, sampled on head `585b3136`, which equals local `HEAD`.

Per-job conclusions, recorded so the decision is auditable:

| Job | status / conclusion |
|---|---|
| `test` | COMPLETED / SUCCESS |
| `validate` | COMPLETED / SUCCESS |
| `link-check` | COMPLETED / SUCCESS |
| `shellcheck` | COMPLETED / SUCCESS |
| `PR into main comes from an allowed branch` | COMPLETED / SUCCESS |

**The gate did its job rather than being a formality.** The first sample read **PENDING** — `test` was
`IN_PROGRESS` with `conclusion: ""` — and acceptance was withheld. Three further samples 30s apart
still read PENDING; the fourth read SUCCESS. Had the empty-string case been read as green, this run
would have accepted on a job that had not finished.

**Residual, stated:** the Step 8 commit that lands this DoD summary, the sprint-review summary and the
`CHANGELOG.md` entry is **docs-only on top of the tested commit**. `develop-next`'s merge gate runs the
full `npm run ci` on the final branch state before merging, which is where that commit is verified. A
green run on an ancestor commit is evidence about that commit, and saying so is the point.

---

## Step 3: Security Review

**Story Type:** infrastructure / internal tooling
**Overall Security Status:** ✅ **PASS**
**Evidence:** `measured` · **`boundary: true`** · **`probes_executed: 12`** (this step) — **26 across
the task**

`boundary: true` is not a formality here: the deliverable feeds a **fail-closed allow-list**, and the
change makes the engine execute strictly *more* shell than before. So the boundary was probed by
running candidates against the shipped code, not by reading it.

**12 candidates executed through the new table-cell path, each attempting to reach `runnable` with a
mutating command. 0 reproduced.**

| Candidate | Verdict |
|---|---|
| `rm -rf /tmp/pwned` | refused — `deny-list: rm -rf` |
| `echo x \| rm -rf /tmp/pwned` (escaped pipe) | refused — `deny-list: rm -rf` |
| `echo x \| rm -rf /tmp/pwned` (**unescaped** pipe — exploits the new code-span rule) | refused — `deny-list: rm -rf` |
| `env rm -rf /tmp/pwned` (command-runner prefix) | refused — `deny-list: rm -rf` |
| `echo $(touch /tmp/pwned)` | refused — `unrecognised-command: touch (fail-closed)` |
| `awk 'BEGIN{system("touch /tmp/pwned")}'` | refused — `unrecognised-command: awk (fail-closed)` |
| `sed 's/a/b/w/tmp/pwned' /dev/null` | refused — `deny-list: sed w write` |
| `echo x > /tmp/pwned` | refused — `write-redirection` |
| `source /tmp/evil.sh` | refused — `unrecognised-command: source (fail-closed)` |
| `curl -s https://example.com` | refused — `unrecognised-command: curl (fail-closed)` |
| `gh pr list --limit 1` | refused — `unrecognised-command: gh (fail-closed)` |
| `` `` echo `rm -rf /tmp/pwned` `` `` (multi-backtick) | refused — `deny-list: rm -rf` |

✅ **The boundary held** — every candidate returned its expected verdict. Sandbox containment confirmed
separately: `/tmp/pwned` absent afterwards.

The three probes specifically constructed against the **new** handling — the escaped-pipe, unescaped-pipe
and multi-backtick routes — are the ones that matter, because the other nine would have been refused
before this change too.

**General security:**

- No credentials, tokens or secrets added — `git diff` scanned, 0 matches for `api[_-]?key|token *=|password`
- No network calls added; `gh` and `curl` remain absent from the allow-list in every form
- The safety boundary is **untouched** by this diff: `SAFE_COMMANDS`, `COMMAND_RUNNERS`,
  `DENY_PATTERNS`, `classifyBlock`'s body and the sandbox sentinel are absent from both `+` and `-`
  lines, verified by grep
- The new `looksLikeCommand` whitespace bound fails toward running **less**, and is a noise bound
  sitting behind the allow-list rather than beside it

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ **NOT_APPLICABLE**
**Applicable areas:** None.

| Area | Applicable | Reason |
|---|---|---|
| GDPR / data protection | No | No personal data is read, stored or transmitted. The change parses markdown in the repository |
| PCI-DSS | No | No payment path |
| WCAG / accessibility | No | No UI. Output is a CLI report |
| HIPAA | No | No health data |
| Data retention | No | The only writes are to a per-run `mkdtemp` directory, removed in a `finally` |

Internal developer tooling with no user-facing surface. `NOT_APPLICABLE` counts as a pass in the
decision matrix.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ **PASS** — after closing one gap this check found.

| Item | Status | Evidence |
|---|---|---|
| Canonical spec updated | ✅ PASS | `shared/resources/qa-runnable-prose-detection.md` §1 scope widened, new §1a (table cells, both pipe rules, the escaped-backtick guard, two limitations), §3 rewritten for both disagreement channels |
| Bundled copies regenerated | ✅ PASS | `npm run bundle`; all 6 differ from source only by the `AUTO-GENERATED` banner, checked with `diff` per copy |
| Task Change Log | ✅ PASS | 9 rows, newest at the bottom, `Version` bumped only where the spec allows |
| Frontmatter `updated` | ✅ PASS | `updated: 2026-09-09`, bumped in the same edits as the log rows |
| **`CHANGELOG.md`** | ✅ **PASS — gap found and closed by this check** | See below |

**The gap, and why the sweep was worth running.** A behaviour change to the QA gate is exactly what
`CHANGELOG.md`'s live `## [Unreleased]` section exists for, and it had no entry. Added: what the gate
now sees, the task-77 defect that motivated it, the two pipe rules and why the second was a regression
from the first, the `channel` addition, and the corpus measurement. Nothing else in the pipeline would
have caught this — the QA gate scores the code, not the repository's release notes.

**The sweep also produced four false positives, and leaving them alone is the correct action.**
`docs/development/project-completion-roadmap.md`, `task.67.*`, `task.79.implementation.1.*` and
`task.97.qa.1.*` all describe the gate as fenced-only. Every one is a **dated historical record** of
what a past task or QA cycle found. Rewriting them would falsify the record to tidy a grep result. A
live spec gets corrected; a log entry does not.

`.agents/handoff.md` mentions `qa-execute-snippets` only as a load-flaky suite, which is still true and
needs no edit.

---

## Step 5: Acceptance Decision

**Decision:** ✅ **ACCEPTED**

| Decision matrix column | Source | Result |
|---|---|---|
| All Acceptance Criteria Met? | `AC_OVERALL` | ✅ PASS — 10/10, each with code **and** test evidence |
| Tests & PR Approved? | Step 5c `/review-pr` | ⚠️ CONCERNS — non-blocking by the verdict table; its one finding fixed. No human reviewer exists in this repo; recorded as a residual, not as a pass |
| **CI green?** | `CI_ROLLUP` | ✅ SUCCESS — 5/5 jobs, on a head equal to local `HEAD` |
| Docs Updated? | `DOCS_OVERALL` | ✅ PASS — after this check found and closed the `CHANGELOG.md` gap |
| Security Passed? | `SEC_OVERALL` | ✅ PASS — `measured`, 12 probes here / 26 across the task, 0 reproduced |
| Compliance Passed? | `COMP_OVERALL` | ⚠️ NOT_APPLICABLE — counts as a pass |
| QA Gate Status? | `task.87.gate.2` | ✅ PASS (100/100), `top_issues: []`, no waiver |

**No section returned `NEEDS_MANUAL_REVIEW`.**

**Outcome:** the task meets every Definition of Done criterion. Two residuals are recorded rather than
resolved, and neither is a gap: no human PR reviewer exists in this repository, and the Step 8 docs
commit will sit on top of the CI-verified commit (covered by `develop-next`'s merge gate).

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-09-09 21:15

**Artifacts Generated:**

- ✅ Task document updated — `status: accepted`, `completed_date`, `pr_number: 365`, DoD PASSED section, Change Log row (Version 1.2)
- ✅ Sprint Review summary created — `sprint-review-summary.md`
- ✅ `CHANGELOG.md` `[Unreleased]` entry added (gap closed by the docs check)
- ✅ Canonical PR comment posted (idempotent via `<!-- finalise-canonical-summary -->`)
- ✅ Tracker issue #364 — Document link re-pointed to `develop` (the feature branch is deleted at
  merge, so a closed issue would otherwise link to a dead branch); completion comment `reason: posted`;
  issue closed and **verified `CLOSED`** by read-back rather than inferred from the close call
- ✅ GitHub project board — `done` stage returned `reason: "already"` (`from: "Done"`). Success, not a
  warning: closing the issue had already moved the card, so no mutation was needed

**Next Steps:**

- Task is ready for Sprint Review.
- `develop-next` Step 3 merges PR #365 after running the full `npm run ci` merge gate, which is what
  verifies the docs-only finalise commit.
- **`develop-next` Step 4 needs care on this item**: the selection came from the **task-registry
  fallback frontier**, not a roadmap phase, so there is no roadmap row to tick. The registry row is
  the equivalent artifact. This is a known gap — observation #13 and task.103.
