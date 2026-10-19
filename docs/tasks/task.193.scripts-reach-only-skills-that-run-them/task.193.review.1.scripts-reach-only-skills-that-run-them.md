# Task Review Report: Task 193 - Scripts reach only the skills that run them

**Reviewed:** 2026-10-19
**reviewed_blob:** 4b7da92d6c31a6d958b9233cc475bf08e0d6dd13
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD (after fixes)

> **Implementation Status**: ✅ All 4 critical + important recommendations implemented — 2026-10-19

---

## Executive Summary

The task is well scoped and its incident is real: six skills carry `grant-qa-cycles.sh`, four never run it. Two
defects in the test specification would have shipped a red test and a hollow guard. The planned create-skill
pin fails on today's text, and the planned "running line" rule lets `Engine source: \`shared/resources/X\``
prose through, which is a token-free restatement of the incident line. Both are fixed in the task and plan.

**Critical Issues:** 1 🚨 (fixed)
**Important Issues:** 2 ⚠️ (fixed)
**Optional Improvements:** 2 💡 (fixed)

**User Clarifications:** 0 questions asked. Autonomous pipeline run (develop-next `--defaults`); every
ambiguity was settled by measuring the tree, recorded below.
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No questions were asked: the run is unattended (develop-task Step 2, develop-next `--defaults`). Each point
that would have been a question was settled by measurement:

- **Running-line rule (Q-point 2).** Measured, not asked: the rule as written admits prose. Fixed to
  "command token immediately before the path" (see I1).
- **Pin wording (Q-point 2).** Measured: the current section text names `references/<file>` on purpose,
  in its obs #175 explanation. The pin now forbids the old rule *form*, not the token (see C1).

Pre-pass: Agents B and C were **not dispatched**; both passes were done inline. Independence loss recorded:
the architecture and codebase scans were run by the reviewer, not by an independent agent.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 numbered sections present; frontmatter carries `type: task`, `description`, `tags`, `github_issue: 592`.
Body link `[#592](…/issues/592)` matches frontmatter. Change Log present (newest row 1.0, status `planned` —
current). Sign-off not enabled. Card preflight: 3 blocks resolve (`sync-jira-task.js --check-card`, exit 0).
Doc links: 1 relative link resolves (`doc-links.js`, exit 0). Issue #592 exists.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)
**Hallucinations Detected:** 0

Verified: `SHARED_REF_RE` at `skills/create-skill/scripts/bundle_skill.py:45`; `grant-qa-cycles.sh` copies in
`develop-bug`, `develop-story`, `develop-task`, `qa-story`, `qa-task`, `review-pr`
(`ls skills/*/references/grant-qa-cycles.sh`); in the four non-develop skills the only other mentions are
comments in `qa-cycle.sh` / `advance-pipeline-lock.sh` and the bundled resume contract
(`grep -rln grant-qa-cycles skills/{develop-bug,qa-story,qa-task,review-pr}`). `tests/lib/markdown-section.js`
exports `sectionOf`, `fenceStep`; `tests/bundle-comment-origin.test.js` exists; `'tests/*.test.js'` is in the
`package.json` test script (check 18: the new file is reached).

Architecture alignment: not run as a separate pre-pass (inline). The task touches shell/Node tests and
Markdown sources only; it adds no dependency.

### Critical

- **C1 — The planned pin fails on today's tree (check 11, falsified invariant).** Phase 3 / § 8 said the
  create-skill section "does not contain `references/<file>`". Run against the tree:

  ```
  command node -e 'const s=require("./tests/lib/markdown-section.js");…sectionOf(…).join("\n")…'
  → has references/<file>: true | has shared-resources directory: true | has old form: false
  ```

  The section names `references/<file>` deliberately, in the sentence explaining obs #175. A test written to
  the spec would be red on its first run. **Fix applied:** the pin asserts the rule sentence ("A literal that
  puts the shared-resources directory in front of the filename is not a reference") is present and the old
  rule form `` A literal `references/<file>` `` is absent; `sectionOf` returns an array of lines, so join it.

### Important

- **I1 — The running-line rule admits the incident's own shape (checks 11, 13).** § 8 counted a literal as a
  running line when `bash|sh|source|node|require(|import|from` appears anywhere before it on the line. The word
  `source` in "Engine source: `shared/resources/gh-stage.js`" matches, as do English "from" and "sourceable".
  Measured on `eb44b9c3` with the task's definition: 20 prose literals, 20 "running" — of the 20, 18 are prose
  (`Engine source:` ×13, "from `shared/resources/resolve-platform.sh`", "a sourceable bash helper", a
  frontmatter `description:`, two table/sentence lines) and 2 really run the script
  (`autonomous-defaults.md:57`, `security-review-prompt.md:157`). A guard built to that rule would pass ``Engine source: `shared/resources/grant-qa-cycles.sh` ``,
  a lower-case restatement of the incident line. **Fix applied:** a running line is one where a command token
  sits **immediately** before the path (`bash `, `sh `, `source `, `node `, `command node `, `require(`,
  `import(`, or a JS `import … from `), optionally behind one quote or backtick. Control fixtures add
  ``Engine source: `shared/resources/x.js` `` and ``wrap with f from `shared/resources/x.sh` `` (both must
  fail).
- **I2 — No removed-literal search (check 15).** The plan removes `shared/resources/<script>` literals and
  copies but listed no test search. Done here and added to the plan:
  `git grep -nE "shared/resources/(grant-qa-cycles|set-qa-phase|report-lint|handover-render|security-probe|bitbucket-auth)" -- '*.test.*' 'tests/**' 'evals/**'`
  finds tests that read the **source** scripts by path (`qa-loop-lock-fields-parity.test.mjs:63,67`,
  `tests/qa-cycle.test.js:449`, `report-lint-call-sites.test.mjs:153`, `security-probe.test.mjs`,
  `review-security.test.js`, `stdout-drain-on-exit.test.mjs:379`). None pins a prose literal in a document,
  and a search for the four skills' bundled copies by path finds none. Re-run it after Phase 1 for the
  scripts Phase 1 actually switches.

### Optional

- **O1 — Line anchors drifted (check 2).** create-skill heading `:297` → `:304`, rule sentence `:301` →
  `:308`; resume contract `:551` → `:614`; `bundle-missing-source.test.js:307` → `:308`. Updated.
- **O2 — Population figure drifted (check 7).** 34 on `b36d7d32`; 37 on `eb44b9c3` under the corrected rule (48 literals: 8 fenced, 3 run)
  (new: `pipeline-answers.js`, plus shifted lines). The figure carries its definition and command; the plan
  already says to re-measure. Updated to name both figures.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases with files, risk and dependencies. Phase 1's per-skill witness rule (own copy only) is precise and
explains the path-blind false positive. Effort 8h is in line with the rubric.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

Every success criterion names its holder (the new test or `bundle:check`); none needs a post-merge event; the
control-case fixture exists (now widened per I1); the mutation proofs are concrete. CI runs on ubuntu with
node + bash only — no platform-specific criterion.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The medium risk (a skill loses a script it runs) is mitigated by the own-copy witness search and `npm test`.
The guard is a refuse-by-default check with an allowlist; its differential oracle is the control fixtures
(prose and `Engine source:` must fail; fence, run line, cite must pass).

---

## Summary of Recommendations

### Must Fix (Critical) - 1 issue — fixed

1. Re-specify the create-skill pin against the old rule form, not the `references/<file>` token.

### Should Fix (Important) - 2 issues — fixed

1. Running line = command token immediately before the path; add the `Engine source:` and prose-`from`
   control fixtures.
2. Record the removed-literal test search in the plan.

### Consider (Optional) - 2 items — fixed

1. Refresh line anchors.
2. Record the re-measured population.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 7/10 (two spec defects, both fixed)
- Implementation Clarity: 8/10
- Consistency: 9/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** The design is sound and measured; the two defects were in the test specification and are
corrected in the task and plan before development.

---

## Next Steps

Task is ready for implementation: re-measure the population with the corrected rule, classify (Phase 1),
fix (Phase 2), guard and pin (Phase 3), changelog (Phase 4).

---

## Review Metadata

- **Reviewer:** review-task (develop-task Step 2, autonomous)
- **Review Date:** 2026-10-19
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.193.scripts-reach-only-skills-that-run-them/task.193.scripts-reach-only-skills-that-run-them.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md (via devLoadAlwaysFiles), AGENTS.md § Shared Resources, skills/create-skill/SKILL.md
- **Review Duration:** ~15 minutes
