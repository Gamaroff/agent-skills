# QA Report: Task 104 — Every tracker comment opens with a plain-language summary

**Task**: [task.104.tracker-comment-plain-language-lead.md](./task.104.tracker-comment-plain-language-lead.md)
**Gate File**: [task.104.gate.1.tracker-comment-plain-language-lead.yml](./task.104.gate.1.tracker-comment-plain-language-lead.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-10
**PR**: [#377](https://github.com/Gamaroff/agent-skills/pull/377)
**Gate Status**: FAIL

---

## Executive Summary

The task is completely implemented — four phases, every success criterion independently verified, the whole test suite green (3106 pass / 0 fail) and `eval:all` clean. It nonetheless fails, on one defect that the passing suite could not see: **slot values arrive from the CLI as strings and the templates consume them by truthiness, so `--slot blocking=false` renders "Some things need answering before work can start"** — the opposite of what the caller said, in a paragraph written specifically for the reader who cannot check the technical body underneath it.

That is the worst available failure for this particular feature. A missing lead is a gap; a confidently wrong lead is misinformation delivered to the audience the whole task exists to serve.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED
**Quality Score**: 30/100

**Issues**: HIGH: 1, MEDIUM: 6, LOW: 3 (advisory)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All four implementation phases completed and checked off
- [x] Tests passing (`ci:fast` 3106/0, `eval:all` exit 0)
- [x] Breaking changes documented (three, all validated below)
- [x] Code on feature branch with open PR #377

### Review Methodology

Direct tools **plus** one read-only Explore subagent for the adversarial diff review — the Adaptive Review Strategy's "large task" row (4 phases, multiple modules, `risk_level: medium`). `PIPELINE_MODE=standard`; the lite-mode directive was not applied.

First review — no prior gate, so `PRIOR_GATES=0`, `REFUTE_PASS=false`, `SAFETY_REPROBE=false`, whole-branch diff. The 13 generated `skills/*/references/` copies were excluded from the review diff: they are byte-identical duplicates of sources already in it, and reviewing thirteen copies of one file costs thirteen times the tokens for no additional signal. Their fidelity is checked separately (Regression, below).

**A note on this reviewer's own error, recorded because it changes how the report should be read.** Before the subagent returned, I verified the Jira ADF property myself across 33 stage × body-shape combinations and reported the task's highest risk as held down. That verification called `buildCommentAdf` directly on a hand-composed string — it exercised the *renderer*, never the *composition path*, and would have passed identically had `tracker-comment.js` composed nothing at all for Jira. The subagent independently found the shipped test making the same mistake (T104-006). The HIGH risk is therefore **unverified at the composition level**, not verified, and my earlier statement was wrong.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| :--- | :--- | :--- | :--- |
| 1 — The standard | PASS | N/A (prose) | `stakeholder-summary.md`: rule, writing rules with reasons, dumb-it-down rule with worked example, full catalogue, three before/after examples |
| 2 — The catalogue module | **CONCERNS** | 30/30 pass | Module is pure and frozen as specified; T104-001 (slot coercion) and T104-005 (prototype lookup) live here |
| 3 — Engine integration | **CONCERNS** | 65/65 pass | Composition, guard and `--json` field all correct; T104-002/003/004 live here |
| 4 — Contract, docs, bundle | PASS | `bundle:check` 0 problems | Contract section added, AGENTS.md section added, 13 skills re-bundled and byte-verified |

**Overall**: 4/4 phases implemented; 2/4 carry findings.

---

## Success Criteria Verification

Each verified by execution, not by reading the checkbox.

### Functional

| Criterion | Target | Actual | Status |
| :--- | :--- | :--- | :--- |
| `renderLead()` non-empty for all 11 stages with `{}` | 11/11 | 11/11 | PASS |
| Known `--stage`, no new flags → first line after marker is the lead | Yes | Yes (verified through `cli.run` with a stubbed transport) | PASS |
| Neither known stage nor `--summary-file` → exit 2, posts nothing | Yes | exit 2, **zero** transport calls | PASS |
| No call site changes | 0 | 0 — every path in `git diff origin/develop...HEAD` classified against the allowed set | PASS |

The last row is worth noting: the criterion was restated at review time from a count ("all 22 call sites") to a property a diff can decide, and the property is what made it checkable here in one pass. Independently confirmed by a second route — **zero** shipped `tracker-comment.js` invocations lack `--stage`.

### Performance

| Criterion | Target | Actual | Status |
| :--- | :--- | :--- | :--- |
| `renderLead()` is pure string work, no I/O, no new dependency | Yes | Yes — no `require`, no `process.exit` in the module | PASS |
| No additional network call | 0 | 0 — the lead travels in the same POST | PASS |

### Code Quality

| Criterion | Target | Actual | Status |
| :--- | :--- | :--- | :--- |
| Zero I/O require, zero `process.exit` in `stakeholder-summary.js` | 0 | 0 | PASS |
| Prettier and lint clean, `npm test` green | Clean | 0 warnings, 3106/0 | PASS |
| Each of the three §8 mutations demonstrated to turn a named test red | 3 | 3, recorded below | PASS |

### Migration

| Criterion | Target | Actual | Status |
| :--- | :--- | :--- | :--- |
| Contract documents the lead, the guard, the record-hash note | Yes | Yes | PASS |
| `AGENTS.md` carries the Stakeholder Summaries section | Yes | Yes | PASS |
| `npm run bundle` run, regenerated copies committed, none hand-edited | Yes | 13 skills, byte-verified against source | PASS |

---

## Breaking Changes Validation

### BC1 — Every posted body gains a leading paragraph

Documented: Yes · Migration path: Yes · Tested: Yes · Consumers updated: Yes — **PASS**

The migration was performed as the task prescribed: whole-body equality replaced by a substring assertion on the caller's body **plus** a separate positive assertion that the lead is present, rather than simply weakened. Marker-position assertions were not relaxed.

### BC2 — A comment with no producible lead now fails

Documented: Yes · Migration path: Yes · Tested: Yes · Consumers updated: N/A — **CONCERNS**

The claim that no shipped call site omits `--stage` was verified independently: **zero** invocations across `shared/resources/*.md` and `skills/*/SKILL.md` lack it. The behaviour is correct and the blast radius is nil. What fails is the documentation of it — see T104-002: the CLI's own `--help` still tells the reader to omit `--stage` for a repeat-every-run comment.

### BC3 — Deferred-mutation record hashes change

Documented: Yes · Migration path: N/A by design · Tested: Yes — **CONCERNS**

The hash change is correct and benign, and the marker analysis holds: `finalBody` keeps the marker first, both marker searches use `includes`, so pre-change comments still match and no double-post is possible. But the change carried an unnoticed passenger — the record's human-readable `desired:` label now shows the lead instead of the comment's subject (T104-004).

---

## Issues Found

### HIGH ({1})

**T104-001 — Slot values are strings; templates consume them by truthiness**

- **Severity**: HIGH · **Category**: Functional · **Priority**: P0
- **File**: `shared/resources/stakeholder-summary.js:68`
- **Observation**: verified by execution —

  | Slot | Renders |
  | :--- | :--- |
  | `--slot blocking=false` | "Some things need answering before work can start" ← **wrong** |
  | `--slot blocking=no` | same ← **wrong** |
  | `--slot blocking=0` | same ← **wrong** |
  | `--slot blocking_count=0` | "0 of them must be dealt with before this item can be finished" |
  | `--slot count=0` | "(0 separate pieces of work)" |

- **Impact**: the lead asserts the opposite of the caller's intent, to a reader who by construction cannot check it against the body. Every one of these is a natural thing for the task.105 call sites to pass.
- **Recommendation**: coerce at the boundary in `renderLead` — treat `""`, `"0"`, `"false"`, `"no"` as absent for boolean slots; `Number()` numeric slots and drop non-finite/zero.

### MEDIUM ({6})

- **T104-002** `tracker-comment.js:133` — USAGE, synopsis and module header still document the stage-less path the guard now rejects; the `--summary-file` help does not name the one case it is required in.
- **T104-003** `tracker-comment.js:582` — an empty `--summary-file` yields no lead while `--json` reports `lead: "summary-file"`; a one-flag bypass of the standard, and inconsistent with `--body-file`'s empty check.
- **T104-004** `tracker-comment.js:632` — `desired:` in the deferred record now reads the lead, so the label meant to distinguish pending actions is near-identical across every comment of the same stage.
- **T104-005** `stakeholder-summary.js:164` — prototype-chain keys make `renderLead` throw or return a non-string, contradicting its own docblock; `hasTemplate` eight lines below already guards correctly.
- **T104-006** `tests/tracker-comment.test.mjs:1716` — the Jira ADF test asserts on its own construction, leaving the task's highest-ranked risk uncovered.
- **T104-007** `tests/tracker-comment.test.mjs:279` — 12 argv arrays carry a duplicate `--stage` from a mechanical edit; one relies on last-wins to still be testing an unknown stage.

### LOW ({3}, advisory)

- `--slot a=` (empty value) is accepted and silently degrades to "absent"; a repeated key silently last-wins, contradicting the inline comment's claim about repeatability.
- `CYCLE_SUFFIX` is a third, looser copy of a rule `isKnownStage` owns — `renderLead("done-1")` renders while `isKnownStage("done-1")` is false.
- The `---` separator is silently dropped on Jira. Behaviourally accepted and documented in the contract, but the standard still presents it as part of the composition for both trackers.

---

## Code Review

Read-only Explore subagent over the branch diff (13 generated copies excluded). Advisory — the task carries no `code_review_blocking` flag and the pipeline passed no override — but findings of this weight were promoted to `top_issues` on their own merit as functional defects, not under the code-review mechanism.

**Correctness bugs (7)**: T104-001 through T104-007 above.

**Cleanups (3)**: the `stripCycleSuffix` duplication; the deny-list and sentence-count assertions never running against slot-filled renderings; the non-vacuity floor `COMMENT_STAGES.length >= 11` restating the very enumeration the file's header forbids restating.

**One thing the review confirmed rather than faulted**, worth recording because it is easy to break later: `GATE_MEANING` is *not* vulnerable to the prototype problem — but by luck, not design. `verdictSentence` uppercases the key, and no `Object.prototype` member is all-caps. That uppercase is load-bearing and carries no comment saying so.

### Mutation proofs

Three run by the implementer, all re-verified as recorded, plus one run independently by this reviewer:

| Mutation | Test that went red | mutation-proven |
| :--- | :--- | :--- |
| Delete `done` from `LEAD_TEMPLATES` | `done has a lead that renders with no slots` | yes |
| Guard falls through instead of exiting 2 | `no --stage and no --summary-file → exit 2, and NOTHING is posted` | yes |
| Compose body before marker | `the lead sits below the marker…` + `no marker match → posts, with the marker prepended` | yes |
| **(QA, independent)** `renderLead` returns a template for an unknown stage | `an unknown stage returns null and does not throw` | yes |

**Not** mutation-proven: the Jira composition path — because, per T104-006, no test covers it.

---

## NFR Assessment

### Security — PASS (evidence: `measured`, probes executed: 16)

16 hostile candidates executed against the new surfaces: four prototype-chain keys as `--stage`, four as a verdict slot, a prototype-poisoned slots object, three non-object slot types, markdown injection through a slot, catalogue immutability, the cycle-suffix regex against a real hyphenated stage, and a 10MB slot.

Four returned findings, all folded into T104-005. **None is reachable through the shipped CLI**: `isKnownStage` uses `Array.includes` (prototype-safe) at `:531`, before the lead at `:565`, and all four `--stage` probes exit 2 end-to-end. Structural markdown injection through a slot is not reachable either — the heading, table and fence matchers all anchor to line start and no template begins with a slot. Inline marks (backticks, `**`, links) *are* reachable through a slot, and a `--summary-file` lead is unvalidated entirely.

PASS rather than CONCERNS because no reachable vulnerability is introduced; the contract violation is recorded as a correctness finding instead.

### Performance — PASS

Pure string concatenation. No I/O, no new dependency, no extra network call. A 10MB slot renders without error.

### Reliability — CONCERNS

The guard genuinely fails closed, and that is asserted by zero transport calls rather than inferred from an exit code — the right shape. Against it: T104-003 is a one-flag bypass, and T104-001 makes the engine confidently assert the opposite of the caller's intent.

### Maintainability — CONCERNS

The imported-not-restated stage list is a real structural strength and should survive any fix. Against it: help text contradicting behaviour, a test asserting on its own construction, 12 argv arrays carrying a meaningless flag, and a third copy of the cycle-suffix rule that disagrees with the authoritative one.

---

## Regression Testing

| Area | Result |
| :--- | :--- |
| Full suite (`ci:fast`) | PASS — 3106 pass, 0 fail, 0 prettier warnings |
| Eval suite (`eval:all`) | PASS — exit 0, every replay scenario green |
| 13 bundled `references/` copies vs sources | PASS — byte-identical modulo the AUTO-GENERATED banner |
| `bundle:check` | PASS — 126 skills, 0 problems |
| Marker idempotency (pre-change comments still match) | PASS — marker stays first; both searches use `includes` |
| `transition-protocol-parity` corpus scan | PASS — 27/27 after the frontmatter phrase fix |

The `⚠️ shared/resources/<name> not found` warning from `bundle:check` was checked against the **tracked** tree via a detached worktree at `origin/develop` and is **pre-existing** — not attributable to this change.

---

## Step 4b — Documented command execution

Applies: the change set modifies `shared/resources/tracker-comment-contract.md`, which carries one fenced `bash` block.

Result: `no-executable-blocks` (information, exit 0). 1 block found, 0 placeholder, 1 correctly refused as `mutating` (`write-redirection` — the `cat > .claude/state/comment-body.md` heredoc). `placeholder: 0`, so this is the "nothing to act on" case rather than an under-configured run. Both shells available; zsh present.

`shared/resources/stakeholder-summary.md` contains no `bash` fences — its fenced blocks are rendered-comment examples.

---

## Test Artifacts

### Commands executed

```bash
npm run ci:fast                                  # 3106 pass / 0 fail
npm run eval:all                                 # exit 0
npm run bundle:check                             # 126 skills, 0 problems
node --test shared/resources/tests/stakeholder-summary.test.mjs   # 30/30
node --test shared/resources/tests/tracker-comment.test.mjs       # 65/65
node --test evals/shared/tests/transition-protocol-parity.test.mjs # 27/27
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/tracker-comment-contract.md --json
git worktree add --detach <tmp> origin/develop && npm run bundle:check   # pre-existing-warning check
```

---

## Recommendations

### Immediate (blocking)

1. **T104-001** — coerce slot values at the boundary. P0: it is the only finding that makes the feature actively misinform.
2. **T104-006** — drive the Jira ADF assertion through `cli.run`. Until then the task's highest-ranked risk is uncovered, whatever the report said.
3. **T104-002/003/004/005/007** — as listed in the gate.

### Short-term (non-blocking)

1. Comment that the uppercase in `verdictSentence` is load-bearing.
2. One `stripCycleSuffix()` honouring `CYCLE_SCOPED_STAGES`.
3. Run the jargon and sentence-count assertions over slot-filled renderings.
4. Reconcile the task's Files Summary, which lists `jira-sync.js` as modified — the implementation achieved the ADF property without touching it, which is a smaller blast radius and a better outcome than planned, but the document should say so.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one HIGH functional defect (rule 1). Everything else about the change is sound — the architecture, the enforcement mechanism, the bundling, the migration of the affected assertions — which is precisely why the defect matters: it is not visible from the passing suite, and it lands in the one paragraph that a non-technical reader has no way to check.
**Quality Score**: 30/100

**Deployment Recommendation**: BLOCKED
**Next Steps**: `/qa-fix` on T104-001 through T104-007, then QA cycle 2.
