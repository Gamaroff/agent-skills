# Task Review Report: Task 216 - security-probe: the cli: form honours a case's fixture.files (and env)

**Reviewed:** 2026-10-22
**reviewed_blob:** aab1793832c4a6a7b7ecc148748a25eb3ae695ea
**Review Depth:** Standard
**Task Status:** draft
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 important recommendations implemented — 2026-10-22 (optional items not applied)

---

## Executive Summary

The task is small, well-motivated and points at the right helpers. The review found the documentation
comment it targets in a different file than the one named, a test location that does not exist, and
two gaps in the plan that a reused helper does not close for the `cli:` arm: an `expected.absent`
collision with `fixture.files`, and `fixture.env` keys that replace or steer the interpreter itself.
Two criteria and one plan step can only be met after merge and are moved to Deferred Work.

**Critical Issues:** 0 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 2 questions, auto-answered with the recommended option (autonomous develop-next run)
**Implementation Readiness:** 8/10 after fixes
**Recommendation:** READY TO IMPLEMENT (after the fixes below, applied in Step 8.5)

---

## User Decisions & Clarifications

This review ran inside an autonomous `/develop-next` → `/develop-task` pipeline. No one was present to
answer, so each question took its recommended option, recorded here.

### Question Point 2: Technical & Implementation

**Q1: Per-case `fixture.files` or `--fixture-setup` on `cli:`?** (the task's own "Decision to confirm in review")
- **Decision (auto, recommended):** per-case `fixture.files` and `fixture.env`. `--fixture-setup` for `cli:` stays out of scope.
- **Impact:** the plan stands as written; `--fixture-setup` on a `cli:` entry keeps being refused (`bad-fixture-setup`).

**Q2: `fixture.env` can set `PATH` (which selects the `python3` binary the arm spawns) and `NODE_OPTIONS` (which loads code into the Node child before the entry). Refuse them on `cli:`, or resolve the interpreter first?**
- **Decision (auto, recommended — fail closed, least code):** refuse both on the `cli:` arm, declined by name.
- **Impact:** a `cli:` case cannot change `PATH` or `NODE_OPTIONS`. Documented as a limit of the form.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND

### Important
- **Change Log missing** (check 4b, `change-log.enforcement` advisory by default). Added with this review's row.
- **No body cross-reference to the tracker issue** (check 5). `github_issue: 696` is set and the issue is OPEN; the body has no `[#696](…)` link. Added.

### Optional
- No `Progress Tracking` / `References` sections. Not added: the 11 numbered sections are the mandatory contract and are all present.

Card preflight: exit 0, 3 card blocks resolve (Summary +1 omitted, Breaking Changes +1 omitted). Doc links: 0 relative links, all resolve. OKF: `type: task`, `description`, `tags` present.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

Pre-pass C: `implementation_status: not-implemented` — `runCliCase` never reads `c.fixture`; `writeFixtureFiles` is called only by the fence: and shell-argv: arms; no cli: fixture test exists.

Pre-pass B: `alignment: aligned`, `axes_checked: [What this repo produces, File naming, Status lifecycle, Cross-skill resources, Registries, Validation before commit, Do not]`, axes `source: architecture`.

### Important
- **`OPTIONAL_CASE_FIELDS` is in `security-input-corpus.mjs`, not `security-probe.mjs`.** §3 and §6 step 2 place it in the engine; it lives at `shared/resources/security-input-corpus.mjs:76`, with the sentence to change at lines 67–74. §7 Files Summary omits that file and its four bundled copies. Fixed.
- **"Plan-time" validation does not exist.** §6 step 1 says to "run the same `fixture` validation the other arms run at plan time". The lines cited (~1663, ~1694) are the `needs-fake-gh` text checks of `fence:` and `shell-argv:`; the validation itself, `fixtureProblem` (~3120), runs **per case** at the top of `runShellArgvCase` / `runFenceCase` and declines that case as `errored`. Fixed to say that.
- **Test location.** §7 and §8 name "engine tests under `evals/shared/tests/`". The engine's suite is `shared/resources/tests/security-probe.test.mjs`, fixtures under `shared/resources/tests/fixtures/security-probe/`; the runner reaches both (`'shared/resources/tests/*.test.mjs'` in `package.json`). Fixed.
- **`expected.absent` collision with `fixture.files` is not in the plan** (check 10). `runShellArgvCase` declines an `absent` name the case's own fixture files create (task.128 BUG-13, ~2895–2908). `runCliCase` checks only the sink controls and the input. Reusing `writeFixtureFiles` alone leaves the cli arm comparing an `absent` path its own fixture wrote, which mismatches on every run. Added to the plan and tests.
- **`fixture.env` can replace or steer the interpreter** (check 11, run). `runCliCase` spawns `python3` by name through `watchedSpawn` → `spawnSync`, which resolves the command on the child env's `PATH`. Evidence: `spawnSync("python3", …, {env: {PATH: "<dir with a fake python3>:…"}})` printed `FAKE-PYTHON`. A case's `fixture.env.PATH` would therefore run a different binary in place of the interpreter whose crash record the verdict depends on. Python's `-E` already ignores `PYTHON*`; Node has no such guard, so `NODE_OPTIONS` (`--require`) loads code before the entry and can mask the fatal-error footer. Per Q2: refused on the `cli:` arm.

### Removed-literal sweep (check 15)
The sentence "`fixture` is read only by the `fence:` … and `shell-argv:` … entry forms" is pinned by no test (`git grep` over `*.test.*`, `tests/`, `evals/`: no hit).

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Important
- **Steps that cannot run before merge.** §6 step 5 ("Release and re-vendor into consumers") and §9 criterion 4 (consumer proof in omarchy-leak-radar after re-vendoring) can only be done after this PR merges and a release is cut; `/finalise` runs before merge. Both moved to a `Deferred Work` note.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

- Criterion 1–3 each name a planned per-PR test (the fixture-CLI suite). Criterion 4 is the post-merge one above.
- Testing Strategy gains: the `expected.absent` collision decline; the `PATH` / `NODE_OPTIONS` decline; a Python fixture CLI beside the Node one; the mutation (drop the write → the first test red).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Additive change; reuses `writeFixtureFiles` and `fixtureProblem`. The one guard-shaped addition (the env refusal) is fail-closed, so it narrows what runs. Rollback (revert + re-bundle) is complete.

---

## Summary of Recommendations

### Should Fix (Important) — 6
1. Name `shared/resources/security-input-corpus.mjs` (and copies) as the home of `OPTIONAL_CASE_FIELDS`.
2. Replace "plan-time validation" with per-case `fixtureProblem` at the top of `runCliCase`.
3. Point tests at `shared/resources/tests/security-probe.test.mjs` and its fixtures dir.
4. Add the `expected.absent` × `fixture.files` collision decline to the cli arm.
5. Refuse `PATH` and `NODE_OPTIONS` in a `cli:` case's `fixture.env`.
6. Move the release / consumer-proof items to Deferred Work; add the Change Log and the `#696` link.

### Consider (Optional) — 2
1. Progress Tracking / References sections.
2. Note in the docs that `{input}` `.` works only when the sink is not materialised (`filename` writes the input as a file).

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 8/10
- Technical Accuracy: 7/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** — no critical issues; every important one is a document fix applied in Step 8.5.

---

## Review Metadata

- **Reviewer:** review-task (Claude, autonomous develop-next run)
- **Review Date:** 2026-10-22
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.216.probe-engine-cli-case-fixture-files/task.216.probe-engine-cli-case-fixture-files.md
- **Architecture Docs Consulted:** via pre-pass B (docs/architecture/concepts/)
