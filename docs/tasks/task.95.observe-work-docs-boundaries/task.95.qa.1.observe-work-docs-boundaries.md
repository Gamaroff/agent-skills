# QA Report: Task 95 — observe-work: config schema, skill boundaries and the meta-skill family

**Task**: [task.95.observe-work-docs-boundaries.md](./task.95.observe-work-docs-boundaries.md)
**Gate File**: [task.95.gate.1.observe-work-docs-boundaries.yml](./task.95.gate.1.observe-work-docs-boundaries.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-09
**Testing Completed**: 2026-09-09
**Gate Status**: CONCERNS

---

## Executive Summary

All four implementation phases are complete and every claim in the task's Success Criteria was verified against the tree rather than accepted from the document. The engineering is strong: ten new tests, all mutation-proven, and one of them was rewritten mid-development after the mutation pass exposed it as vacuous — which is the behaviour this repo's standards ask for.

One MEDIUM documentation defect stands. The section whose whole purpose is to let a reader find and configure the observation workspace never states what the default path actually is, and its example value points at a different directory tree from the real default. A reader following this section would look in the wrong place for their own log.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix the default-path documentation; nothing else blocks.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (71/71 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (declared none — verified)
- [x] Code on feature branch with open PR (#360, OPEN)

### Testing Approach

- [x] Automated Testing (unit + repo-wide suite)
- [x] Regression Testing
- [x] Code Review
- [x] Documentation accuracy verification (behavioural probes against the resolver)
- [ ] Performance Testing — N/A, no runtime path changed
- [ ] Security Review — N/A, no credential, auth or network surface touched

### Review Methodology

Direct tools. The Adaptive Review Strategy's default row ("direct tools first; spawn agents if gaps found") applies: 4 phases, low risk, documentation-only change set.

**Deviation recorded:** Step 3b's diff code review was run **inline rather than via an Explore subagent**. The session operates under a standing instruction not to call the Agent tool unless the user requested it. The review was performed in full over the whole branch diff; only the dispatch mechanism differs. First review, so `PRIOR_GATES=0`, `REFUTE_PASS=false`, `SAFETY_REPROBE=false` — no re-review scoping applies.

**Step 4b (runnable prose):** fired. Four `SKILL.md` files were modified; one (`observe-work`) contains fenced bash blocks. Engine result: `no-executable-blocks` — 5 blocks, **all** correctly refused as `mutating` (`source` ×1, `command` ×4), **0 placeholder**. Per the skill's own rule this is the second case: information, exit 0, nothing to act on, recorded rather than dropped. The diff added no new bash block to any `SKILL.md`; the one added fence is in `docs/reference/configuration.md`, which is outside the rule's scope.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Config schema | PASS | Verified | `observations:` block in the Full schema (one key); Key reference row present; `OBS_STALE_DAYS` in Environment variables; `## Observation workspace` prose section at L294; scope rule stated. Precedence and refusal verified by **driving** the resolver, not by reading it |
| Phase 2: Boundary notes | PASS | Verified | All three neighbours carry the note; **0** `description:` lines changed in any of them; `generate-catalog` produces an empty diff against the committed tree |
| Phase 3: Family template | PASS | Verified | Template ships; parses to exactly **1** family with 4 members; `families --audit` returns `gaps: []`; the 3-column guidance table is correctly skipped by the parser; `SKILL.md` pointer present and conditioned on an *empty* registry |
| Phase 4: README + CHANGELOG | PASS | Verified | Badge and prose both read 126, matching the live `ls -d skills/*/ \| wc -l`; `observe-work` in the featured Meta list; one CHANGELOG entry covering tasks 93–95 |

**Overall Phase Completion**: 4/4 phases passed.

**Distribution check (not asked for, worth recording):** the template is an `assets/` file, and `assets/` is not named anywhere in `package_skill.py`. Verified empirically rather than by reading the script — packaging `observe-work` emits `Added: observe-work/assets/skill-families.template.md`. The template **does** ship. (The packager writes its zip to the repo root, not the skill dir; `*.zip` in `.gitignore` covers it, and the artifact was removed.)

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `observations.workspace` in schema + key reference, no reader-less key documented | Yes | Yes — and enforced by a test that fails if a key without a reader is added | PASS |
| `OBS_STALE_DAYS` documented with its real default | 14 | 14, asserted by driving the hook | PASS |
| Documented precedence matches actual behaviour, asserted | Asserted | 3 behavioural tests, mutation-proven | PASS |
| Three neighbours carry the note with the shared sentence verbatim | 3 | 4 (see note) | PASS |
| Template is a four-column pipe table, pointed at from Session Start | Yes | Yes | PASS |
| Every named member resolves to a real skill directory | Yes | Yes, asserted | PASS |
| `families --audit` returns zero gaps | 0 | 0 | PASS |

> The sentence went into **four** members rather than three. This is correct, not scope creep: the audit greps every member the family lists, `observe-work` included, so three would have made the seeded family fail its own audit on first run.

### Performance

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| No runtime path changed | No change | Confirmed — the diff touches documentation, prose, one new asset and tests only | PASS |

### Code Quality

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `generate-catalog` produces no diff | Empty | Empty | PASS |
| `bundle` clean on a second run | Clean | Clean — second run adds nothing | PASS |
| `npm test` | Pass | **2901 pass / 0 fail** (2902 total, 1 pre-existing skip) | PASS |
| `npm run format:check` | Clean | exit 0 | PASS |
| `quick_validate.py` on all four skills | Pass | All four ✓ | PASS |

---

## Breaking Changes Validation

### Breaking Change: none declared

Documented: Yes (§5 declares "None — API stable")
Migration Path Provided: N/A
Migration Tested: N/A
Consumer Code Updated: N/A

**Verified rather than accepted.** The claim that an existing `skills-config.yaml` with no `observations:` block is unaffected was checked by driving the resolver in a project with no config file: it falls through to the default tier and exports a workspace. No consumer action is required.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: the documented default workspace is unactionable, and its example points at the wrong tree**

- **Severity**: MEDIUM
- **Category**: Quality / Documentation accuracy
- **Bug Report**: [task.95.bug.1.default-workspace-path-undocumented.md](./task.95.bug.1.default-workspace-path-undocumented.md)
- **Observation**: The Key reference gives the default as `(project-identity path under the agent home)` and the prose section's resolver list says `the project-identity default path under the agent home`. Neither states the path. The actual value, obtained by driving the resolver, is `~/.claude/projects/<absolute-project-path with every "/" replaced by "-">` — e.g. `/Users/x/.claude/projects/-Users-x-Projects-agent-skills`. Meanwhile the schema block's example value is `~/.agents/skill-observations`.
- **Impact**: This section exists so a reader can find and configure the workspace. As written, a reader cannot locate their own log from the documentation, and the `.agents/` example — combined with this repository's standing agent-agnostic-paths rule — actively suggests the default lives under `.agents/` when it lives under `.claude/`. The failure is silent: someone looking in the wrong directory finds nothing and concludes the log is empty, which is the exact "an empty result is a claim about the instrument" failure the observation-log contract is built around.
- **Recommendation**: State the default's shape in the Key reference and the prose section, including the `/` → `-` encoding, and add one line to the schema block noting the example is an override rather than the default.
- **Priority**: P2

### LOW Severity Issues (2)

- **The precedence order is now stated in three places** — the resolver's own header comment, `shared/resources/observation-log-contract.md`, and now `docs/reference/configuration.md`. The new tests bind the *config document's* claims to the resolver's behaviour, so this copy cannot drift silently; the contract copy remains unbound. Documentation only, no action required this cycle.
- **The shared sentence's literal-substring contract is sensitive to a Prettier setting.** `.prettierrc` sets `printWidth: 80` but leaves `proseWrap` at its default (`preserve`), so the four one-line copies survive `npm run format` today — verified, format:check is clean. Were `proseWrap: always` ever set, all four would reflow and the audit would break in all four members at once. The failure is **loud** (the zero-gap test goes red in CI), which is why this is LOW rather than MEDIUM.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS

No runtime path changed. The change set is documentation, prose, one new asset and tests. The two new resolver tests each spawn a bash subprocess (~150 ms apiece) and the two family tests spawn the engine (~110 ms); total added suite time is well under a second against a 70 s suite.

### Reliability — PASS

The rollback plan is documented and is genuinely trivial for this change set (`git revert`, regenerate, re-test). The new tests are the reliability story here: seven mutations were applied during development and each turned a named test red, and QA independently re-ran one of them (paraphrasing the shared sentence in `remember-insight`) and confirmed the audit test fails and recovers.

### Security — PASS

No credential, authentication, network or file-write surface is touched. The staged diff was scanned for secrets and debug logging: clean. The one behaviour documented here — the resolver's refusal of an ephemeral anchor — is a data-durability guard, and the new test asserts it returns **non-zero** rather than merely printing a warning, which is the property the documented `source … || exit 1` guard actually depends on.

### Maintainability — PASS

The change materially improves it. Four previously-ambiguous skills now state their boundaries, and the family registry ships seeded rather than empty. The one deduction that would apply — three copies of the precedence rule — is recorded as a LOW issue rather than counted against this axis, because the copy most likely to be read by a consumer is now the one bound to executable assertions.

---

## Code Review

Whole-branch diff (`origin/develop...HEAD`), 12 files, +885/−81. Reviewed inline (see Review Methodology).

**Correctness bugs (0):**

None. Specific things probed and found sound:

- `resolveIn()` separates the child's exit status from its exported value, so a refusal and an empty export are distinguishable. This was **wrong in the first draft and fixed during development** — the vacuity is documented in the helper's own comment, which is the right place for it.
- The regex that decides which `observations.*` keys count as "documented" is scoped to the schema block and the key-reference table, and deliberately does **not** scan prose — so the paragraphs that name `observations.enabled` in order to say it does not exist are not counted as documenting it. This was also wrong in a first draft and caught by its own failure.
- The `families --audit` non-vacuity guard asserts that no shared rule is swallowed by a `Member-specific` value, closing the path by which zero gaps could mean "nothing was checked".
- `makeWorkspace` fixtures are under `os.homedir()`, not `os.tmpdir()` — correct, and required, because the resolver refuses `/tmp`. The two new `mkdtemp` calls that *do* use `os.tmpdir()` are passed to the **JS engine** via `--workspace`, which has no such refusal. The asymmetry is real and correct; it is the kind of thing worth a comment, and the file already carries one in its header.

> ⚠️ **The paragraph above is WRONG and is left standing as the record of a false pass.** The JS
> engine refuses an ephemeral workspace exactly as the shell resolver does — `reason:
> "ephemeral-workspace"`, exit 1. The claim held locally only because `os.tmpdir()` is
> `/var/folders/…` on macOS; on Linux it is literally `/tmp`. **Both tests failed in CI.** The
> reasoning was tested against one platform and asserted as a property of the engine. Corrected at
> Step 7 (`finalise`), where the CI gate caught it; fixture moved to `os.homedir()`, matching the
> sibling hook suite whose header had already recorded this lesson. Logged as observation #17.

**Cleanups (2):**

- `skills/observe-work/tests/observe-work.test.js` — `require("node:child_process")` and `require("node:os")` are called inside three test bodies rather than once at module scope, where `fs`/`path`/`test`/`assert` already live. Harmless (`require` is cached) but inconsistent with the sibling hook suite, which requires everything at the top.
- `skills/observe-work/tests/observe-work-hook.test.js` — `saysStale()` matches `/stale|never run/` against the whole `additionalContext` string. It is correct for every current output, but it would report a false positive if the hook ever emitted the word "stale" for an unrelated reason. Anchoring it to the review-state clause would be more precise.

Both are advisory. `code_review_blocking` is not set on this task and was not passed in Skill args, so `CR_BLOCKING=false` — no code-review finding was promoted to `top_issues[]`.

### Mutation-Proof Spot Check (Step 3c)

Every invariant added this cycle was reverted and the guarding test confirmed red. Seven mutations during development, one re-run independently by QA:

| Mutation | Test that went red | mutation-proven |
| --- | --- | --- |
| Paraphrase the shared sentence in one member | `families --audit` returns ZERO gaps | yes (re-verified by QA) |
| Widen the 3-column guidance table to 4 columns | exactly one family row must parse | yes |
| Let `Member-specific` swallow the shared rule | shared rule is suppressed → zero gaps proves nothing | yes |
| Disable the config tier | config must win over env | yes |
| Disable the env tier | env tier is dead | yes |
| Turn the ephemeral refusal into a warn-and-continue | a /tmp anchor did not make the resolver return non-zero | yes |
| Document a key with no reader | offered as settable, but the resolver never reads it | yes |

The suite returns green after every restore, and the bundled resolver was confirmed byte-identical to its source (modulo the generated banner) so no mutation residue survived.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full repo suite (`npm test`) | PASS — 2901/2902, 0 fail, 1 pre-existing skip |
| Catalog freshness (`generate-catalog`) | PASS — empty diff, which is the proof no `description:` moved |
| Bundle freshness (`npm run bundle`) | PASS — idempotent; second run adds nothing |
| Skill frontmatter validation (4 edited skills) | PASS |
| `format:check` | PASS |

No regressions. One **pre-existing** warning was observed and is explicitly **not** attributed to this change: the bundler prints `⚠️  shared/resources/<name> not found` while bundling `observe-work`. It reproduces at the parent commit `399799b7` in a detached worktree, before any of this task's changes, and the bundler still reports `in sync` and exits 0.

---

## Test Artifacts

### Files Reviewed

`docs/reference/configuration.md`, `README.md`, `CHANGELOG.md`, `skills/{autoskill,double-check,remember-insight,observe-work}/SKILL.md`, `skills/observe-work/assets/skill-families.template.md`, `skills/observe-work/tests/{observe-work,observe-work-hook}.test.js`, plus the task document and implementation report.

### Test Commands Executed

```bash
npm run format:check
npm test
npm run generate-catalog && git status --short docs/reference/skill-catalog.md
npm run bundle    # twice — second run must add nothing
python3 skills/create-skill/scripts/quick_validate.py skills/{observe-work,autoskill,remember-insight,double-check}
node shared/resources/observation-log.js families --audit --workspace "$W" --json
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/observe-work/SKILL.md --json
python3 skills/create-skill/scripts/package_skill.py skills/observe-work   # asset-distribution check
```

### Coverage Report

Not applicable — this repository has no coverage instrumentation for prose-driven skills. Coverage here is the mutation table above, which is the stronger evidence.

---

## Recommendations

### Immediate Actions (Blocking the gate, not the merge)

1. **[MEDIUM]** State the default workspace path and its `/` → `-` encoding in `docs/reference/configuration.md`, and mark the schema block's `~/.agents/skill-observations` as an override example rather than the default. — `task.95.bug.1`

### Short-term Actions (Non-Blocking)

1. Lift the two `require()` calls in `observe-work.test.js` to module scope, matching the sibling suite.
2. Anchor `saysStale()` to the review-state clause rather than matching the whole context string.
3. Consider a test binding `observation-log-contract.md`'s precedence statement to the resolver, closing the third copy.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: All four phases complete and every success criterion verified against the tree rather than the document. One MEDIUM documentation defect: the section that exists to let a reader find the observation workspace never says where it is, and its example points at a different directory tree from the real default. No HIGH issues, no NFR below PASS, full suite green. Deterministic rule 2 applies — a MEDIUM `top_issues` entry with no HIGH and no NFR failure yields CONCERNS.
**Quality Score**: 90/100 — `100 − (20 × 0 FAILs) − (10 × 1 CONCERNS)`

**Deployment Recommendation**: CONDITIONAL
**Conditions**: Fix `task.95.bug.1` before merge. Nothing else gates.

---

**QA Report**: `task.95.qa.1.observe-work-docs-boundaries.md`
**Gate File**: `task.95.gate.1.observe-work-docs-boundaries.yml`
**Next Steps**: `/qa-fix` addresses `task.95.bug.1`; the two cleanups are advisory and may be taken in the same pass.
