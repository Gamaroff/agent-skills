# QA Report 2: Task 55 — re-review after two fix cycles

**Task**: [task.55.tracker-comment-cli.md](./task.55.tracker-comment-cli.md)
**Gate File**: [task.55.gate.2.tracker-comment-cli.yml](./task.55.gate.2.tracker-comment-cli.yml)
**Previous**: [gate 1 — FAIL, 55/100](./task.55.gate.1.tracker-comment-cli.yml)
**Review Date**: 2026-08-19
**PR**: [#257](https://github.com/Gamaroff/agent-skills/pull/257)
**Gate Status**: **PASS** — 92/100

---

## Executive Summary

All seven cycle-1 findings are closed. The re-review also found that **the cycle-1 fix for QA-2 had reintroduced the same class of bug it fixed** — and that is the most useful thing this cycle produced, because it was invisible to a fully green suite and would have shipped.

Relaxing the fence pattern to admit a multi-word info string also admitted backticks, so a prose line merely *beginning* with an inline code span became an opening fence. A real, Jira-syncable document — `task.42.change-log-spec-and-engine.md` — collapsed 31,235 characters into a single code block. That is the third instance in this task of the same failure mode: a silent loss that looks exactly like success.

It is fixed by stating CommonMark's actual rule (a backtick fence's info string may not contain a backtick; a tilde fence is exempt because `~` cannot open a code span), which does not fit cleanly in one regex — hence a predicate. The regression test renders the real document rather than a hand-picked line, because the offending shape only occurs in prose nobody would think to invent.

---

## Re-Review Context — cycle 1 findings

| ID | Verdict | Evidence |
|---|---|---|
| QA-1 marker prefix collision | **FIXED** | Full self-terminating marker (GitHub) + exact text-node equality (Jira). Both mutation red. The Jira half needed a test through the *real search path* — the first attempt asserted on the helper and kept passing while the live search regressed. |
| QA-2 multi-word info string | **FIXED (on the second attempt)** | See NEW-1 below. |
| QA-3 fence delimiter run length | **FIXED** | Same char, `length >= opening`, no info string. `` ```js `` closed by `` ``` `` still works; trailing spaces still close. |
| QA-4 `--stage` failed open | **FIXED** | Six argv shapes exit 2. No legitimate value broken — the CLI never supported `--body-file -`, and no shipped site passes a value beginning with `-`. |
| QA-5 stage unvalidated | **FIXED** | All **60** shipped `--stage` literals pass `isKnownStage`; none would exit 2. |
| QA-6 untested Jira branch | **FIXED** | `getAuth({source})` is what made the branch reachable at all. 13 Jira tests; the previously-dead `postFails` path now exercised. All ~14 other `getAuth` callers verified unaffected. |
| QA-7 unpaginated search | **FIXED** | Jira fails closed on absent/short `total`; GitHub now reads via `gh api --paginate`. Both mutation red. |

---

## New defects found this cycle — all fixed

**NEW-1 (HIGH) — the fence fix reintroduced the bug it fixed.**
`[^\n]*` let backticks back into the info string. Verified on the real file: 62 nodes ending in a 31,235-character code block. After the fix: 198 nodes ending in a paragraph. The parity assertion was also **backwards** — it required renderer ≡ extractor, which is precisely what pushed the renderer to over-match rather than the extractor to under-match. The requirement is renderer ⊆ extractor: a permissive extractor is survivable, a permissive renderer loses content.

**NEW-2 (MEDIUM)** — the truncation guard failed *open* on an absent or null `total`. Every other unreadable path in the module fails closed; this was the odd one out.

**NEW-3 (MEDIUM)** — truncation detection was Jira-only. `gh issue view --json comments` has no paging and no total, so a marked comment outside the window read as absent. Now `gh api --paginate`, with `issue view` retained as a fallback that reports `unverifiable` rather than a zero it cannot stand behind.

**NEW-5 (LOW)** — the parity allowlist exempted files by **basename**, so any skill could mint an exemption by naming a file `jira-transition-protocol.md`. Nineteen files were exempt on that basis with nothing tying them to the shared source. Now exempt by content equality; a planted file in an unrelated skill is caught.

**NEW-6 (LOW)** — the numeric suffix was accepted on any stage (`done-1` passed) while the error message promised cycle-scoped only.

### Two test defects fixed in the same pass

The NEW-2 and NEW-3 tests originally *threw* on POST. But a thrown POST is also reported as `unverifiable`, so they could not distinguish "never posted" from "tried and failed" — and both mutations slipped straight through until the tests recorded the POST instead. Worth naming: a test that cannot fail is worse than no test, because it is counted as coverage.

---

## NFR Assessment — both CONCERNS resolved

| NFR | Cycle 1 | Cycle 2 | Why |
|---|---|---|---|
| Security | PASS | **PASS** | Unchanged and re-verified. |
| Performance | PASS | **PASS** | One extra round-trip per marked site from the paginated read; still bounded. |
| Reliability | CONCERNS | **PASS** | All three causes closed: `--stage` fails closed, both trackers detect an unverifiable read, the Jira branch has real coverage. |
| Maintainability | CONCERNS | **PASS** | Stage validation enforced at runtime; the three duplicated helpers now guarded by a parity test that fails on drift. |

---

## Test Results

| Suite | Result |
|---|---|
| `shared/resources/tests/*.test.mjs` | 705 / 705 |
| `evals/shared/tests/*.test.mjs` | 90 / 90 |
| `skills/*/tests/*.test.js` + `tests/*.test.js` | 508 / 508 |
| `evals/*/protocol` + `unit` | 209 / 209 |
| **Total** | **1512 / 1512** |
| `npm run validate:all` | 115 passed, 0 failed |

**Eleven fixes across two cycles, every one mutation-proved** — reverting each turns a test red.

> **A note on flakiness, recorded so it is not re-diagnosed later.** Running every suite concurrently produces intermittent failures in `access-config-parity.test.mjs` and `jira-interception.test.mjs`. Both are `spawnSync` bash timeouts under load, both pass in isolation (29/29 and 48/48), and neither file is touched by this branch. Not a regression.

---

## Final Assessment

**Gate**: **PASS** — 92/100. No `top_issues` remain; all four NFRs PASS.

**Deployment**: APPROVED for staging and production.

Four items are recorded as **future**, none blocking: `capDescriptionAdf`'s middle-drop and its false "trailing" notice (pre-existing, made likelier by the fence branch); the seven GitHub-path comment sites that remain unmarked and therefore non-idempotent (pre-existing, and the remaining half of the idempotency story); `adfContainsText` now dead but exported; and the `bundle_skill.py` gap where a transitively-referenced file stays stale while the bundler reports "in sync".

The task delivers what it set out to: a comment endpoint that exists, one CLI call at every site, MCP demoted to a documented fallback that a guard now genuinely enforces, and comments that are idempotent on both trackers. It took two QA cycles because the first fix for the fence was wrong in the opposite direction — which is the argument for the mutation discipline, not against it.
