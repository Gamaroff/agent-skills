# Definition of Done Verification — run 2

**Task:** task.84.skill-install-profiles
**Verified:** 2026-09-05
**Status:** COMPLETED — ACCEPTED
**Supersedes:** [`task.84.dod.1.skill-install-profiles.md`](./task.84.dod.1.skill-install-profiles.md) (5 blockers, all now closed)

---

## Decision: ✅ ACCEPTED

| DoD column | Result |
|---|---|
| All acceptance criteria met | ✅ 21/21, each with named evidence |
| Tests & PR approved | ⚠️ **See the note below** — tests yes, formal review no |
| CI green | ✅ all four checks SUCCESS on the final head |
| Documentation updated | ✅ `configuration.md`, `getting-started.md`, `create-skill`, CHANGELOG |
| Security | ✅ PASS |
| Compliance | ⚠️ N/A — installer wizard and resolver |
| QA gate | ✅ **`gate.4` PASS (95/100)** |

**Merge gate:** `npm run ci` — 2424 tests, 0 failures; 25 eval scenarios, every assertion passed.

---

## The two criteria I had recorded as unmeetable

Both were met, and neither should have been written off.

**`shellcheck` — recorded as "not installed, no lane" across three gates.** Docker was available the
whole time, and this repository's own roadmap records task 83 running shellcheck in the official
container. When finally run it found a **new SC2155** on a line this change added —
`local _dry_cli="$(dirname …)"`, *declare and assign separately to avoid masking return values* — the
same defect class this change explicitly guards against two functions away. Fixed; baseline 1
finding, branch 1 finding, **0 new**.

**A real `--update` — recorded as impractical.** It is not. A tarball built from the branch, served
over `file://`, against a scratch consumer holding all 120 skills:

```
✓ Skills vTEST installed (0 new, 36 updated, 11 kept, 73 kept outside profile)
120 before → 120 after · nothing deleted · 84 sentinel files intact
```

The dispositions matter as much as the count: the 11 Jira-only skills were kept via the **tracker**
path, the 73 others via the **profile** path, and only the 36 in the resolved set were refreshed.
That confirms fixes C1-005 and C1-006 by execution, where before they were asserted only against the
script's source text.

> **The lesson is the one worth keeping.** Recording a check as *unrunnable* is a claim, and it
> deserves at least the scrutiny of recording it as *passed* — arguably more, because it removes the
> check from the process rather than reporting on it. Three gates carried the shellcheck claim
> unexamined, and the check found a real defect on the first attempt.

---

## The approving-review column

**No review was recorded on PR #318.** The merge was authorised by the maintainer's explicit
instruction, twice, after being shown the full picture: 27 defects across four passes, every pass
finding the previous pass's fixes defective.

That is a legitimate authorisation and it is how this repository is maintained. It is **not** the
same as a review having happened, so this column is annotated rather than ticked. Anyone reading
this later should know which of the two occurred.

---

## Quality trail

| Pass | Gate | Findings |
|---|---|---:|
| QA cycle 1 | CONCERNS 80 | 11 |
| QA cycle 2 (refute) | CONCERNS 80 | 5 — 2 HIGH, both from cycle 1's fixes |
| QA cycle 3 (confirm) | CONCERNS 80 | 5 — 2 HIGH, 3 from cycle 2's fixes |
| Step 5c `/review-pr` | REQUEST CHANGES | 10 — 4 HIGH |
| QA cycle 4 (confirm) | **PASS 95** | **0** |

27 defects found and fixed. Every load-bearing guarantee mutation-proven, with the mutation asserted
to have applied before the result was believed.

## Residual, carried forward deliberately

`install_skills` has no behavioural unit coverage — the real `--update` above is a manual
verification, not a CI test. Four cycles have noted it. The fix is to extract the per-skill decision
into a helper so the eight-case truth table runs in CI; that is a change to the only code here that
can delete a user's skills, and it belongs in its own task where it can be reviewed on its own
merits rather than inside a QA loop. `gate.4` records maintainability as CONCERNS for this reason.

---

**Final Status:** ✅ ACCEPTED
