# Definition of Done Verification

**Task:** task.84.skill-install-profiles
**Verification Started:** 2026-09-05
**Status:** COMPLETED — GAPS IDENTIFIED

---

## Step 1: QA Report Review

**QA Reports Found:** `task.84.qa.{1,2,3}.skill-install-profiles.md`
**Gate Files Found:** `task.84.gate.{1,2,3}.skill-install-profiles.yml`
**PR Review:** `task.84.pr-review.1.skill-install-profiles.md` (Step 5c)

| Cycle | Gate | Score | Findings |
|---|---|---:|---|
| 1 | CONCERNS | 80/100 | 11 (0 HIGH, 7 MED, 3 LOW + 1 from the repo's stdout-drain guard) |
| 2 (refute) | CONCERNS | 80/100 | 5 — **2 HIGH, both introduced by cycle 1's fixes** |
| 3 (confirmation) | CONCERNS | 80/100 | 5 — **2 HIGH, 3 introduced by cycle 2's fixes** |
| 5c (`/review-pr`) | **REQUEST CHANGES** | — | 10 — 4 HIGH |

**No gate reads PASS.** 27 defects found and fixed across four independent passes.

---

## Step 2: Acceptance Criteria

19 of 21 §9 criteria met with named evidence (see `task.84.pr-review.1.*.md` for the full traceability table).

**Two are not met:**

| Criterion | Status | Evidence |
|---|---|---|
| `shellcheck scripts/setup-consumer.sh` no new warnings | ✅ **MET** (see below) | Run via the official container. Baseline 1 finding, branch 2 (a new SC2155 — `local` masking a return value), fixed → **0 new**. |
| A real `--update` against a full existing install verified to remove nothing | ⚠️ **PARTIAL** | Only `--update --dry-run` against **6** skills. A dry run writes nothing by construction, so it cannot exercise the destructive path at all. |

The second sits on the only code path that can delete a consumer's installed skills.

---

## Step 3: PR and CI

| Check | Result |
|---|---|
| PR #318 | OPEN |
| Review decision | **none** — no approving review |
| CI rollup | **PENDING** — `test` job IN_PROGRESS |
| `npm run ci:fast` (local) | ✅ green, 2424 tests, 0 failures |

`validate`, `link-check` and the branch-policy check are green; the `test` job had not finished at
the time of this verification. Per the DoD contract, PENDING is **not** acceptance — waiting is the
correct action, assuming is not.

---

## Step 4: Docs, Security, Compliance

| Area | Result | Note |
|---|---|---|
| Documentation | ✅ PASS | `configuration.md` (schema + 3 key rows), `getting-started.md` (profiles section, placed before task 83's Step 8), CHANGELOG with the measured saving and its method named |
| Security | ✅ PASS | No credentials or secrets. The one new subprocess call passes arguments as a bash array — no word-splitting path from config values. The CLI reads two JSON files out of the extracted tarball, a boundary the installer already crosses. |
| Compliance | ⚠️ N/A | No GDPR/PCI/WCAG surface — an installer wizard and a resolver |
| Docs consistency | ❌ **GAPS** | Six Step 5c findings outstanding (PC-5…PC-9, PC-11) |

---

## Step 5: Acceptance Decision

**Decision: ❌ NOT ACCEPTED — GAPS IDENTIFIED**

Blocked four independent ways (was five — shellcheck has since been run and passes). Any one alone is disqualifying:

1. **CI is PENDING**, not green, on the final head.
2. **No approving review** on PR #318.
3. **Three QA gates read CONCERNS**, none PASS.
4. **One success criterion unmet** — the real `--update`, covering the destructive path.
5. **Step 5c returned REQUEST CHANGES**, with six documentation findings still open.

> **Re-sampling CI would not change this verdict.** Even a green `test` job leaves blockers 2–5
> standing. The verdict is recorded now rather than after a wait that cannot alter it.

---

## Correction — shellcheck WAS runnable, and it found something

This report first recorded shellcheck as unverifiable: "not installed on the host and the repo has
no lane". **That was wrong.** Docker is available, and the roadmap's own T83 entry records shellcheck
being run for the previous task via `docker run koalaman/shellcheck` — evidence sitting in this
repository that the check was routine.

Run properly: baseline `origin/develop` gives 1 finding (SC2209, pre-existing, in code this diff
never touches). The branch gave **2** — a new **SC2155** on
`local _dry_cli="$(dirname …)"`, *"declare and assign separately to avoid masking return values"*.
That is the same defect class this change explicitly guards against two functions away in
`_resolve_skill_set`. Split and re-run: 1 finding, **0 new**.

The check I recorded as impossible found a real defect on the first attempt. **Recording a check as
unrunnable is a claim, and it deserves the same scrutiny as recording it as passed** — arguably more,
because it removes the check rather than reporting on it.

---

## Blocking Issues

1. **Perform a genuine non-dry `--update`** against a full existing install; record `ls .agents/skills | wc -l` before and after. Alternatively extract the per-skill keep/copy decision into a testable helper and drive the eight-case truth table behaviourally.
3. **Obtain a human review of PR #318.** See the rationale below — this is the substantive gap, not a formality.
4. **Wait for CI** to finish green on the final head.
5. **Clear PC-5 … PC-9 and PC-11** — task doc §10 Risk 1 and §3's edge table still describe the abandoned prose-scrape design; the plan still ships the old generator with no superseded banner; `invokes:` is a new authoring contract documented nowhere.

**Estimated effort to close:** Medium (2–4 hours), plus the human review.

---

## Why human review is a DoD gap here, not a formality

Four independent passes found 27 defects. **Every pass found the previous pass's fixes defective**,
and the same author wrote all of them:

| Pass | Found | Of which introduced by the previous pass's fixes |
|---|---:|---:|
| Cycle 1 | 11 | — |
| Cycle 2 | 5 | 2 (both HIGH) |
| Cycle 3 | 5 | 3 (2 HIGH) |
| Step 5c | 10 | 1 HIGH (the 4th consecutive incomplete fix to `parseInvokes`) |

The most severe defect of the run was introduced **in the same commit as a comment warning against
exactly that mistake**, and was invisible to its own test because the test ran under `set +e` — the
one condition that makes the bug impossible to observe.

Separately, Step 5c found that the shipped artifacts asserted completion the trail contradicted: all
21 criteria had been ticked by a blanket regex pass, including the two above. That is the failure
worth naming — it converts "we did not check" into "we checked and it passed" without anyone
deciding to lie.

The work itself is good: profiles resolve correctly, the closure and tracker-filter ordering are
mutation-proven, and the measured context saving is real (−61% for `pipeline`). The gap is not
quality of implementation. It is that **self-certification has been demonstrably unreliable on this
change**, in a file that can delete a user's installed skills.

---

**Verification Complete:** 2026-09-05
**Final Status:** ❌ NOT ACCEPTED — GAPS IDENTIFIED
**Task status unchanged:** `ready-for-review` (NOT set to `accepted`)
