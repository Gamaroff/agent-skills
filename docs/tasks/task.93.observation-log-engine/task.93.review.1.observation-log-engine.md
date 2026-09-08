# Task Review Report: Task 93 - Observation-log engine, workspace resolver and contract

**Reviewed:** 2026-09-08
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** EXCELLENT

> **Implementation Status**: ✅ The 1 Important recommendation was implemented — 2026-09-08 (corrected in 5 locations across the task document and its co-located plan). The 2 Optional items were deliberately not applied: the pipeline's Step 8.5 auto-answer scopes fixes to critical + important, and both remaining items are documentation-currency nits recorded here for the implementer to weigh.

---

## Executive Summary

Task 93 is an unusually well-grounded task document. Every external anchor it cites was verified against the real repository and all but one checked out exactly — file paths, line numbers, exit-code tables, the `reason` vocabulary, and the `npm test` glob claim that this repo has previously been bitten by. The co-located plan file supplies code sketches, a per-guard mutation table, and an explicit list of what *not* to copy.

One real defect: Phase 2 instructs the implementer to **reuse** a project-identity path derivation from `skills/remember-insight/`, and Low Risk Areas §1 proposes asserting equality against it in a test. No such code exists — `skills/remember-insight/` is a single `SKILL.md` that names the path convention as harness-supplied context. Both the instruction and its mitigation are non-actionable as written.

**Critical Issues:** 0 🚨
**Important Issues:** 1 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked — autonomous pipeline run; no ambiguity required an operator decision (see note below)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran inside the `/develop-task` pipeline dispatched by `/develop-next`, in autonomous mode. Question Points 1–3 were evaluated and produced **no questions requiring operator input**: the single Important finding has one correct resolution (the cited code does not exist, so the instruction must be reworded to "author, following the documented convention"), and both Optional findings are documentation-currency nits. No finding presented a genuine fork where different answers would produce materially different work.

Pipeline auto-answers applied and recorded:

| Prompt | Auto-answer |
|---|---|
| Step 0 — output format | Comprehensive report |
| Step 8.5 — implement fixes? | Yes, apply all critical + important fixes |
| Step 9 — update status? | Yes, fixes complete |

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 mandatory numbered sections present (Overview → Rollback Plan), plus `## Change Log`, `## Progress Tracking`, `## References` and `## Notes`.

- **File naming**: `task.93.observation-log-engine.md` — dots as structural separators, hyphens within the descriptive name. ✅
- **Placeholders**: zero occurrences of `[TBD]`, `[TODO]`, `[PLACEHOLDER]`, `???`, `[Description]`. ✅
- **Metadata**: `status: planned`, `priority: High`, `estimated_effort_hours: 8`, `category: infrastructure`. Complete. ✅
- **OKF conformance**: `type: task` present and non-empty (the one hard requirement); `description` present; `tags` a well-formed YAML list; `updated: 2026-09-07`; tracker URL derivable from `github_issue: 339`. ✅
- **Stakeholder Sign-off**: **not checked** — `sign-off.enabled` is absent from `skills-config.yaml`, so the check is skipped entirely and a missing section is not a finding.
- **Change Log** (check 4b): present, four canonical columns, one row (`1.0 | Initial draft | create-task`). Currency check passes — `status` has not advanced past `planned`, so the log is not stale. ✅
- **Tracker linkage**: `github_issue: 339` present; issue verified OPEN on the board (`Agent Skills`, column `Todo` at review time, priority `P1 High`). Body cross-reference `[#339](https://github.com/Gamaroff/agent-skills/issues/339)` present and matches frontmatter. ✅

### Tracker Card Preflight

`sync-jira-task.js --check-card` → **exit 0, zero findings**. All three card blocks resolve:

| Block | Status | Kind | Chars | Omitted |
|---|---|---|---|---|
| Summary | ok | prose | 346 | +6 |
| Success Criteria | ok | list | 399 | +16 |
| Breaking Changes | ok | prose | 29 | +3 |

The `omitted` counts are **information, not defects** — the builder caps each block and announces the remainder with a `+N more` link. They tell the author that a board reader sees 5 of 21 success criteria; the document remains the authority.

### Issues

None.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

Every technical anchor was verified directly against the repository. This section records the verification rather than merely asserting it.

| Claim | Verification | Result |
|---|---|---|
| `shared/resources/tracker-comment.js` supplies the exit-code / `--json` `reason` idiom | Read `tracker-comment.js:1-60` | ✅ Exact. Exit codes `0` (success family + unhandled throw), `1` (skip under `--strict`), `2` (usage). `reason` vocabulary `{posted, already, unverifiable, deferred, no-credentials, dry-run}` |
| `tracker-comment.js:831` ends on `process.exit(r.exitCode)` — the line **not** to copy | Read `tracker-comment.js:825-840` | ✅ Exact. Line 831 is `.then((r) => process.exit(r && r.exitCode ? r.exitCode : 0))`, with a second `process.exit(0)` at 834 |
| `select-next.mjs:1629` documents the pipe-truncation hazard citing `bug.3.stdout-truncation-on-exit` | Read `select-next.mjs:1620-1645` | ✅ Exact, lines 1628–1633 |
| `shared/resources/resolve-platform.sh` supplies the guarded-source resolver idiom | Read `resolve-platform.sh:1-40` | ✅ Exact. Its own header states `source … \|\| exit 1` and *"The `\|\| exit 1` is not optional"* |
| `shared/resources/tests/*.test.mjs` is already in the `npm test` glob, so **no `package.json` change is needed** | Read `package.json:26` | ✅ **Confirmed true.** The glob list literally contains `'shared/resources/tests/*.test.mjs'` |
| `skills/remember-insight/` has a project-identity derivation to reuse | `find skills/remember-insight -type f` | ❌ **See Important finding below** |

> The `npm test` glob claim deserves the explicit call-out it gets here. This repository has previously shipped **232 silently unrun tests** because per-skill globs are maintained by hand and a new suite ran nowhere. Task 93's assertion is the reassuring direction of that hazard and it is correct — but the plan file also correctly warns that **task 94's `skills/observe-work/tests/*.test.js` will need a `package.json` edit**. That warning must survive into task 94.

### Issues

#### Important

- **Non-existent code cited for reuse**: Phase 2 instructs *"Reuse `remember-insight`'s project-identity path derivation rather than inventing a second one"*, and the plan file amplifies it to *"factor the shared part rather than writing a second encoder"*. Low Risk Areas §1 then proposes the mitigation *"reuse, and assert equality against `remember-insight`'s derivation in a test"*.
  - **Location:** task doc §6 Phase 2 (Changes bullet 2), §10 Low Risk Areas §1; plan file Phase 2 ("Reuse, do not reimplement…")
  - **Issue:** `skills/remember-insight/` contains exactly one file — `SKILL.md`. It states the pattern `<backup-root>/.claude/projects/<encoded-project-path>/memory/` and says the directory *"is defined in your system context (auto-memory section)"*. No code in this repository computes `<encoded-project-path>` from a repo path; a repo-wide grep for `encoded-project-path` returns only that line and tasks 93/95's own planning documents. It is a Claude Code harness convention, not repo-owned logic.
  - **Consequence if unfixed:** the implementer looks for an encoder, does not find one, and either stalls or silently invents one while believing they reused something — which is precisely the "two derivations that drift" failure that Low Risk Areas §1 exists to prevent. The mitigation cannot be executed, so the risk it guards is unguarded.
  - **Recommendation:** reword to *author* the derivation in the resolver, following the documented `<encoded-project-path>` convention (path separators → hyphens, leading separator preserved as a leading hyphen), and assert it against **that documented convention** rather than against a non-existent sibling implementation. Independently confirmed by the architecture pre-pass agent, which rated it `high`.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Five phases, each carrying a purpose, a risk level, an explicit file list, concrete checkboxes and stated dependencies. 30 top-level checkboxes across the plan; 21 success criteria.

Change descriptions are specific rather than vague throughout — the co-located plan file (`task.93.plan.observation-log-engine.md`, 330 lines) supplies:

- the full `reason` vocabulary with one-line semantics per value
- the exit-code table, adapted (not blindly transcribed) for an engine whose guards *are* failures
- code sketches for `nextId`, `write`'s `wx` create, `set-status` validation, and the `archive` predicate
- a **per-guard mutation table** — nine guards, each with the exact mutation and the exact test that must go red

**Effort estimate**: frontmatter `estimated_effort_hours: 8`. Rubric recomputation from the current document — base 2, +4 (21 ACs, capped), +4 (30 plan tasks, capped), +0 (`risk_level` absent), +0 (5 files, not >5), +2 (integration keywords present) = 12 → snaps to **8h**. Exact match; no divergence finding.

### Issues

None.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

Internal consistency verified: the Files Summary (5 files) matches the files named across Phases 1–5; the Testing Strategy covers every subcommand and every guard; Success Criteria map onto the phases; the Rollback Plan addresses all three components independently (engine, resolver, contract) and correctly notes they are separable.

Scope and complexity: 5 phases, well under the >8-phase oversizing threshold. Single module (`shared/resources/`) plus one documentation edit. No split recommended.

The document's self-awareness is notable and worth recording as a strength: it names the exact hazards this repo has been bitten by before — load-flaky timing assertions, `process.exit()` truncation, the `command node` shell-function pollution, committed fixture trees needing `.gitignore` negation — and designs around each.

### Issues

#### Optional

- **`tech-stack.md` will go slightly stale.** `docs/architecture/concepts/tech-stack.md:14` scopes Bash to *"`shared/resources/resolve-platform.sh` and a few shell test scripts"*. This task ships `resolve-observation-workspace.sh`, a second standalone Bash resolver. The Migration success criteria list only `AGENTS.md` and `CHANGELOG.md`.
  - **Recommendation:** either add a Migration criterion for `tech-stack.md`, or accept the staleness deliberately. Not blocking — the architecture doc is descriptive, and one un-listed script does not mislead an implementer.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risk identification is proportionate and honest. High Risk Areas is explicitly empty with a stated justification — every file is new and nothing consumes them — which is the correct call rather than an omission.

The three Medium risks are the right three:

1. **Guards written but not proven** — correctly identified as *the default outcome without a deliberate step*, with mutation-proving elevated to a Success Criterion rather than left as a nicety. The plan's nine-row mutation table is the mechanism.
2. **`parked` treated as resolved** — correctly identified as counter-intuitive, with both a test and a contract paragraph as mitigation.
3. **Pipe-truncation reintroduced** — correctly identified as *self-concealing* (a file redirect hides it) and as having the wrong pattern present in the very file being transcribed.

Rollback is realistic: immediate (delete four new files, revert one section), partial (engine and resolver are independent), and forward-fix (nothing consumes the contract yet, so the cost of changing it is at its lifetime minimum).

### Issues

#### Optional

- **Low Risk Areas §1's mitigation is unimplementable as written** — see the Important finding in §2. Listed here as Optional because the *risk* it names (two derivations that drift) is real and correctly identified; only the mitigation's mechanism is wrong. Fixing the §2 finding fixes this one.

---

## Summary of Recommendations

### Must Fix (Critical) — 0 issues

None.

### Should Fix (Important) — 1 issue

1. **Reword the `remember-insight` reuse instruction** in Phase 2, in Low Risk Areas §1, and in the plan file's Phase 2 section — the cited derivation does not exist as code. Replace "reuse / factor the shared part" with "author it in the resolver following the documented `<encoded-project-path>` convention", and replace "assert equality against `remember-insight`'s derivation" with "assert it against the documented convention".

### Consider (Optional) — 2 items

1. Add a Migration success criterion for `docs/architecture/concepts/tech-stack.md:14`, or accept the staleness deliberately.
2. Note the card-preflight omission counts (a board reader sees 5 of 21 success criteria) — informational only.

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 10/10 — all sections, no placeholders, card preflight clean, OKF conformant
- Technical Accuracy: 8/10 — every anchor verified exact except one non-existent cited implementation
- Implementation Clarity: 10/10 — co-located plan with code sketches and a per-guard mutation table
- Consistency: 9/10 — one documentation-currency nit
- Risk Management: 9/10 — risks correctly identified; one mitigation's mechanism unimplementable

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Score 9/10 with zero critical issues. The single Important finding is a two-line rewording that removes a dead reference; it does not change what gets built, only what the implementer is told to look for. Every other technical claim in the document was verified true against the actual repository, including the `npm test` glob assertion this repo has historically been burned by.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Follow the phases in order — **the contract genuinely goes first**; a spec reverse-engineered from finished code inherits the code's accidents, which is the document's own stated reason for the ordering.
2. Check off Progress Tracking boxes per phase.
3. **Mutation-prove every guard and record each proof in the implementation report.** This is a Success Criterion, not a nicety, and it is the single highest-value line in the document. A guard whose test stays green when the guard is removed is not testing the guard.
4. Actually run `shellcheck --severity=warning` on the new script. "Unrunnable" is a claim — this repo has written that check off three times and found a real defect the moment it ran.
5. Do **not** copy `tracker-comment.js:831`'s tail. Use `process.exitCode` + `return`.
6. Refer to the Rollback Plan if issues arise; engine and resolver are independently revertible.

---

## Review Metadata

- **Reviewer:** Claude (`/review-task`, autonomous — `/develop-task` Step 2, dispatched by `/develop-next`)
- **Review Date:** 2026-09-08
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.93.observation-log-engine/task.93.observation-log-engine.md`
- **Plan File:** `docs/tasks/task.93.observation-log-engine/task.93.plan.observation-log-engine.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/coding-standards.md`, `tech-stack.md`, `source-tree.md`
- **Pre-pass agents:** Agent B (architecture alignment) → `alignment: drift`, 1 high / 5 low findings. Agent C (codebase scan) → `implementation_status: not-implemented`, all 5 deliverables absent, no pre-existing partial implementation anywhere in the repo.
- **Verification stance:** every external anchor (file path, line number, glob, exit-code table) was opened and read during this review rather than accepted from the document. Findings above cite what was read.
