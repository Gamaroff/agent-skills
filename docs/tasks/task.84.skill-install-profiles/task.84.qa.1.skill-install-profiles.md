# QA Report: Task 84 — Skill install profiles with dependency closure

**Task**: [task.84.skill-install-profiles.md](./task.84.skill-install-profiles.md)
**Gate File**: [task.84.gate.1.skill-install-profiles.yml](./task.84.gate.1.skill-install-profiles.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-04
**Testing Completed**: 2026-09-04
**Gate Status**: CONCERNS

---

## Executive Summary

The core mechanism is correct, mutation-proven, and every §9 criterion passes on the happy path. The central design decision — replacing the specified prose-scrape graph with declared `invokes:` frontmatter — was **correct, and the evidence supports it**; the alternative would have shipped a feature that does nothing while reporting success.

The input handling around that mechanism is not yet good enough. An independent adversarial review found **seven MEDIUM and three LOW defects**, and the pattern is consistent: **four reachable configurations silently install every skill** — a typo'd include, an exclude list that empties the profile, a trailing comment after `skills:`, and a `$`-prefixed profile name. For a feature whose entire purpose is to *not* install things, that is the wrong direction to fail in, even though it is the safe one. A fifth defect breaks both CI drift checks on a legal YAML comment.

> **A note on this review's own reliability.** The first pass — conducted by the same pipeline that wrote the code — verified the headline guarantees and the happy paths and found one issue. The independent adversarial reviewer, given a refute-shaped brief and no sight of the implementer's reasoning, found ten. Every one was then reproduced directly before being accepted here. The gap is the finding: a self-review of one's own change converges on confirming it.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: BLOCKED for production; CONDITIONAL for staging

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (5/5)
- [x] Tests passing — `npm run ci:fast` green
- [x] Breaking changes documented (None; grandfather guarantee verified)
- [x] Code on feature branch with open PR (#318)

### Testing Approach

- [x] Automated Testing (42 new tests; full suite 2398)
- [x] Regression Testing (task 83 suites; unchanged-path proof)
- [x] Security Review
- [x] Code Review (adversarial, independent subagent + direct probes)
- [x] Manual Testing (real `--update --dry-run` against a populated install)
- [ ] Performance Testing (measured, but the criterion is a latency bound not a benchmark)

### Review Methodology

Direct tools plus one independent adversarial Explore subagent over the branch diff. Parallel agents were warranted by the Adaptive Review Strategy (5 phases, multiple modules) and the independent lens mattered more than usual here: the code under review was written by the same pipeline now reviewing it, so the reviewer was given a refute-shaped brief and was not shown the implementer's reasoning.

Direct probes were run in parallel rather than relying solely on the subagent — the bash/Node boundary, the awk parsers, and the failure directions were each exercised against real adversarial inputs rather than read.

**Step 4b**: not applicable — no changed `SKILL.md` or `shared/resources/*.md` adds a fenced bash block. The 20 SKILL.md edits are a single frontmatter line each.

**Step 3c (mutation-proof spot check)**: performed during implementation and re-confirmed — see Code Review below. No fixes were made *this* cycle (first review), so the scope is the six guarantees the change introduces.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1 — Dependency graph generation | CONCERNS | Partial | Generator, committed JSON and CI drift checks all work. `parseInvokes` throws on a legal trailing comment, which breaks both drift checks (004) |
| Phase 2 — Profiles and closure resolver | CONCERNS | Partial | Ordering, cycles and conflicts mutation-proven. Unvalidated `include` (001), prototype lookup (008), `$`-prefixed profile accepted (009) |
| Phase 3 — Wizard prompt | CONCERNS | Partial | Prompt works and matches `select_platform`'s idiom; prints none of the counts the plan documents (007) |
| Phase 4 — Persistence and `--update` | CONCERNS | Partial | Config-first resolution proven by a real `--update --dry-run`. Empty-set/failure conflation (002), awk comment hole (003), branch ordering (005), counter mislabel (006) |
| Phase 5 — Tests and documentation | PASS | Verified | 42 tests; both suites confirmed collected; docs in 3 files + CHANGELOG. The gaps are in what the tests do not yet assert, not in the suite itself |

**Overall Phase Completion**: 5/5 implemented; 4 carry concerns. No phase is incomplete — every defect is in input handling or reporting around working core logic.

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Profiles resolve every transitive callee | Yes | minimal 5, pipeline 35, full 109 | PASS |
| `develop-story` brings all eight callees | 8/8 | 8/8 present in `pipeline` | PASS |
| Cycle `develop-story` ↔ `review-story` terminates | No hang | Resolves, no duplicates | PASS |
| `pipeline` + `github` excludes `sync-jira-story` | Absent | Absent (present under `jira`) | PASS |
| `exclude` of a required skill reports a conflict | Reported | 4 relationships named, skill withheld | PASS |
| `--update` resolves profile from config | Yes | Verified by real invocation | PASS |
| `--update` prunes nothing | 0 pruned | 6/6 pre-existing skills kept | PASS |
| Absent `skills:` block ≡ today | Identical | Resolver never invoked; loop unchanged | PASS |
| Wizard prints resolved count + closure additions | Yes | At install time, via CLI stderr | PASS |

The `sync-jira-story` case is the one that matters most and it is genuinely non-trivial: the chain `review-story → ensure-story-jira-issue → sync-jira-story` puts a Jira-only skill *inside* a GitHub consumer's closure, and only the post-closure filter removes it.

### Performance

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `pipeline` description bytes materially below `full` | Materially below | 13,894 vs 35,425 (−61%) | PASS |
| Closure resolution latency | < 1s | ~115ms | PASS |
| Tarball download unchanged | 1 request | 1 request | PASS |

### Code Quality

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `npm test` green, both suites observed to run | Green | 2398 tests, 0 fail (+30) | PASS |
| Every §8 guarantee mutation-proven | All | 6/6 reverted, 6/6 red | PASS |
| `shellcheck` no new warnings | 0 new | **Not run** | UNVERIFIED |
| `skill-dependencies.json` regenerable + CI-checked | Yes | Both workflows | PASS |
| Closure logic in Node with unit tests over fixtures | Yes | Pure resolver, injected fixtures | PASS |

`shellcheck` is not installed on this host and the repo has no shellcheck lane (that is task 92's scope). Recorded as **unverified**, not as met.

---

## Breaking Changes Validation

### Breaking Change: None claimed

- Documented: Yes — §5 states none, with a before/after table
- Migration Path Provided: N/A (none required)
- Migration Tested: **Yes** — a real `--update --dry-run` against a scratch repo holding 6 skills with `skills.profile: pipeline` in config resolved from config with no wizard, wrote nothing, and left all 6 in place including three outside the profile
- Consumer Code Updated: N/A

The "absent `skills:` block ≡ `full`" claim is stronger than a test: when the profile is `full` and no exclude is set, the resolver is **never invoked** and the membership test short-circuits on `_have_set=false`, so the copy loop is structurally identical to the pre-change one.

**Overall Breaking Changes Assessment**: PASS

---

## Issues Found

### HIGH Severity Issues (0)

None. Nothing here loses data, breaks a security boundary, or destabilises an install — every failure direction is toward *over*-installing, which is why these are MEDIUM rather than HIGH despite defeating the feature's purpose.

### MEDIUM Severity Issues (7)

**The four silent-full-install paths.** Each was reproduced directly:

1. **TASK-84-001 — unvalidated `include` echoed to stdout.** `--include Create-PR,NotARealSkill` emits both names verbatim; they fail the bash name-shape guard, which rejects the *whole* batch. A single typo in the wizard's extras answer installs all ~120 skills, and the warning blames node/PATH.
2. **TASK-84-002 — empty resolved set read as failure.** Excluding all five `minimal` seeds resolves to 0 skills and exits 0; bash reads empty stdout as failure and installs everything. The user asked for almost nothing and got the maximum.
3. **TASK-84-003 — `skills:` with a trailing comment voids the whole block.** The open rule requires nothing after `skills:`, and the close rule then matches that same line. `skills:  # which skills` makes the entire block invisible, falls back to `full`, and installs everything **with no warning at all** — this path never reaches the "could not resolve" branch.
4. **TASK-84-009 (LOW by severity, same family)** — `--profile '$comment'` is accepted, returns an empty set, and is then read as a failure.

**The CI breaker:**

5. **TASK-84-004 — `parseInvokes` throws on a legal trailing comment.** `invokes: [create-branch, develop]  # steps 1-2` raises "unterminated 'invokes:' list — missing ']'" for a line whose bracket is plainly present. Both drift checks fail with a misleading message, blocking the release.

**The two reporting defects:**

6. **TASK-84-005 — tracker grandfather is unreachable when a profile is active.** The profile branch runs first and the resolver has already removed tracker-excluded skills from the resolved set, so `_kept` is always 0, Jira-only skills are logged as "outside profile", and the tracker-specific warning with its `--all-skills` and prune guidance never prints.
7. **TASK-84-006 — profile skips misattributed to the tracker.** The profile branch increments `_skipped`, which the summary renders as `skipped (${_tracker})`. A fresh `pipeline` install reports "85 skipped (github)" when only ~11 are tracker-driven.

**And the documentation divergence:**

8. **TASK-84-007 — the plan documents wizard counts the code does not print.** Introduced by this task's own review pass; a plan describing behaviour the code lacks is worse than one that says nothing, because it is trusted.

### LOW Severity Issues (3)

1. **TASK-84-008** — `graph[name] ?? []` is an unguarded prototype lookup assuming an array. `--include toString` throws "function is not iterable" uncaught; a hand-edited string value iterates its characters as skill names.
2. **TASK-84-010** — the dry-run count ignores the config's `include`/`exclude`, so it previews a different set than the real run would install. `_dry_n` also leaks to global scope.
3. Two comments added to `validate.yml` state incorrect premises: `ubuntu-latest` does ship Node (the real reason to pin is matching `release.yml`'s major), and the drift check does not read `skill-profiles.json`.

**Total Issues**: HIGH: 0, MEDIUM: 7, LOW: 3

---

## NFR Assessment

### Performance — PASS

~115ms per resolution over 120 nodes against a <1s criterion; three runs totalled 0.346s including process start-up. The dry-run path adds one offline resolver call and deliberately makes no network request, preserving the installer's "one request, whole archive" property.

### Reliability — PASS

The failure direction is right everywhere it matters, and was probed rather than assumed:

- `node` absent → non-zero → unfiltered install (not empty)
- `node` shadowed, printing help text and exiting 0 → **rejected** by a per-line name shape check
- CLI data-file failure → exit 2 with empty stdout, distinguishable from an empty result
- Grandfather → branch precedes the `rm -rf`, and a real `--update` pruned nothing

The shape check is the notable one: it exists because the shadowed-`node` failure actually occurred during implementation and produced a near-empty install reported as success.

### Security — PASS

No credentials, tokens or secrets involved. The single new subprocess call passes arguments as a bash array, so no config value reaches a shell word-splitting context. The CLI reads two JSON files from the extracted tarball — a boundary the installer already crosses when it copies tarball content into `.agents/skills/`, so this adds no new trust assumption.

### Maintainability — PASS

The resolver is pure and fully injected, so its tests exercise it rather than the tree. Non-obvious decisions carry their reasoning in-file, including the measurement table behind the graph redesign — which is the difference between a future maintainer re-litigating the prose-scrape approach and understanding why it was abandoned. Two guards are deliberately reports rather than assertions, with that choice justified in the file.

---

## Code Review

Independent adversarial Explore subagent over the branch diff, plus direct probes of the areas most likely to hide a defect. Advisory — this task does not set `code_review_blocking`.

**Correctness bugs (7 medium, 3 low)** — all listed under Issues Found above, each reproduced directly before being accepted:

- [medium/high] `shared/resources/resolve-skill-set-cli.mjs` — `include` echoed unvalidated → whole batch rejected → full install
- [medium/high] `scripts/setup-consumer.sh` — empty resolved set indistinguishable from failure → full install
- [medium/high] `scripts/setup-consumer.sh` — `skills:` + trailing comment voids the block, silently, with no warning
- [medium/high] `scripts/generate-skill-dependencies.mjs` — `parseInvokes` throws on a legal trailing comment → both CI drift checks fail
- [medium/high] `scripts/setup-consumer.sh` — profile branch precedes tracker branch → `_kept` always 0, tracker warning unreachable
- [medium/high] `scripts/setup-consumer.sh` — profile skips counted into `_skipped`, rendered as `skipped (tracker)`
- [medium/high] `task.84.plan.*.md` — documents wizard counts the code does not print
- [low/high] `shared/resources/resolve-skill-set.mjs` — `graph[name] ?? []` prototype lookup, no array guard
- [low/high] `shared/resources/resolve-skill-set.mjs` — `$`-prefixed profile names accepted
- [low/high] `scripts/setup-consumer.sh` — dry-run count ignores include/exclude; `_dry_n` not `local`

**Verified sound** (probed, not assumed):

- `local _out` declared on its own line before assignment — the classic bash exit-code masking bug is avoided
- The awk block scoping handles 12 adversarial YAML shapes correctly — trailing *spaces*, inline comments on the value, a commented-out key, a `profile:` under a different top-level block, quoted values, CRLF, tabs, an absent block, and a key after the block closes. The one shape it does **not** handle is a comment on the `skills:` header line itself (003)
- Ordering: tracker filter at `resolve-skill-set.mjs:102`, after the closure loop
- Grandfather at `setup-consumer.sh:1195`, before the `rm -rf` at :1218
- `node` absent, and `node` shadowed by nvm's shell function, both fall back to the unfiltered install

**Cleanups (4):** dead `.some()` dedupe while real duplicate conflicts go unmerged; quote-handling inconsistency between the two config parsers; `include: []` indistinguishable from an absent key, so a stale env var can override an explicit empty list; two inaccurate comments in `validate.yml`.

**Mutation proving** — six guarantees, each reverted and confirmed red:

| Mutation | Result |
| --- | --- |
| Tracker filter moved before the closure | 3 tests fail — `mutation-proven: yes` |
| Visited set removed | Hangs/timeout — `mutation-proven: yes` |
| Excluded-but-required skill silently re-added | 2 tests fail — `mutation-proven: yes` |
| `$SKILLS_PROFILE` read before config | 1 test fails — `mutation-proven: yes` |
| Profile grandfather `continue` removed | 1 test fails — `mutation-proven: yes` |
| Committed graph made stale | 2 tests fail — `mutation-proven: yes` |

No vacuous guards found: every mutation produced a red test naming the property it broke.

---

## Assessment of the Design Change

The task specified deriving the call graph by scraping `/slash-command` tokens from prose. The implementer built that first, measured it, and replaced it. **QA finds the change correct and the evidence sufficient.**

The measurements reproduce: every scrape variant either explodes the graph or starves it, and the two variants that reproduce the task's own known-good fixtures (`develop-story` 8, `review-story` 10) still collapse `minimal` (5 seeds) and `pipeline` (26 seeds) to ~34 of 120 skills. That is not a degraded feature, it is a null one — and critically, one that passes every check the task specified. The cause is structural rather than fixable by a better pattern: a `/slash-command` token carries no direction, and `skills/review-code/SKILL.md:180` demonstrates the limit case by asserting a *non*-call that the scrape reads as two edges.

The replacement preserves every property the task wanted from a generated manifest — regenerable, diffable, CI-checked — and improves locality by putting each skill's edges beside the skill. The safe default (absent key ⇒ no edges ⇒ profile equals its seeds) is the right direction for a missing declaration. Retaining the scrape as an advisory report rather than deleting it preserves Risk 1's mitigation.

**One residual risk, correctly identified in the task and unresolved by either design**: closure completeness cannot be proven. 20 of 120 skills declare edges; a skill that gains a callee without updating `invokes:` produces an under-install. The mitigations are in place — the advisory candidate report, the `--all-skills` escape, and the fact that profiles are generous — but this remains the thing most likely to bite, and the CI report is the only thing that will surface it. That is acceptable, and it is why the report exists.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Task 83 tracker filter (`setup-consumer-skill-exclusion.test.mjs`) | PASS — 27 tests, unchanged |
| `setup-consumer-config.test.mjs` | PASS |
| Full suite | PASS — 2398 tests, 0 failures, 1 skipped |
| `full` profile path identical to pre-change | PASS — resolver not invoked; membership test short-circuits |
| `package.json` `test` script | Byte-identical to `develop` — new suites collected by an existing glob |

---

## Test Artifacts

### Files Reviewed

`scripts/setup-consumer.sh`, `scripts/generate-skill-dependencies.mjs`, `shared/resources/resolve-skill-set.mjs`, `shared/resources/resolve-skill-set-cli.mjs`, `shared/resources/skill-profiles.json`, `shared/resources/skill-dependencies.json`, both new test suites, `.github/workflows/{validate,release}.yml`, `docs/reference/configuration.md`, `docs/concepts/getting-started.md`, `CHANGELOG.md`, and the task + plan documents.

### Test Commands Executed

```bash
npm run ci:fast                                    # 2398 tests, 0 fail
node --test shared/resources/tests/setup-consumer-skill-profiles.test.mjs
node --test shared/resources/tests/skill-dependencies-drift.test.mjs
node --test shared/resources/tests/setup-consumer-skill-exclusion.test.mjs   # regression
npx prettier --check <every changed file>
setup-consumer.sh --update --dry-run               # in a scratch repo, 6 skills pre-installed
```

### Coverage Report

Not applicable — this repo does not collect coverage percentages. Coverage is asserted behaviourally: 42 tests over the new surface, with each of the six load-bearing guarantees mutation-proven.

---

## Recommendations

### Immediate Actions (Blocking)

1. **TASK-84-001** — print the resolved count in the profile menu, or correct the plan. P2.

### Short-term Actions (Non-Blocking)

1. Run `shellcheck scripts/setup-consumer.sh` once task 92's lane lands; the criterion is currently unverified.
2. Distinguish an empty resolved set from a resolver failure.
3. Name an unknown `skills.profile` value in the installer's warning.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The core mechanism — closure, ordering, grandfather, drift detection — is correct and mutation-proven, and the design change that replaced the specified prose-scrape is well evidenced and right. But ten defects sit in the input handling and reporting around it, and four of them silently install every skill in configurations a user can reach by making an ordinary typo or writing an ordinary YAML comment. None is HIGH by the severity guidelines (no data loss, no security boundary, no instability — the failure direction is always toward over-installing), so the deterministic rules give CONCERNS rather than FAIL.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED for production, CONDITIONAL for staging
**Conditions**: TASK-84-001 through 006 fixed and regression-tested; 007 resolved.

---

**QA Report**: `task.84.qa.1.skill-install-profiles.md`
**Gate File**: `task.84.gate.1.skill-install-profiles.yml`
**Next Steps**: `/qa-fix` addresses TASK-84-001 … 010, adding a regression test per defect, then re-review.
