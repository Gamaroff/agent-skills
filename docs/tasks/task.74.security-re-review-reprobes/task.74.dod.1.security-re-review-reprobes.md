# Definition of Done Verification

**Task:** task.74 — A security re-review must re-probe, not re-read
**Verification Started:** 2026-09-02
**Status:** IN PROGRESS

---

## Step 1: QA Report Review ✅

**QA Reports Found:** `task.74.qa.1.*.md` (cycle 1), `task.74.qa.2.*.md` (cycle 2)
**Gate Files Found:** `task.74.gate.1.*.yml`, `task.74.gate.2.*.yml`

**Final Gate (gate.2):** ✅ **PASS** · **Quality Score:** 100/100 · **QA Cycles:** 2

| Cycle | Gate | Score | Outcome |
| --- | --- | --- | --- |
| 1 | CONCERNS | 90/100 | 1 MEDIUM (CR-1 hang), 2 LOW |
| 2 | **PASS** | **100/100** | Refute pass found CR-2's fix ineffective → CR-4, fixed in-cycle |

**`top_issues` status:** 2 entries, **both `status: closed`** with `fixed_date: 2026-09-02`. Zero open.

**NFR validation (gate.2):** Security ✅ PASS · Performance ✅ PASS · Reliability ✅ PASS (upgraded from
CONCERNS) · Maintainability ✅ PASS

**Immediate recommendations:** none. **Future:** one — bug.7 gains a third data point (non-blocking,
not this task's defect).

**No prior-run acceptance block** in the document body (`grep -cE '^## Definition of Done.*(PASSED|✅)'`
returned 0), so nothing is inherited from a previous run.

---

## Verification Method

**Direct tools throughout** — Bash, grep, git and direct file reads. The four DoD checks were **not**
dispatched as parallel Explore subagents: this session carries a standing operator instruction against
the Agent tool. The checks themselves are unchanged; only the executor is. Each finding below cites the
command that produced it, so the evidence is reproducible rather than attested.

---
## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS
**PR Status:** OPEN (PR #299) · **Head:** `6e279f1` → later `fce…` (link fix) — matches local HEAD
**PR Review Decision:** no human review. See *Assumption recorded* below.

### Success Criteria

`grep -c '^- \[ \]'` over the task document returns **0 unchecked**, 46 checked. Each was verified by
execution rather than by trusting the checkbox:

| Criterion | Evidence |
| --- | --- |
| Re-review after a security FAIL runs unscoped | `SAFETY_REPROBE` disjunct present in both skills; probe returns `true` on `task.67.gate.1` under bash **and** zsh |
| **Cycle-3+** after a security FAIL runs unscoped | `[ "$PRIOR_GATES" -ge 2 ] && … && [ "$SAFETY_REPROBE" != "true" ]` — the `-ge 2` branch can no longer be reached when the trigger fires |
| `REFUTE_PASS` defined when the trigger fires | stated in the shared rule and both skills; the two directives compose, refute first |
| Non-safety CONCERNS keeps today's scoping | executed: CONCERNS-on-maintainability → `false` |
| Scope decision in Review Methodology | both strings present in both skills |
| New Findings section, required when empty | present in both templates; requirement stated **inside** the section (tightened after mutation M4 showed the file-wide check was vacuous) |
| `task.67.gate.1` triggers, `gate.2` does not | executed against the real fixtures, both shells |
| Artifact numbering / gate schema unchanged | no diff hunk touches either |
| Trigger needs a safety axis, not merely issues | 12 probe candidates, incl. adversarial shapes — see Step 3 |
| Unscoped zero-finding cycle states what searched | required inside the section; **this very DoD run exercised it** — qa.2's New Findings section names its search surface |

**One conditional per skill**, verified rather than assumed:

```
$ grep -c 'if \[ "$PRIOR_GATES"' skills/qa-task/SKILL.md skills/qa-story/SKILL.md
1
1
```

### Tests

`npm run ci:fast` → **EXIT=0**, 2202 pass / 0 fail. Parity suite **34/34**.

**The new test genuinely runs under the repo's test glob** — proven by subtraction, not by reading the
glob string:

```
glob alone                      → 181 tests
the new file alone              →  34 tests
glob with the file renamed away → 147 tests      (181 − 34 = 147 ✓)
```

---

## Step 3: Security Review

**Story Type:** task · **Overall Security Status:** ✅ PASS
**boundary:** `true` — the deliverable *is* a predicate that accepts or rejects (resolve `SAFETY_REPROBE`
from a prior gate), so probe mode fires.

### Probe Results

**Candidates executed: 12 — reproduced: 0.**

Candidates were generated and **executed against the shipped code** (the probe extracted verbatim from
`shared/resources/qa-re-review-scope.md`), not grepped for. Six go beyond anything the QA cycles named:

| Candidate | Expected | Result |
| --- | --- | --- |
| `security: {status: FAIL}` | `true` | ✅ |
| `security: {status: PASS}` | `false` | ✅ |
| `maintainability: FAIL`, no security axis | `false` | ✅ |
| **the word `FAIL` in `notes:` while `status: PASS`** | `false` | ✅ — the scan does not match on prose |
| security FAIL declared *after* another axis | `true` | ✅ — the `f` flag is not order-dependent |
| **`status: FAILED`** (superstring of `FAIL`) | `false` | ✅ — anchored, not substring |
| `FAIL` with trailing whitespace | `true` | ✅ |
| **key `security_extra:` rather than `security:`** | `false` | ✅ — anchored to the exact key |
| empty file | `false` | ✅ |
| **malformed YAML** | `false` | ✅ — degrades, does not throw |
| **empty `$LATEST_GATE`** | `false` | ✅ — and **does not hang** (this was CR-1) |
| **nonexistent `$LATEST_GATE`** | `false` | ✅ |

✅ **The boundary held** — every candidate returned its expected verdict.

### General Security

- **No credentials, tokens or secrets in the diff** — `git diff origin/develop...HEAD` scanned; the only
  matches are documentation of `BITBUCKET_*` / `JIRA_API_TOKEN` **variable names** in pre-existing
  prose, no values.
- **The change adds no execution surface.** It gates an existing `awk` invocation more tightly and
  closes its stdin. Strictly narrower than what shipped before.
- **A hang is a security-relevant defect on this surface, and it is closed.** CR-1 made a safety-gate
  evaluator block indefinitely with no diagnostic. Fixed, and mutation-proven (MF-1/2/3).

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** none. The change touches QA orchestration prose and a contract test. No personal
data, no payment path, no user-facing surface, no accessibility surface, no data retention.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

| Item | Status | Evidence |
| --- | --- | --- |
| `CHANGELOG.md` entry | ✅ PASS | `CHANGELOG.md:9` under `## [Unreleased] → Added`; committed in `92af48c`. Required — this changes observable QA behaviour |
| Task `## Change Log` | ✅ PASS | 5 rows this run: review-task, develop, qa-task ×2, qa-fix — one per pipeline event, `Version` bumped only by review |
| Shared rule authored | ✅ PASS | `shared/resources/qa-re-review-scope.md`, 149 lines |
| Bundled copies in sync | ✅ PASS | both skills' `references/` differ from source only by the AUTO-GENERATED header |
| Frontmatter (OKF) | ✅ PASS | `type`, `description`, `tags`, `updated: 2026-09-02` all present |
| **Relative links resolve in the TRACKED tree** | ✅ PASS | verified via `git worktree add --detach` — see finding below |

### Two documentation gaps were found and fixed during this DoD run

**1. Dead link — CI caught what the working tree hid.** Both QA reports linked `bug.7` by a relative
path. bug.7 lives only on the unmerged `docs/bug.7-…` branch (PR #298), so the link resolved for nobody
— CI's `link-check` went **red** on it. Replaced with the PR URL and re-verified against the *tracked*
tree via a detached worktree, which is the check that actually models CI.

**2. A third copy of the scoping rule, already stale.** `shared/resources/code-review-prompt.md` also
describes the ladder, and still told the reader that cycle ≥3 always narrows — no longer true once the
safety trigger fires. That is precisely the drift this task exists to prevent, in a file the task never
considered: Phase 1 says *"the two copies … are already a drift risk and this task should not add a
third"*, and there were three. Fixed by **cross-referencing** the shared rule rather than restating the
trigger, and re-bundled to all six consumers.

---
## Step 5: Acceptance Decision

**Decision:** ✅ **ACCEPTED**

| DoD column | Source | Result |
| --- | --- | --- |
| All success criteria met | direct verification | ✅ 46/46, 0 unchecked |
| Tests | `npm run ci` | ✅ **EXIT=0** — 2202 pass / 0 fail (incl. `eval:all`) |
| **CI green** | `statusCheckRollup` on `dff240db` | ✅ **SUCCESS** — 4/4 workflows, head matches local HEAD exactly |
| Docs updated | direct verification | ✅ PASS (2 gaps found **and fixed** during this run) |
| Security | probe mode, 12 candidates executed | ✅ PASS — boundary held, 0 reproduced |
| Compliance | applicability check | ⚠️ NOT_APPLICABLE (counts as pass) |
| QA gate | `gate.2` | ✅ PASS 100/100, 0 open `top_issues` |

### CI was checked, not assumed — and it was red first

The first sample returned **FAILURE**: `link-check` was red because both QA reports linked `bug.7` by a
relative path to a file that lives only on an unmerged branch. Working-tree checks could not see it;
CI checks out only tracked files. Fixed, re-verified against the tracked tree via a detached worktree,
and re-sampled to `SUCCESS` on a head that matches local HEAD.

Also worth recording: `test` was `IN_PROGRESS` with `conclusion: ""` in that first sample — the exact
empty-string case that reads as green under a naive `.conclusion // .state`. The rollup query
discriminated it correctly as PENDING.

### Assumption recorded

**This PR has no human review decision.** The review column is satisfied by the QA gate (PASS 100/100
over two cycles, the second a refute pass), the green CI rollup on the matching head, and the mutation
proofs, under the repository's ratified auto-merge policy. No human approval was sought and none is
claimed.

### Tracker

**N/A — no tracker issue.** `TRACKER=github` but this task carries no `github_issue`. That was a
deliberate, recorded decision at review time: four of the five most recent sibling tasks (67, 73, 75,
76) carry none either, so creating one would have departed from the prevailing convention. Rationale in
`task.74.review.1.security-re-review-reprobes.md` §Optional-1. Issue close and board move are therefore
not applicable, not failed.

**Outcome:** Task meets every Definition of Done criterion.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-09-02

**What this run found that the QA cycles did not:**

1. **A red CI link-check** — a relative link to a file on an unmerged branch. The documented trap:
   verify links against the *tracked* tree.
2. **A third, stale copy of the scoping rule** in `code-review-prompt.md`, still asserting that cycle
   ≥3 always narrows. The precise drift this task exists to prevent, in a file the task never named.

Both fixed within this run rather than deferred.

**Artifacts Generated:**

- ✅ Task document updated with DoD section, `status: accepted`, `completed_date`
- ✅ Sprint Review summary created
- ✅ Canonical PR comment posted
- ⚠️ Tracker issue close — **N/A**, no linked issue (recorded decision, not a failure)
- ⚠️ Project board move — **N/A**, same reason

**Next Steps:** ready for Sprint Review; `/develop-next` merges PR #299 and ticks T74.
