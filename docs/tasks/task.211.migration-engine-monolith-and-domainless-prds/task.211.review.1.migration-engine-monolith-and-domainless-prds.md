# Task Review Report: Task 211 - Migration engine: monolith and domain-less PRDs

**Reviewed:** 2026-10-21
**reviewed_blob:** 2ca6fddaa1f7a34ebe8e0022685bc12d0ee12b91
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 recommendations implemented — 2026-10-21

---

## Executive Summary

The task is accurate about the three engine defects and the guard it lifts, and every claim it makes
about the engine is true of today's code. Its line anchors predate task.204's merge and have drifted.
Three plan gaps needed closing: the Performance criterion had no test, the monolith's placement under
the new `<domain>/<slug>` form was unstated, and the guard's tests reach beyond the one gate-8 row the
plan names.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked (autonomous pipeline run — every question resolved from the code; assumptions recorded below)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Invoked by `/develop-task` Step 2 under `/develop-next --defaults`. No one was present to answer, so no
question was asked. Each would-be question was resolved from the code:

- **Monolith with `<domain>/<slug>`** — resolved from `plan()`: the monolith is placed today at
  `${PRD_ROOT}/<slug>/prd.{P}.<slug>/` (the slug doubles as the domain). The bare form keeps that; the
  new form places it under the named domain. Recorded as a fix (I-2), not a scope change.
- **Domain validation rule** — resolved from `create-prd`: its register and keep blocks validate a
  domain with `doc-id.js format({kind: "prd", prd: 1, slug: domain})`. The engine uses the same call (O-2).

---

## 1. Template Structure Compliance

**Status:** PASS

- All eleven numbered sections present; Change Log present (one row, status `planned` — current under
  check 4b); no placeholders; YAML frontmatter with `type: task`, `description`, `tags`.
- Tracker: `github_issue: 676` exists (OPEN); body link `[#676](…/issues/676)` matches.
- Card preflight: exit 0 — 3 card blocks resolve (Summary +4 more, Success Criteria +5 more, Breaking Changes).
- Doc links: task and plan files — every relative link resolves.
- Sign-off: not configured (`sign-off.enabled` absent) — not checked.

---

## 2. Technical Accuracy

**Status:** ACCURATE (anchors drifted)
**Hallucinations Detected:** 0

Pre-pass B (architecture alignment, `prepass-axes.js` source `architecture`): `aligned`, axes checked:
What this repo produces, Cross-skill resources, File naming, Registries, Validation before commit, Do not.
Its four low findings are documentation gaps in the architecture docs, not task defects.

Pre-pass C (codebase scan): `not-implemented` — `editFrontmatter` still returns unchanged text without
a fence; no `unclosed-frontmatter` / `needs-domain` blocker; `--name` takes `<path>=<slug>` only; the
prefilter ignores outside move sources; the guard still refuses all three codes.

Verified by reading `shared/resources/migrate-doc-numbering.mjs` at `develop` `27725e92`:

- `editFrontmatter` returns `text` unchanged when line 0 is not a fence — true (`:737`).
- Prefilter skips an outside file without `rootSeg` / `prefix` — true (`:1035`–`:1050`). `docs/prd.md`
  contains neither `prd/` nor `docs/prd/`, so a README naming it is never read.
- Root `index.md` and root L1/L2 placed with domain `"."` — true (`:471`–`:479`).
- `create-prd`'s keep block requires `parts.length === 3` with a slug-valid domain folder
  (`skills/create-prd/SKILL.md:427`–`:437`) — a placement at `${PRD_ROOT}/<domain>/prd.{P}.{slug}/` passes
  it, so the "keep block accepts it" criterion is reachable (check 10).

### Optional

- **O-1 Drifted line anchors.** Every anchor was taken on task.204's branch head. Corrected numbers:
  `:724`→`:737`, `:721`→`:734`, `:1026`–`:1041`→`:1035`–`:1050`, `:1038`→`:1047`, `:455`–`:471`→`:468`–`:483`,
  `:464`–`:466`→`:477`–`:479`, `:458`–`:463`→`:471`–`:476`, `:1523`–`:1528`→`:1532`–`:1537`,
  `:309`/`:323`→`:322`/`:336`, `:1328`→`:1337`, `:876`→`:893`, `:944`→`:960`.
- **O-2 "doc-id.js's slug rule" is not exported.** `doc-id.js` exports no slug predicate. Validate the
  domain and slug the way `create-prd` does: `docId.format({ kind: "prd", prd: 1, slug })` throws on a
  bad one. This also keeps the module free of an id regex of its own (its header rule).
- **O-3 New blocker codes join `BLOCKER_CODES` and the header comment.** `unclosed-frontmatter` and
  `needs-domain` must be added to the exported `BLOCKER_CODES` list and the module's blocker-code comment.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

#### Important

- **I-2 Monolith placement under `<domain>/<slug>` is unstated.** Phase 3 covers PRDs whose domain is
  `"."`. The L3 monolith (`docs/prd.md`) is placed with its slug as the domain (`:481`–`:482`), so it is
  never `"."` and never blocked. A user answering `needs-domain` for other PRDs may also pass
  `--name docs/prd.md=<domain>/<slug>`; the plan does not say what happens. Fix: the named domain places
  the monolith at `${PRD_ROOT}/<domain>/prd.{P}.{slug}/`; the bare `<slug>` form keeps today's placement.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

#### Important

- **I-1 The Performance criterion has no planned test.** "The prefilter adds reads only for files that
  name a move source outside the root" bounds a count (reads), so a per-PR test can assert it and only
  such a test holds it (check 4). Fix: an engine row with a counting `io.readFile` — an outside file
  that names `docs/prd.md` is read, an outside `.md` that names neither the root nor the source is not.
- **I-3 The guard's tests reach beyond the gate-8 row (check 15).** `git grep` for the removed literals
  (`migration-guard`, `no-frontmatter`, `outside-links`, `no-domain`) in tests finds the gate-8 row
  (`evals/shared/tests/prd-skill-numbering.test.mjs:967`–`:1010`, copying the guard at `:1026`) **and** the
  gate-9/10 row (`:1053`–`:1150`, which runs the guard directly and copies it at `:1148`). Deleting the
  script breaks both. Fix: list the gate-9/10 row in Files Summary and Testing Strategy.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risks name the prefilter widening (with the task.204 gate-7 failure shape), the `--name` grammar and
task.203's own rows. Rollback is per-phase with the guard as the safety net.

---

## Summary of Recommendations

### Should Fix (Important) - 3 issues

1. I-1 — add the read-count test for the Performance criterion.
2. I-2 — state the monolith's placement under `<domain>/<slug>`.
3. I-3 — name the gate-9/10 row among the tests to update.

### Consider (Optional) - 3 items

1. O-1 — correct the drifted anchors.
2. O-2 — validate with `docId.format`, not an unexported slug rule.
3. O-3 — add the two codes to `BLOCKER_CODES` and the header comment.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 8/10 (anchors drifted)
- Implementation Clarity: 7/10 (monolith placement)
- Consistency: 7/10 (untested Performance criterion, incomplete test sweep)
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** — no Critical issue; the three Important gaps are closed
in the task document by this review.

---

## Review Metadata

- **Reviewer:** review-task (develop-task pipeline Step 2, autonomous)
- **Review Date:** 2026-10-21
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.211.migration-engine-monolith-and-domainless-prds/task.211.migration-engine-monolith-and-domainless-prds.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/coding-standards.md (via pre-pass B)
