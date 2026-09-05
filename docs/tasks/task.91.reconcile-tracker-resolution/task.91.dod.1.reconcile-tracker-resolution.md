# Definition of Done Verification

**Task:** task.91.reconcile-tracker-resolution
**Verification Started:** 2026-09-05
**Status:** COMPLETED — ACCEPTED

---

## Step 1: QA Report Review ✅

**QA Reports:** `qa.1`, `qa.2`, `qa.3`, `qa.4` — one per cycle, all present.
**Gate Files:** `gate.1` (FAIL 70), `gate.2` (FAIL 70), `gate.3` (CONCERNS 80), **`gate.4` (PASS 95)**.
**Step 5c PR review:** `task.91.pr-review.1.*` — REQUEST CHANGES → remediated in-cycle → **APPROVE**.

**Final gate status:** ✅ PASS · **Quality score:** 95/100 · `top_issues: []`

**Prior-run acceptance blocks:** 0 — this is a first finalise, nothing to supersede.

**Convergence across the loop:**

| Gate | HIGH | MED | LOW | Decision |
| --- | --- | --- | --- | --- |
| 1 | 1 | 4 | 5 | FAIL (70) |
| 2 | 1 | 1 | 1 | FAIL (70) |
| 3 | 0 | 1 | 1 | CONCERNS (80) |
| 4 | 0 | 0 | 0 | **PASS (95)** |

The gate-2 HIGH was a **new** defect introduced by the gate-1 fix, not gate-1's left unresolved — so no
file carried a HIGH into a third consecutive gate and the third-strike rule never fired.

**NFR validation (gate.4):** Security ✅ · Performance ✅ · Reliability ✅ · Maintainability ✅

---

## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ⚠️ **PARTIAL** — 5 of 6 functional criteria fully evidenced, 1 partial.
**PR Status:** #320 OPEN, `feature/task.91.reconcile-tracker-resolution` → `develop`
**PR Review Decision:** no formal GitHub review requested; the pipeline's own gate (`gate.4` PASS) and
Step 5c (`APPROVE`) are the review of record.
**Head-SHA parity:** local `e8312febbf5b` == PR head `e8312febbf5b` ✅ — the tested commit is the PR's.

### Functional criteria

| # | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| F1 | No config shape resolves differently install vs run | 12 `PARITY_CASES` + 12 `DOTENV_CASES`, each asserting `install == runtime`; 17 shapes re-run by hand each cycle | ✅ |
| F2 | `.env`-only `JIRA_URL` installs the matching set | unit `install and run time agree on a .env-only JIRA_URL` + integration `a .env-only JIRA_URL installs the set its skills will actually resolve` (asserts the on-disk set against `runtimeTracker(dir)`, not a hardcoded value) | ✅ |
| F3 | Unrecognised scalar graded the same at both ends | `PARITY_CASES` `tracker: bitbucket → <refused>`; `an illegal tracker: is still refused…` | ✅ |
| F4 | `tracker:<TAB>jira` graded the same | `PARITY_CASES` tab row | ✅ |
| F5 | Map form still `auto` at both ends | `PARITY_CASES` map row; `__MAP__ → auto` preserved | ✅ |
| F6 | `access.tracker` never read as a platform | `PARITY_CASES` `access.tracker`-only row asserts `github` at both ends. **But** `tracker-access.test.sh` asserts `ACCESS_TRACKER` without ever asserting `TRACKER` stays `github` for its own fixtures | ⚠️ **partial** |

### Code quality criteria

| # | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| CQ1 | `npm run ci` green | 2450 tests, 0 failures, exit 0 | ✅ |
| CQ2 | shellcheck no new warnings | `setup-consumer.sh` 1 vs baseline 1 (same pre-existing SC2209); `resolve-platform.sh` 20 vs baseline 20 | ✅ |
| CQ3 | Every behaviour change mutation-proven | 10 proofs recorded across the loop. Bugs 3, 4 and 6 record **none** | ⚠️ **partial** |
| CQ4 | `npm run bundle` run and committed | 38 resolver + 38 `platform-detection.md` copies verified in sync | ✅ |

### Migration criteria

| # | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| M1 | CHANGELOG names affected repos and the opt-out | ⚠️ BEHAVIOUR CHANGE block with "Who is affected, and the one-line opt-out" and a three-shape before/after table | ✅ |
| M2 | `DELIBERATE asymmetry` test updated or removed | Replaced in place; history preserved in a HISTORY comment | ✅ |

### The two partials, stated rather than papered over

**F6** — the `PARITY_CASES` row does pin that an `access.tracker`-only config resolves `github` at both
ends, which is the criterion as written. What is *not* pinned is the same property inside
`tracker-access.test.sh`, the suite that exists specifically to exercise the access axis. A future
change there could start leaking `access.tracker` into `TRACKER` and only the installer's suite would
notice. Pre-existing, outside this task's §4 scope, carried to a follow-up.

**CQ3** — bugs 3, 4 and 6 are message-, provenance- and comment-only changes with no behaviour to
revert, so a mutation proof is not available in the usual sense. That is a defensible reason and it was
**never written down**, which is the actual gap. Recorded here so the next reader does not have to
reconstruct it.

Neither partial blocks acceptance: F6's criterion is met by the evidence the criterion names, and CQ3's
missing proofs are for changes with no revertible behaviour.

---

## Step 3: Security Review ✅

**Overall Security Status:** ✅ PASS

| Check | Status | Evidence |
| --- | --- | --- |
| `.env` is parsed, never sourced | ✅ | No `source .env` / `. .env` anywhere in `resolve-platform.sh` — verified with an anchored pattern; the only textual match is a comment. Reading is an `awk` parse. This matters: sourcing would execute whatever a checked-in file contains |
| Resolver runs contained | ✅ | `_resolve_install_tracker` runs it in a `bash -c` subshell, so a `return 1` cannot abort the installer |
| No hardcoded credentials introduced | ✅ | 0 candidates across the branch diff |
| Trust boundary on a located file | ✅ | `_locate_resolver` selects on readability alone, so the answer is now validated against `{jira, github}` before use — closed in cycle 3 (TASK-91-009) after a planted `TRACKER=bitbucket` was shown to make the filter keep every skill |
| Failure modes are loud, not silent | ✅ | Every refusal path emits an explanation naming the file; the four routes to a silently inert filter found across the loop are each closed and pinned |

**Boundary probe:** this change *is* a boundary deliverable (a resolver that grades config input), and it
was probed adversarially rather than only reviewed — planted resolvers that were truncated, silent,
returned non-zero, or emitted an illegal value; `.env` files that were directories, empty, CRLF, quoted,
`export`-prefixed and duplicated. **Every probe that reproduced a defect became a finding and was
fixed**; the boundary now holds against all of them.

---

## Step 4: Compliance Review ⚠️ NOT_APPLICABLE

No GDPR, PCI-DSS, WCAG or HIPAA surface. This is developer tooling — an installer and a shell resolver —
with no user data, no UI and no regulated processing.

---

## Step 4b: Docs & Changelog ✅

| Item | Status | Evidence |
| --- | --- | --- |
| `CHANGELOG.md` | ✅ | ⚠️ BEHAVIOUR CHANGE block naming the affected shape, the one-line opt-out, and why no wizard-generated config can reach it |
| `platform-detection.md` (canonical source of truth) | ✅ | Re-synced at Step 5c with a per-spelling table; **had been two commits stale**, asserting a `^JIRA_URL=.+` pattern neither side uses — caught by the conformance lens, not by four QA cycles |
| `docs/reference/configuration.md` | ✅ | `tracker` row records that an unrecognised scalar now halts at install time too, and the full fallback order |
| Task document | ✅ | Phase 1 Decision recorded in §3 *before* the code, as the plan required; §10 records the outcome and the `risk_level` rationale; Known Issues rewritten to what actually happened |
| Bundled copies | ✅ | 38 skills carry both updated files |

---

## Step 5: Acceptance Decision

**Decision:** ✅ **ACCEPTED**

| Column | Result |
| --- | --- |
| All acceptance criteria met | ⚠️ PARTIAL (5/6 full, F6 partial — criterion as written is met) |
| Tests & PR approved | ✅ gate.4 PASS + Step 5c APPROVE |
| **CI green** | ✅ **SUCCESS** — all 4 jobs (`validate`, `test`, `link-check`, branch guard) COMPLETED/SUCCESS on head `e8312feb` |
| Docs updated | ✅ PASS |
| Security passed | ✅ PASS |
| Compliance passed | ⚠️ NOT_APPLICABLE (counts as pass) |
| QA gate | ✅ PASS (95/100) |

### On the CI gate specifically

`/finalise` treats CI as a **hard** DoD gate, with a documented history of accepting work while its CI
was still running on a job that then failed. This run's invoking directive said not to gate on it
because CI was `PENDING` at the previous check. **That directive was wrong and was not followed** — the
skill's rule wins over a caller's convenience. The rollup was re-sampled and came back `SUCCESS` on the
final head, so the gate passes on evidence rather than on assumption. Had it still been `PENDING`, the
correct outcome would have been gaps, not acceptance.

**Outcome:** the task meets the Definition of Done. Two partials are recorded above with their reasons
and neither blocks acceptance.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-09-05
**QA Cycles:** 3 recorded fix cycles across 4 gates

**Artifacts:**

- ✅ Task document updated — `status: accepted`, `completed_date`, `pr_number`, DoD section
- ✅ Sprint Review summary created
- ✅ Canonical PR comment posted (idempotent via marker)
- ✅ Issue #319 commented and closed
- ✅ Board `done` stage signalled

**Carried to follow-ups** (neither blocking, both outside §4 scope):

1. `tracker-access.test.sh` should assert `TRACKER` stays `github` for its `access.tracker` fixtures.
2. `_config_skills_profile` / `_config_skills_list` remain hand-rolled awk YAML parsers — the same
   mirror-the-reader pattern this task removed for `tracker:`, and the obvious next task.
3. `SKILLS_JIRA_ONLY` / `SKILLS_GITHUB_ONLY` are still mirrored in `resolve-skill-set-cli.mjs`. One
   duplicated decision was removed; this one remains.
