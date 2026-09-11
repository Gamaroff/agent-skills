# QA Report: Task 107 — cycle 2 re-review

**Task**: [task.107.bug-runbook-rewrite.md](./task.107.bug-runbook-rewrite.md)
**Gate File**: [task.107.gate.2.bug-runbook-rewrite.yml](./task.107.gate.2.bug-runbook-rewrite.yml)
**Previous Gate**: [task.107.gate.1.bug-runbook-rewrite.yml](./task.107.gate.1.bug-runbook-rewrite.yml) — FAIL, 70/100
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-11
**Gate Status**: PASS

---

## Executive Summary

All four cycle-1 findings are fixed, each re-verified **against its source of truth rather than
against the fix description**. The refute pass found one new defect of the same class as the original
HIGH — the page asserting a specification it had inferred — which was corrected within the cycle. All
eight success criteria are now met.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

**Re-review scope: unscoped** — cycle 2 is always a full refute pass over the whole branch diff, per
the QA loop contract. Narrowing to files changed since the last gate would have read only cycle 1's
own repairs, and the original HIGH was in the *first* commit.

`SAFETY_REPROBE` evaluated **false** — the prior gate's security axis read `status: PASS` /
`evidence: reasoned`, which is a clean reading, not a failure.

**Refute directive applied.** The question was not "are the fixes present" but "is any claim in them
false".

> **The dispatched refute subagent did not return.** It was killed after ~13 minutes unresponsive —
> the second subagent hang this run. The pass was performed in-line instead, and the checks below are
> what was actually executed. Recorded so that the substitution is visible: an independent second
> reader did **not** review cycle 1's fixes, though one did review the original change in cycle 1.

---

## Re-Review Context — the four cycle-1 findings

| Finding | Status | How it was verified |
| :--- | :--- | :--- |
| **TASK-107-001** (high) — wrong mechanism named on the GitHub arm | **FIXED** | Each clause of the replacement checked against source: `invokes: [sync-jira-bug]` present in `ensure-bug-jira-issue` ✓; its create step titled "Create via `sync-jira-bug` Delegation" ✓; `grep -c 'sync-github-bug' skills/ensure-bug-github-issue/SKILL.md` → **0** ✓; all five inline steps named in the page (dedup, create, sub-issue, board+Priority, frontmatter write-back, Status History) present in the skill ✓ |
| **TASK-107-002** (medium) — verification block did not run as documented | **FIXED** | The corrected block executed against **`bug.11`, a different directory from the one it names**, to check it is not fitted to its own example: prints `status: closed`, `**Status**: ✅ Closed`, `1`, `0` — exactly its comments. The `REPORT="$BUG/$(basename "$BUG").md"` assumption tested against **all 12** general bugs: 12/12 resolve |
| **TASK-107-003** (low) — artifacts-directory claim | **FIXED** | Text now scopes the own-directory shape to general bugs |
| **TASK-107-004** (low) — length | **FIXED** | 200 → 198 at the time of fix; the cycle-2 correction returned it to 200, still inside Success Criterion 8. Trim diff reviewed (47 added / 49 removed) — no fact dropped, no sentence broken |

> **One of this cycle's own checks was the defective one, not the deliverable.** The first pass at
> verifying TASK-107-001 used `grep -rc 'sync-github-bug' <file>`, which prefixes the filename
> (`SKILL.md:0`), so the comparison against `"0"` failed and the clause reported FALSE. `grep -c`
> gives `0` and the claim is true. Recorded because a reviewer's broken instrument reporting a real
> defect is indistinguishable from a real defect until the instrument is checked — which is the
> `grep -c` idiom already in this repo's observation log.

---

## New Findings This Cycle

**One.**

- **[low]** `docs/runbooks/bug-fix.md` — the page asserted *"Story and task bugs produce the same set,
  prefixed `story.{e}.{s}.bug.{n}.` / `task.{id}.bug.{n}.`, in the parent's directory rather than one
  of their own."* That filename shape is specified **nowhere**: `file-naming.md` gives story/task bug
  *reports* but no bug-run companion artifacts; `bug-documents.md` gives the general-bug directory as
  report + "optional co-located evidence". And it has **zero instances** — 62 story/task bug files
  exist in the corpus, and `find docs -name '*.bug.*.dod.*' -o -name '*.bug.*.review.*' -o -name
  '*.bug.*.implementation.*'` returns **0**. The page was asserting a specification it had inferred
  from the general-bug case.

  This is the same class as TASK-107-001 — a runbook stating something its sources do not say — which
  is precisely what the refute pass exists to catch on the cycle after. **Corrected within this cycle**
  (gate entry `status: closed`): the page now states what is established, cites `file-naming.md`, and
  says plainly that no story or task bug has yet been through `/develop-bug`, so its companion naming
  is not established by example.

---

## Success Criteria Verification

| # | Criterion | Cycle 1 | Cycle 2 |
| --- | --- | --- | --- |
| 1 | Names `/develop-bug` and `/review-bug`, actual step order | PASS | PASS |
| 2 | Three bug modes, each with pattern + numbering rule | PASS | PASS |
| 3 | Tracker-sync step on both arms, naming which skill does it | **FAIL** | **PASS** |
| 4 | No `## Change Log` in bug-report guidance | PASS | PASS (0) |
| 5 | `which-path.md` routes a reported bug to the bug path | PASS | PASS |
| 6 | Hotfix boundary callout unchanged | PASS | PASS |
| 7 | Every internal link resolves against the tracked tree | PASS | PASS (19 links, 0 dead) |
| 8 | `bug-fix.md` ≤ 200 lines | PASS (marginal) | PASS (200) |

**8 of 8.**

Additionally re-checked, because a mismatch between them is a defect this repo has hit before:
`which-path.md`'s flowchart and prose fallback agree exactly — Q1 defect? → Q2 production? → Q3
user-facing? → Q4 multi-stream? — and the quick-reference table agrees with both.

---

## NFR Assessment

**Performance** PASS · **Reliability** PASS · **Security** PASS (`reasoned`, 0 probes — documentation
only) · **Maintainability** **PASS**, upgraded from CONCERNS: the restatement surface that produced
both TASK-107-001 and TASK-107-005 is reduced. The page now links `file-naming.md` and the sync skills
rather than paraphrasing them, and where nothing is established it says so instead of inferring.

---

## Test Artifacts

```bash
npm run ci:fast                                   # 3155 pass / 0 fail / 1 skipped
npx markdown-link-check@3 --config … bug-fix.md   # 19 links, 0 dead
gh pr checks 387                                  # test, link-check, shellcheck, branch-policy — all pass
# the corrected verification block, run against bug.11 rather than the bug.12 it names
# the REPORT= assumption, run against all 12 general bug directories — 12/12 resolve
```

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: every cycle-1 finding fixed and independently re-verified; the one new finding was
corrected in-cycle; all eight success criteria met.
**Quality Score**: 95/100 — held back from 100 by the two subagent hangs, which mean parts of this run
were verified by one reader rather than two.

**Deployment Recommendation**: APPROVED

---

**Next Steps**: Step 5c — `/review-pr` conformance review, the loop's exit gate.
