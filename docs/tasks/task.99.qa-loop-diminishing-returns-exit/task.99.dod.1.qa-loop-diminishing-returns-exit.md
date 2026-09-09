# Definition of Done Verification

**Task:** task.99.qa-loop-diminishing-returns-exit
**Verification Started:** 2026-09-09
**Status:** COMPLETED — ACCEPTED

> **The four DoD checks ran in-line, not as four parallel Explore subagents.** Subagent dispatch was
> outside this session's remit. Recorded here as it was in every QA cycle, because it is the one
> weakness that runs through this entire pipeline run: the reviewer was the author throughout. What
> partly offsets it — and is the reason the security section below is the most valuable in this file
> — is that the checks which found things were the ones that **executed** code rather than read it.

---

## Step 1: QA Report Review ✅

**QA Reports:** `task.99.qa.{1..5}.*.md` · **Gate files:** `task.99.gate.{1..5}.*.yml`

**Final gate:** `task.99.gate.5.qa-loop-diminishing-returns-exit.yml` — **PASS**, quality score
**100/100**, `top_issues: []`.

**Gate series:** FAIL 50 → FAIL 60 → CONCERNS 90 → CONCERNS 90 → **PASS 100**.
**HIGH sequence:** `1, 1, 0, 0, 0`.

**NFR (gate 5):** Security PASS · Performance PASS · Reliability PASS · Maintainability PASS.
**Immediate recommendations:** none. **Future:** 6, all recorded and deliberately unfixed.

**Prior-run acceptance blocks in the body:** 0. This is run 1; nothing was inherited.

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS — **12 / 12**
**PR Status:** OPEN (PR #361) · **PR Review Decision:** see the caveat below

All twelve were re-verified mechanically at QA cycle 5 and again by `/review-pr` at Step 5c: section
line numbers (419, between 334 and 522), `node --test` 34/34, three `testArtifactGlobs` occurrences in
`configuration.md`, the byte-identical Convergence check (5624 bytes both sides), and a zero-diff
`npm run bundle`. The full traceability table is in
`task.99.pr-review.1.qa-loop-diminishing-returns-exit.md`.

> **⚠️ There is no human approval on this PR, and that should be stated rather than implied.**
> `reviewDecision` is empty. What stands in its place is Step 5c — `/review-pr`, the QA loop's exit
> gate — which returned **CONCERNS** (non-blocking) with zero code findings. That is this pipeline's
> designed review path and the same basis on which tasks 75, 84 and 95 were accepted in this
> repository. It is not the same thing as a second pair of human eyes, and this run had none.

**Criterion 2 was corrected during implementation** from "cycle 2" to "cycle 3" — the task's own rule
cannot fire at cycle 2 on a `2,0,0,0` sequence — with the arithmetic and the cost (one cycle saved on
the recorded run, not two) argued in the document rather than silently applied.

---

## Step 3: Security Review

**Task type:** infrastructure (runnable prose + a pure predicate library)
**Overall Security Status:** ✅ PASS

| Check | Status | Evidence |
| :--- | :--- | :--- |
| No credential handling | ✅ PASS | The module reads no env, opens no files, makes no network call |
| No filesystem access | ✅ PASS | Asserted by test — the source is grepped for `node:fs` and the sync readers |
| No child processes / `eval` | ✅ PASS | None present |
| No new dependencies | ✅ PASS | The repo still declares zero production runtime dependencies |
| Untrusted input | ✅ N/A | Both inputs are committed repo files: `skills-config.yaml` and a gate `.yml` |

### Probe Results

**boundary: true** — the deliverable is a **predicate**: it decides `exit` / `continue`. Probe mode
therefore fired: candidate inputs were generated and **executed against the shipped code**.

**Candidates executed: 7 — reproduced: 1** (now fixed; re-run after the fix: **7 executed, 0
reproduced**).

```
✅ P1  regex alternation in a glob is literal, not alternation
✅ P2  `.` in a glob is literal
✅ P3  `../` in a `file:` value is inert data — there is no filesystem operation to traverse
✅ P4  `__proto__` in a gate entry cannot pollute Object.prototype
❌ P5  a pathological glob HUNG                        ← REPRODUCED
✅ P6  a 5000-entry gate scans linearly (50ms)
✅ P7  no malformed input yields `exit` — the unsafe direction is closed
```

**P5, reproduced and fixed.** `*` × N compiled to `[^/]*` × N — adjacent quantifiers, the textbook
catastrophic-backtracking shape. Measured on the shipped code against a 60-character path:

| stars | 8 | 10 | 12 | 14 |
| :--- | :--- | :--- | :--- | :--- |
| time | 15ms | 193ms | 2.2s | **23s** |

It does not stop; it takes ~10× longer per star.

**Assessed as a hang, not a vulnerability.** Both inputs are repo-controlled, so there is no
untrusted-input path and no remote vector. What it *is* is a self-inflicted stall inside the QA loop,
triggered by an unusual but entirely legal config.

**Fixed** in commit `38d37885`: runs of `*` collapse to two before compiling. That is a no-op on
**meaning** — three or more consecutive stars mean exactly what two mean in glob semantics — which is
what makes the fix safe rather than a behaviour change. Regression test asserts the 40-star case
completes, that `***` ≡ `**` and `****/x` ≡ `**/x`, and that the single/double-star distinction
survives the collapse. **Mutation-proved**: removing the collapse takes the 12-star case from 1ms to
3301ms (3301×); at the test's own 40 stars the mutated build never finishes, which is why the proof is
measured at 12 rather than run through `node --test`.

> **This is the finding worth the whole run.** Four QA cycles of review walked past it. Probe mode
> found it on its first pass, because it ran the predicate instead of reading it — which is the
> distinction `review-security` exists to draw, holding here on a live deliverable.

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** none. No personal data, no payment data, no health data, no user-facing
interface, no authentication surface. The change is a developer-tooling predicate plus documentation
in a library repository.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

| Item | Status | Evidence |
| :--- | :--- | :--- |
| `CHANGELOG.md` | ✅ PASS | Two `### Added` entries — the exit and `qa.testArtifactGlobs` — under `[Unreleased]` |
| Configuration reference | ✅ PASS | `docs/reference/configuration.md` — schema block, key-reference row, prose section |
| The runnable-prose contract | ✅ PASS | The *Diminishing-returns exit* section, its 5c route, the `**Loop exit**` row, the escalation note |
| Bundled copies | ✅ PASS | `npm run bundle` → 0 files changed |
| Skill catalog | ⚠️ N/A | No `SKILL.md` changed, so `generate-catalog` has nothing to regenerate |
| Task registry | ✅ PASS | Row 99 updated (PR review finding PC-1) |
| Cross-links | ✅ PASS | Both new links resolve from their source directories |

---

## CI Verification

**`CI_ROLLUP` = SUCCESS**, sampled on head `38d37885` — the commit carrying the probe fix, not an
ancestor.

| Check | Result |
| :--- | :--- |
| `test` | SUCCESS |
| `validate` | SUCCESS |
| `link-check` | SUCCESS |
| `shellcheck` | SUCCESS |
| `PR into main comes from an allowed branch` | SUCCESS |

Locally, **`npm run ci`** — the full merge-gate tier, `ci:fast` **plus `eval:all`** — exits 0 at
**2938 tests, 0 failures**.

> **The probe fix postdates gate 5, and that is stated rather than glossed.** Gate 5 (PASS 100/100)
> was written against commit `4d7e3bcd`. Commit `38d37885` came afterwards, from this DoD step. What
> covers it is not gate 5: it is its own mutation-proved regression test, the full 2938-test suite,
> the seven re-run probes, and a green CI rollup on that exact head. A green gate is a statement about
> a commit, not a property of a task — the same rule this repo's `qa-task` re-review logic states, and
> it cuts both ways.

---

## Step 5: Acceptance Decision

**Decision:** ✅ ACCEPTED

| Category | Result |
| :--- | :--- |
| Acceptance Criteria | ✅ PASS — 12/12 |
| PR Review | ⚠️ ADVISORY — 5c CONCERNS, no human approval (see caveat) |
| CI | ✅ SUCCESS on the final head |
| Security | ✅ PASS — 7 probes executed, 1 reproduced and fixed, 0 remaining |
| Compliance | ⚠️ NOT_APPLICABLE |
| Documentation | ✅ PASS |
| QA Gate | ✅ PASS (100/100) |

**Outcome:** the task meets the Definition of Done.

**Known limitations, carried forward rather than hidden:**

1. Three latent LOWs in `recommendations.future` — `indentOf` and tab indentation, `readNfrStatuses`
   and block-scalar `status:`, and one preamble wording. Deliberately unfixed: refining them is the
   behaviour the shipped rule exists to end.
2. No tracker issue is linked, so this work is invisible on the project board. Deliberate — an
   autonomous run must not create a remote issue unprompted.
3. `mutation-proving.md` names four vacuity shapes; this task surfaced a **fifth** — a fixture corpus
   containing no instance of the input class, which no mutation can reveal. Worth its own task.
4. The whole run had no independent reviewer. Every review lens ran in-line, in the context that
   authored the change.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-09-09

**Artifacts Generated:**

- ✅ Task document updated with the DoD section and `status: accepted`
- ✅ Sprint Review summary created
- ✅ Canonical PR comment posted
- ⚠️ Tracker issue: **N/A** — no `github_issue:` linked, so close and board move are no-ops
- ⚠️ Project board: **N/A** — same reason
