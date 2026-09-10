# PR Review Report: PR #315 — feat(task.83): install only the tracker skills a platform can fire

**Reviewed:** 2026-09-04
**PR:** [#315](https://github.com/Gamaroff/agent-skills/pull/315) — `feature/task.83.platform-aware-skill-exclusion` → `develop` (OPEN)
**Work item:** [`task.83.platform-aware-skill-exclusion.md`](./task.83.platform-aware-skill-exclusion.md) — resolved via `branch stem`
**Tracker:** none — the task carries no `github_issue` / `jira_key` frontmatter, so no tracker context was available
**Verdict:** ⚠️ CONCERNS

**Effort:** medium · **Diff scope:** `origin/develop...origin/feature/…` — 18 files, +3102/−94. No
auto-generated paths were excluded: this change touches no bundled `references/` copies, so the
reviewed diff is the whole diff.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.83.implementation.1.platform-aware-skill-exclusion-initial-run.md` — Pipeline Progress table current through Step 5c |
| Review report | ✅ | `task.83.review.1.platform-aware-skill-exclusion.md` (9/10, READY TO IMPLEMENT) |
| QA reports | 3 | `task.83.qa.1` (FAIL 70) → `task.83.qa.2` (CONCERNS 80) → `task.83.qa.3` (PASS 95) |
| Gate | **PASS** | `task.83.gate.3.platform-aware-skill-exclusion.yml` (95/100, `top_issues: []`) |
| DoD | ❌ | Not yet written — Step 7 has not run. Expected at 5c, not a finding. |
| Sprint review | ❌ | Same — Step 7 output. |
| Open bugs | 3 | `bug.1`, `bug.2`, `bug.3` — all verified fixed, but all still reading `Ready for QA`. See **PC-1**. |
| Handover | ✅ n/a | No restricted-access run; no handover expected. |

The trail is unusually complete for a task of this size — three QA cycles, three bug reports each
carrying a full Developer Fix Cycle, and eight QA mutation proofs recorded across the cycles.

---

## Acceptance Criteria Traceability

The task's **§9 Success Criteria** are the acceptance criteria. Sampled at `medium` effort — the
functional and migration criteria in full, the rest by class.

| Criterion | Evidence in diff | Status |
|---|---|---|
| Fresh install resolving `github` installs `total − 11` | `setup-consumer.sh:875` `_skill_excluded_for_tracker`; test `fresh install with tracker github prunes the Jira-only skills` (asserts exact count) | ✅ met |
| Fresh install resolving `jira` installs `total − 6` | test `fresh install with tracker jira prunes the GitHub-only skills` | ✅ met |
| An already-installed excluded skill survives `--update`, reported as `kept` | grandfather branch in `install_skills`, evaluated before any `rm -rf`; test `GRANDFATHER — an excluded skill already on disk survives the install` asserts a local marker file survives, distinguishing *kept* from *deleted and reinstalled*. Mutation-proven twice (M1, M2). | ✅ met |
| No `tracker:` key and no `JIRA_URL` resolves `github`, not "exclude nothing" | `_resolve_install_tracker` default arm; test `nothing to go on resolves github, not empty` | ✅ met |
| `--all-skills` installs every skill regardless of tracker | flag parser `setup-consumer.sh:47`; predicate short-circuit; test `--all-skills installs everything regardless of tracker` | ✅ met |
| `--update` resolves the tracker with no wizard run, on both configs | config-first ordering, with the rationale in the header comment; tests `skills-config.yaml beats $TRACKER — the --update case` and `no config key and no JIRA_URL still prunes — the --update path` | ✅ met |
| `--dry-run` writes nothing, names the tracker and the exclusion set | `setup-consumer.sh:936-946`; test asserts `.agents/skills` is empty **and** the output names the tracker | ✅ met |
| `create-pr`, `create-branch`, `create-issue` install under both trackers | `NEVER_EXCLUDED` list; test `dual-platform skills are never excluded under either tracker` | ✅ met |
| Performance: no measurable wizard slowdown; tarball unchanged | Two `grep -qxF` per skill over ≤11 lines; the dry-run branch still returns before any network call, asserted by the dry-run test | ✅ met |
| `npm test` green including the new suite | `npm run ci:fast` exit 0 — 2356 tests, 0 failures, prettier clean | ✅ met |
| New suite runs under the existing glob, `package.json` unmodified | `package.json` confirmed unchanged in the diff | ✅ met |
| Classification-parity test exists and fails when a skill is unclassified | `every tracker-specific skill in the tree is classified exactly once`; mutation-proven M3 | ✅ met |
| Every fix mutation-proven | 8 QA proofs (M1–M8) recorded across the three QA reports, plus the developer's 7 | ✅ met |
| `shellcheck` no new warnings | **No evidence available.** Not installed on this host and not run by any workflow in `.github/`. Correctly left unticked and escalated rather than claimed. | ⚠️ partial — see **PC-3** |
| New functions above the `SETUP_CONSUMER_NO_MAIN` hook | Both defined at `:820` / `:875`, well above the hook; the tests reach them by sourcing, which is the working proof | ✅ met |
| Migration: `getting-started.md` step 8 describes the filter and grandfather rule | `docs/concepts/getting-started.md` — new "Step 8 — the platform skill filter" section | ✅ met |
| Migration: `--all-skills` documented in the script header and in getting-started | `--help` output verified to render it; both documents carry it | ✅ met |
| Migration: CHANGELOG entry naming both counts and the guarantee | `CHANGELOG.md` `[Unreleased] → Changed` | ✅ met |
| Migration: a real `--update` removes nothing | Held by the mutation-proven grandfather test rather than by assertion alone | ✅ met |

**Coverage verdict:** every criterion the environment can evidence is met and evidenced by a test, not
by a claim. The single exception is `shellcheck`, which is unverifiable here and is reported as such
rather than ticked.

---

## Conformance Findings

**[PC-1] trail · medium · confidence: high — `task.83.bug.1/2/3.*.md`**
All three bug reports still read `**Status**: Ready for QA`, while `gate.3` records
`bugs_fixed: 3, bugs_remaining: 0` and `qa.3`'s Re-Review Context marks all three closed with evidence.
The documented lifecycle puts closure with QA — *"**Fixed** → QA changes bug status to 'Closed'"* — and
cycle 3 did the verifying but not the recording. A reader who opens only the bug files concludes three
bugs are awaiting verification on a PR whose gate says PASS. The durable artifact contradicts the gate.
→ Close all three (`Ready for QA` → `Closed`) with a Status History row citing the cycle-3 verification,
before `/finalise` runs its DoD check.

**[PC-2] consistency · low · confidence: high — `task.83.platform-aware-skill-exclusion.md:368`**
The Code Quality criterion reads *"its **34** tests appear in the full-run output"*. The suite is **35**
— cycle 2 added the `SKILLS_CONFIG_FILE` decoy case after that line was last updated (22 → 34 in cycle
1). Off by one, and it is a claim about verified evidence, which is the kind of number that should not
drift.
→ Update to 35.

**[PC-3] coverage · low · confidence: high — `scripts/setup-consumer.sh`**
The `shellcheck` criterion is unmet and unmeetable in this environment: the binary is absent and no
workflow in `.github/` invokes it. This is **recorded, not hidden** — the criterion is left unticked
with an explicit note, `gate.3` carries it in `recommendations.future`, and `qa.3` escalates it to
Step 7. Raised here only so the merge decision is made deliberately rather than by omission.
→ Run it on a host that has it before merging, or file the CI lane as its own task, noting a new lane
would run against every shell script in the repo.

**Scope:** clean. Every file in the diff appears in the task's §7 Files Summary, and all three
"Unchanged by design" entries are genuinely untouched — `package.json`, `shared/resources/resolve-platform.sh`
and every `skills/*/SKILL.md` show 0 changed files in the diff. No drift.

**Consistency (otherwise):** the task document's `status: ready-for-review` is correct for this point in
the pipeline (`/finalise` sets `accepted`). The Change Log carries a row per pipeline event with blank
`Version`, as the machine-writer convention requires. The CHANGELOG's quantitative claim
(~1,493 / ~11,602 tokens, ~13%) was independently recomputed during QA cycle 1 at 1,505 / 11,702
(12.9%) — it reproduces.

---

## Code Review Findings

**None new.**

The code lens is deliberately light here, and the reason is structural rather than an omission: this
PR's diff has already been through the shared adversarial code reviewer **three times** under
`code_review_blocking=true` — the whole branch diff at cycle 1, the whole branch diff again at cycle 2
as a refute pass explicitly targeting cycle 1's own fixes, and the changed file at cycle 3. That loop
produced four findings, promoted three to gates, and closed all of them with mutation proofs. Re-running
the same lens a fourth time over the same bytes is the duplication this skill's own documentation names
("Only the conformance lens is new value there").

Spot-checked at this step, and clean: the CHANGELOG's rewritten claim now matches what the code does
(it was corrected in cycle 1 precisely because it did not), the ten `PARITY_CASES` entries match the
"ten spellings" the CHANGELOG cites, and `getting-started.md`'s stated resolution order matches
`_resolve_install_tracker`'s actual order including the `.env` probe.

Two low-severity items remain open by decision rather than oversight, both recorded in `gate.3`'s
`recommendations.future`: the installer is more permissive than the runtime about *malformed* `tracker:`
input (an unrecognised scalar, and a tab separator that `yaml.safe_load` itself rejects — the latter
pre-existing, verified against the pre-fix script at `9edb699`), and the `.env` probe asymmetry, which
is bounded, tested, argued in `bug.2`, and whose proper close changes tracker resolution for every skill
in the repo.

---

## Recommended Actions

1. **Close the three bug reports** (PC-1) before `/finalise` — the gate and the bug files must not
   disagree about whether three defects are outstanding.
2. **Correct the test count** 34 → 35 in the Success Criteria (PC-2).
3. **Decide `shellcheck` at merge** (PC-3): run it, or file the CI lane. Do not let it pass by silence —
   it is the only success criterion without evidence.

---

**Verdict rationale:** PC-1 is `severity: medium`, which under the deterministic table yields
**CONCERNS** — findings recorded, the PR not blocked. Nothing carries `severity: high`. The change
itself is in good shape: the headline defect the QA loop found is closed and verified by re-running the
check that found it, the two properties the task named as its highest risks are mutation-proven, and the
outstanding items are documentation hygiene plus one criterion no environment here can evidence.
