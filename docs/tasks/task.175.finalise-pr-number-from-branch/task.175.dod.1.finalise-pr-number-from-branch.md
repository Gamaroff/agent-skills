# Definition of Done Verification

**Story/Task:** task.175.finalise-pr-number-from-branch
**Verification Started:** 2026-10-12 06:26 UTC

---

## Verification Results

_DoD results will be appended here in 4 consolidated sections after parallel agent completion._

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.175.qa.1.finalise-pr-number-from-branch.md`
**Gate File Found:** `task.175.gate.1.finalise-pr-number-from-branch.yml`
**PR:** #635 (source: branch)

**Gate Status:** ✅ PASS
**Quality Score:** 100/100

**Success Criteria Coverage (from QA):** all 8 PASS (rungs 1–5, body confirmation, no-source refusal, finalise wiring, gates, mutations, CHANGELOG; performance N/A)

**NFR Validation (from QA):**

- Security: ✅ PASS (reasoned; `boundary: true`, `probes_executed: 0` — no probe entry form reaches the resolver)
- Performance: ✅ PASS
- Reliability: ✅ PASS
- Maintainability: ✅ PASS

**Immediate Actions from QA:** None
**Future Actions from QA:** 4 (CR-1 branch rung on a long-lived branch; CR-2 refusal wording; Step 7.2 positive pin; security zero-guard override)
**5c PR review:** `task.175.pr-review.1.finalise-pr-number-from-branch.md` — APPROVE, 0 findings

---
## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS
**PR Status:** OPEN (PR #635)
**PR Review Decision:** null — the repository requires no reviews; Step 5c `task.175.pr-review.1.finalise-pr-number-from-branch.md` reads **APPROVE** (0 findings) and stands in for it

### Acceptance Criteria

#### AC1: `resolve-pr-number.sh` resolves through rungs 1–5 in order; its executed test holds each rung

**Status:** ✅ PASS

- Code evidence: `shared/resources/resolve-pr-number.sh:82` (explicit), `:87-92` (branch), `:97-124` (lock), `:128-130` (frontmatter), `:134-147` (body)
- Test evidence: `shared/resources/tests/resolve-pr-number.test.mjs:103`, `:111`, `:124`, `:135`, `:151`, `:158`, `:185`, `:222` — each rung with the rungs above it empty; runs per PR via `npm test`
- Note: mutation M2 (rungs 2 and 4 swapped) went red

#### AC2: A body `PR #N` is used only when PR N's head branch is the current branch

**Status:** ✅ PASS

- Code evidence: `shared/resources/resolve-pr-number.sh:143`
- Test evidence: `shared/resources/tests/resolve-pr-number.test.mjs:167` (refused, no number printed) and `:185` (confirmed); `shared/resources/pr-read.test.sh` head-branch cases
- Note: mutation M1 went red

#### AC3: With no source, the resolver exits 1 and prints no number

**Status:** ✅ PASS

- Code evidence: `shared/resources/resolve-pr-number.sh:150`
- Test evidence: `shared/resources/tests/resolve-pr-number.test.mjs:195`; usage errors exit 2 at `:202`

#### AC4: Step 3a calls the resolver, Step 7.2 writes only the resolved number, no finalise site reads a body `PR #N`

**Status:** ✅ PASS

- Code evidence: `skills/finalise/SKILL.md:463`, `:1153`, `:243`; `shared/resources/finalise-dod-ac-prompt.md:20`; `shared/resources/finalise-dod-fix-evidence-prompt.md:34`
- Test evidence: `shared/resources/tests/resolve-pr-number.test.mjs:282`, `:297`, `:308`
- Note: mutations M4–M6 went red. Step 7.2's positive wording is held only by the forbidden-literal pin (QA future item)

#### AC5: Performance — not applicable

**Status:** ✅ PASS

- Code evidence: task §9 states it explicitly
- Test evidence: NOT_APPLICABLE — no numeric bound

#### AC6: `ci:fast` (`.agents/skills` aside), `bundle:check`, `validate`, `lint:shell` pass

**Status:** ✅ PASS

- Code evidence: implementation report, Step 3 (5364 tests, 0 fail; bundle 0 problems; `✓ finalise`; shellcheck clean)
- Test evidence: the same gates run per PR in `.github/workflows/test.yml`, `validate.yml`, `shellcheck.yml`

#### AC7: Each Phase 4 mutation goes red under bash, restore checked by `cmp`

**Status:** ✅ PASS

- Code evidence: implementation report, Step 3 (M1–M7 red, all restored)
- Test evidence: `shared/resources/tests/resolve-pr-number.test.mjs:167`, `:111`, `:297`

#### AC8: CHANGELOG `[Unreleased]` entry cites (task 175)

**Status:** ✅ PASS

- Code evidence: `CHANGELOG.md:80`
- Test evidence: documentation criterion

### Documentation

- **CHANGELOG.md [Unreleased] entry for task 175**: ✅ PASS — `CHANGELOG.md:80`
- **Skill file updated where behaviour changed**: ✅ PASS — `skills/finalise/SKILL.md:477`

**Agent summary:** All 8 success criteria pass; the four behaviour criteria each have code and a per-PR test. CI's test job installs zsh, so CI runs `SHELLS=[bash, zsh]` — broader than the implementation report said.

---

## Step 3: Security Review

**Story Type:** task
**Overall Security Status:** ❌ FAIL — the probe zero-guard (no engine entry form reaches the boundary)

### No hardcoded secrets introduced

**Status:** ✅ PASS
- Evidence: `shared/resources/resolve-pr-number.sh:1-151`

### No new unsafe patterns

**Status:** ✅ PASS
- Evidence: `shared/resources/resolve-pr-number.sh:134`
- Note: no new `eval`/`exec`; every PR number reaching `gh` is digits only (`--pr` checked at `:61`, the lock at `:107`, the body by `grep -oE '[0-9]+'`)

### probe mode executed no candidates

**Status:** ❌ FAIL (severity: medium)
- Evidence: `shared/resources/resolve-pr-number.sh:50-59`
- Note: no entry form reaches the script. `shell:` passes one positional fixture directory and the script parses `--doc <path>`; `shell-fn:` hits the top-level parser; `cli:` takes only `.mjs`/`.js`; `shell-argv:` (task.181) does not exist; the branch and body rungs are networked through `gh`.

### General Security

- **security TODOs/FIXMEs**: ✅ PASS
- **dependency risk**: ⚠️ NOT_APPLICABLE — no `package.json` change

### Probe Results

**Candidates executed:** 14 by the engine — **reproduced:** 9 as scored, **0 real**

The security agent could not run the engine (read-only), so `/finalise` ran its `probe_command` itself:
`node shared/resources/security-probe.mjs --sink filename --entry 'shell:shared/resources/resolve-pr-number.sh' --repo-root . --record docs/tasks/task.175.finalise-pr-number-from-branch/task.175.dod.1.security.run.json --json`
→ `verdict: absent`, `reason: no-hostile-case-was-rejected`, 14 executed, 0 passed, 9 hostile accepted, 5 legitimate overblocked.

**Those 14 runs measured the argument parser, not the control.** The `shell:` form runs `bash <script> <fixture-dir>`, and the script answers every such call with `usage … unknown argument '<dir>'` and exit 2 (reproduced by hand on this head). No case reached a rung, so every case mismatched the `filename` corpus's expected output: the task.125 "absent behind a full count" shape. They are not findings against the resolver, and the count is not evidence that the boundary was probed.

❌ **Probe mode executed no candidates against the control.** The engine declined the boundary in effect, by entry-form mismatch. Only two remedies clear this guard: make the entry reachable (task.181's `shell-argv:` form, or a sourceable function form), or a recorded human override. The executed fixture suite (`resolve-pr-number.test.mjs`: another branch's cited PR refused, another directory's lock skipped, a body `pr_number:` line ignored, a stale frontmatter number outranked; mutations M1–M3 red) is evidence for that override, labelled so, never a closure.

- Probe run by /finalise — the security agent could not execute it

**Agent summary:** Boundary is true; `probes_executed` against the control is 0 because no entry form reaches it. The checklist is otherwise clean: no secrets, no new eval/exec, no dependency changes.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** None — NOT_APPLICABLE

### GDPR / PCI-DSS / WCAG / HIPAA

**Status:** ⚠️ NOT_APPLICABLE
- Note: internal tooling — a shell resolver, skill and prompt prose, tests. No personal, payment or health data; no UI.

**Agent summary:** All four compliance areas are not applicable.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

### CHANGELOG.md updated

**Status:** ✅ PASS
- Evidence: `CHANGELOG.md:80`

### API/type-specific docs updated

**Status:** ✅ PASS
- Evidence: `skills/finalise/SKILL.md:477`

### README / architecture docs updated

**Status:** ⚠️ NOT_APPLICABLE
- Note: internal behaviour of `/finalise`; no public surface changed

**Agent summary:** CHANGELOG cites task 175; finalise SKILL.md and the prompts are updated and bundled.

---

## Step 5: Acceptance Decision

**Decision:** ❌ NOT ACCEPTED - GAPS IDENTIFIED

**Summary:**

- QA Report: ✅ PASS (Quality Score: 100/100)
- Acceptance Criteria: ✅ 8/8
- PR Review & Tests: ✅ 5c APPROVE (no reviews required by the host)
- CI reading 1: SUCCESS @ `545ca1bd14e6` over 5 checks
- Documentation: ✅ PASS
- Security Review: ❌ FAIL — probe zero-guard
- Compliance Review: ⚠️ NOT_APPLICABLE

**Blocking Issues:**

1. Security: `probe mode executed no candidates` — no `security-probe.mjs` entry form reaches `shared/resources/resolve-pr-number.sh` (a flag-parsed, `gh`-networked shell script). The engine's 14 runs measured the argument parser only. Closing this needs either task.181's `shell-argv:` form, or a **recorded human override** citing the executed fixture suite (the task.125, task.133 and task.188 precedent).

Fix-and-recheck (Step 8a) does not apply: the finding is `medium` and no code change in this run can close it.

**Outcome:** Task does NOT meet the Definition of Done on the security zero-guard alone. Every other criterion passes.

---

## Verification Complete

**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED

**Completion Time:** 2026-10-12 06:28 UTC
**CI reading 1:** SUCCESS @ `545ca1bd14e6` (5 checks) — the decision reading

**Blocking Issues Summary:**

1. Security probe zero-guard — no engine entry form reaches the resolver; needs task.181 or a recorded human override.

**Estimated Effort to Close Gaps:** Small — a recorded override (DoD run 2), or Large — task.181 `shell-argv:`

**Artifacts Generated:**

- ✅ Gap report added to the task document
- ✅ Probe record `task.175.dod.1.security.run.json` (with an explanation above: it measured the argument parser)
- Outward side-effects (the gaps PR comment) are recorded in the implementation report

**Next Steps:**

- A human decides: record a security override and re-run `/finalise` (no code change, so it resumes at Step 7), or wait for task.181
- Re-run verification after that decision
