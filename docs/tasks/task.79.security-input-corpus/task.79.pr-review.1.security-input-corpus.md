# PR Review Report: PR #332 — feat(task.79): write down the inputs that defeat each sink, once

**Reviewed:** 2026-09-07
**PR:** [#332](https://github.com/Gamaroff/agent-skills/pull/332) — `feature/task.79.security-input-corpus` → `develop` (OPEN)
**Work item:** [`task.79.security-input-corpus.md`](./task.79.security-input-corpus.md) — resolved via `branch stem`
**Tracker:** none — this repo's tasks are roadmap-driven (`task.73`–`task.83` all carry no `github_issue`)
**Verdict:** ✅ **APPROVE**

> **Method note — the two review subagents did not run.** Both lenses were dispatched in parallel as
> read-only Explore subagents and both hung at their first step for ~30 minutes, returning only "I'll
> start by reading the prompt template" when stopped. The review below was therefore completed
> **in-line by the orchestrator**, checking the same questions by execution. That is a weaker
> arrangement than two independent lenses and it is recorded rather than glossed: the findings here
> were not produced by a reviewer independent of the author.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.79.implementation.1.security-input-corpus-initial-run.md` |
| Review report | ✅ | `task.79.review.1.security-input-corpus.md` (READY TO IMPLEMENT, 8/10) |
| QA reports | 3 | `task.79.qa.1` / `.qa.2` / `.qa.3.security-input-corpus.md` |
| Gate | **PASS** | `task.79.gate.3.security-input-corpus.yml` (100) — after `gate.1` FAIL, `gate.2` CONCERNS |
| DoD | ⏳ | Absent by design — Step 7 (`/finalise`) has not run yet |
| Sprint review | ⏳ | Written by `/finalise` |
| Open bugs | 0 | — |
| Handover | n/a | `access.tracker` is full; nothing deferred |

Trail is complete and, spot-checked, **honest**: all nine test assertions named in the implementation
report and QA reports exist verbatim in the test files. No report claims a check that is not there.

---

## Acceptance Criteria Traceability

All eight Success Criteria verified by **execution**, not inspection (24 checks, 24 PASS).

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC1 Five sinks, each with hostile **and** legitimate | `security-input-corpus.mjs` `SINKS`; url-authority 9+3, sql-orm 7+3, shell-exec 27+4, path 8+3, template-render 6+3 | ✅ |
| SC2 Every case states why + correct | 73/73 non-empty; `tests/security-input-corpus.test.mjs` asserts it | ✅ |
| SC3 Importable, frozen; typo'd sink throws | Deeply frozen; throws on `shell-exe`, `__proto__`, `constructor`, `toString`, `hasOwnProperty`, `""` | ✅ |
| SC4 Prompt references the corpus, does not restate | 0 restated inputs; guard now fails on **three** distinct restatement shapes | ✅ |
| SC5 `security_review` YAML shape unchanged | 32/32 contract tests green, incl. the SKILL.md render branches | ✅ |
| SC6 `npm run ci` green; new suite confirmed to have **run** | CI run 34063402241 on head `73f6a45f` — 5/5 checks green; log carries the named `ok` lines | ✅ |
| SC7 Inputs only — no execution, no side effects on import | Call-shape purity check, defeat-proved against the body that beat its predecessor | ✅ |
| SC8 Every hostile case names its sink | `sinkCases` stamps `sink` and namespaces the id mechanically; 0 mismatches | ✅ |

---

## Conformance Findings

**Scope — exact.** The 10 files declared in §7 Files Summary are precisely the 10 that changed. All
five §4 Out-of-Scope boundaries hold: `qa-execute-snippets.mjs` untouched, no `SKILL.md` changed, no
gate-schema change, no executor (the module exports data, accessors and a renderer only), no fuzzer.

**[PC-1] disclosure · low · confidence: high — `shared/resources/security-input-corpus.mjs`**
Three corpus claims (`mustache-interpolation`, `homoglyph-quote`, `attribute-breakout`) are qualified
to the configurations where they hold, but that qualification is **cited rather than executed** — no
template engine or Windows codepage is available in this environment. This is *disclosed*, in the
corpus text, in `gate.3`, and in the cycle-2 and cycle-3 QA reports, and carried as a named future
action. Recorded as low rather than medium precisely because it is disclosed: a corpus that
distinguishes its measured claims from its cited ones is behaving correctly. It would be a medium if
the reports implied all 73 cases were measured.
→ Execute them before `task.80` consumes the corpus as an oracle, or drop the unverifiable half of
each claim.

**Consistency — clean.** Frontmatter `status: ready-for-review` matches the body `**Status:**`; all 45
checkboxes ticked; the Change Log carries six rows across the run (review verdict, develop, three QA
verdicts, two qa-fix) with `Version` blank on all but the review row, as the spec requires;
`updated:` bumped.

---

## Code Review Findings

**[CR-1] robustness · low · confidence: high — `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`**
`BUNDLED_REFS` is derived with `readdirSync(bundledDir).filter(f => existsSync(sourcePath(f)))` and
has no type guard. Verified benign today — 29 entries, **0 subdirectories**, and 0 of the 27 matched
refs is a directory on the source side — so `readFileSync` cannot currently be handed a directory.
If the bundler ever emits a nested directory that also exists under `shared/resources/`, the parity
test would fail with an opaque `EISDIR` rather than a useful message.
→ Add `&& statSync(...).isFile()` to the filter.

Checked and clean: all **55** derived fragments produce valid regexes under `escapeRe`; the
`(?<![\w-])` lookbehind is supported (Node v26.4.0); no corpus input contains a backtick, so
`renderInput`'s fence logic never engages its edge case; the empty input renders as
`_(empty string)_`; the purity check's literal-stripping keeps every real declaration
(`export const SINKS`, `corpusFor`, `renderCorpusTables`, `sinkCases`, `Object.freeze`) while
neutralising all three hostile-looking strings (`process.env.SECRET`, `<script>`, `child_process`).

---

## Aside — a defect in the review tooling, not in this PR

`review-pr` SKILL.md Step 2's branch-stem snippet is
`sed -E 's|^(feature|bugfix|hotfix)/||'`, which uses `|` as **both** the `s` delimiter and the
alternation operator. It fails on BSD sed with `RE error: parentheses not balanced`, leaving `STEM`
empty and silently dropping rung 1 of the resolution cascade on macOS — the default platform. Worked
around here with a `#` delimiter. Out of scope for this PR; worth its own bug report.

---

## Recommended Actions

1. **None blocking.** Proceed to Step 7 (`/finalise`).
2. Add the `isFile()` guard to `BUNDLED_REFS` (CR-1) — one line, no urgency.
3. Before `task.80` consumes the corpus as an oracle, execute the three cited claims (PC-1).
4. File a bug for the `review-pr` sed delimiter defect noted above.

---

## Verdict Derivation

Per the deterministic table: no finding is `severity: high`, and none is `severity: medium` at any
confidence. Both findings are `low`. → ✅ **APPROVE**.

Advisory only — no gate written, no formal GitHub review submitted, no code edited.
