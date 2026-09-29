# QA Report: Task 141 - cycle 8 (granted 1 of 2, second grant)

**Task**: [task.141.qa-next-targeted-item.md](./task.141.qa-next-targeted-item.md)
**Gate File**: [task.141.gate.8.qa-next-targeted-item.yml](./task.141.gate.8.qa-next-targeted-item.yml)
**Review Date**: 2026-09-23
**Gate Status**: CONCERNS — no HIGH, fourth gate running

---

## Executive Summary

This cycle had a narrow job: gate the three cycle-7 fixes in `c5efbe9b` before anything else. The
shared `isToolWrittenLink` predicate holds on the axis it was written for. Cycle 7's other fix is a
different story: the CR7-3 `#fragment` strip reopened the **validated-vs-published** divergence on a
third axis. `--check` validates `linkTarget(link)`, the path with its fragment removed, while
`--item` publishes `link` with the fragment still attached. So `../bugs/bug.1.real.md#repro` passes
`--check` and is then handed to Step 4, which cannot open it. The rule's two prose restatements
still do not match the code, either.

This is the seventh cycle out of eight to find its defect in the previous cycle's fix.

**Overall Assessment**: CONCERNS · **Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

Direct tools plus **one dispatched read-only reviewer** (Explore, the shared code-review prompt passed
verbatim, with a cycle-specific refute focus appended). It returned in 1m25s. Every bug finding was
then **reproduced by execution** against a fixture, on HEAD and on `origin/develop`. The script was
run from its real repo path with `--root <fixture>`, because of bug.16.

```
Re-review scope: commit c5efbe9b (operator-pinned) — uat-status.mjs, README.md, uat-status.test.mjs
```

The skill's default cycle-3+ scoping would have reviewed **nothing**. Gate 7's `updated:
2026-09-23T01:40:00Z` is five hours after the commit that wrote it (`2026-09-22T20:44:52Z`), so
`git log --since` returns zero files. The non-vacuity guard only fires when there are files but the
patch is empty, so zero files goes straight to dispatch. Recorded as observation #165 against
`qa-task`. This gate's `updated:` comes from `date -u`.

Step 4b: not applicable. There is no runnable prose in the change set: no `SKILL.md` or
`shared/resources/*.md` changed.

Bug report files: none were created for BUG-18/19. That follows this branch's practice since cycle 5
(BUG-5 through BUG-17 are recorded in the gates and QA reports only), and this is noted here as a
deviation from Step 9 rather than left silent.

---

## Re-Review Context — cycle 7's three fixes

| Fix | Verdict |
| :--- | :--- |
| `isToolWrittenLink` shared by `describeRow` and `checkRegistry` (BUG-16) | **HOLDS on its axis.** A prose URL is skipped by both, and a fail row with a URL alone still exits 1. M33 re-proved: red. **But** the value published is `link` and the value validated is `linkTarget(link)`, so they share a predicate and not a result. BUG-18 below |
| `linkTarget` strips a `#fragment` before the exists check (CR7-3) | **PARTIAL.** It strips for the exists check only, so the published path keeps the fragment (BUG-18). It cuts at the *first* `#`, which breaks a filename containing `#` that base passed (CR8-3). The same strip was not applied to the run link or the Findings `Filed as` link (pre-existing, CR8-2). M34 re-proved: red |
| README + `renderSkeleton` restate the rule (BUG-17) | **NOT FIXED.** The three statements still disagree with the code, and with each other. The README hunk also deleted a sentence that is still true (BUG-19) |

---

## New Findings This Cycle

- **[medium] BUG-18** `skills/qa-next/scripts/uat-status.mjs:756` — `describeRow` publishes `bug`
  with its fragment while `checkRegistry` validates it without one. → Publish and validate **one
  expression**, not one predicate followed by a transform that is applied on one side only.
- **[medium] BUG-19** `skills/qa-next/README.md:101` (and `uat-status.mjs:309`) — the README drops
  `//host` from the skip list and deletes the true warnings sentence. The skeleton says "a plain URL"
  and omits anchor-only and `//host`. Both say "every bug link **the tool wrote**", but the predicate
  cannot know who wrote a link: it checks every repo-relative link whose text contains `bug.`. →
  Word the rule the way the predicate works, identically in both places, and restore the sentence.
- **[low] CR8-3** `skills/qa-next/scripts/uat-status.mjs:519` — `linkTarget` cuts at the first `#`,
  so `../bugs/bug#2.md` fails `--check` naming a file that exists. Base passed it. No
  create-bug-report filename contains `#`.

**Pre-existing, routed to `recommendations.future`** (Step 3b.5b provenance, identical output on
`origin/develop`): **CR8-2**. The fragment strip was applied to Notes bug links only, so
`runs/D.1/r.md#items` in `Last run` still errors "run file not found" on both base and HEAD. It
belongs with CR7-4: `Filed as` has no prose skip either. One resolver for every href that `cmdCheck`
validates would close both.

---

## Probes executed (fixture, real repo path, `--root`)

| Case | HEAD `--check` | HEAD `--item` `bug` | `origin/develop` `--check` |
| :--- | :--- | :--- | :--- |
| `[bug.1.real](../bugs/bug.1.real.md#repro)` | **0** | `../bugs/bug.1.real.md#repro` | 1 (not found) |
| run link `runs/D.1/r.md#items` | 1 (run not found) | `../bugs/bug.1.real.md` | 1 (identical) |
| `[bug.2](../bugs/bug#2.md)`, file exists | **1** (not found) | `../bugs/bug#2.md` | 0 |
| `[bug.1.real](../bugs/bug.1.real.md?x=1)` | 1 | `…?x=1` | 1 (identical) |
| `[bug.1.real](./../bugs/bug.1.real.md)` | 0 | `./../bugs/bug.1.real.md` | 0 (identical) |

Row 1 is BUG-18: `--check` accepts a row whose published path cannot be opened. Row 3 is CR8-3.

---

## Code Review

**Correctness bugs (3):**
- [medium/high] `skills/qa-next/scripts/uat-status.mjs:756` — published `bug` keeps the fragment
  and the validated path strips it → **promoted to gate as TASK-141-BUG-18** (code_review_blocking)
- [medium/high] `skills/qa-next/scripts/uat-status.mjs:519` — enumeration: the fragment strip
  reached one of three link validators → **pre-existing** (identical on base), `recommendations.future`
  as CR8-2
- [low/medium] `skills/qa-next/scripts/uat-status.mjs:519` — first-`#` cut breaks a `#` in a
  filename → confirmed by execution, entered as TASK-141-CR8-3 (low)

**Cleanups (2):**
- `skills/qa-next/README.md:101` — deleted true sentence; `//host` missing from the skip list
- `skills/qa-next/scripts/uat-status.mjs:309` — skeleton wording does not match the predicate

These two cleanups are **raised by QA as TASK-141-BUG-19 (medium)**. The cycle's remit explicitly
asked for all three statements to be checked against the code, and BUG-17, the same class, was rated
medium.

mutation-proven: M33 `describeRow` publishes any bug-shaped link → "the link --check validates IS the link --item publishes" → covered
mutation-proven: M34 `exists(link)` instead of `exists(linkTarget(link))` → "a #fragment on a repo-relative bug link resolves" → covered

Both mutations applied by an asserted split (count 1), restored from a `cp` snapshot, 41/41 green
between, and `git status --porcelain` unchanged afterwards.

---

## Test Artifacts

```bash
npm test                                   # .claude/skills symlink moved aside — 3944 tests, 3943 pass, 0 fail, 1 skipped
npm run validate -- skills/qa-next/        # ✓ (description-length warning, pre-existing)
command node --test evals/qa-next/unit/uat-status.test.mjs   # 41/41
```

---

## NFR Assessment

- **Security — PASS** · Evidence: reasoned · Probes executed: 0 (probe engine). Offline and
  file-local. The hostile link shapes above were exercised through the CLI, not through the engine.
- **Performance — PASS**.
- **Reliability — CONCERNS** — BUG-18.
- **Maintainability — CONCERNS** — BUG-19.

---

## Final Assessment

**Gate**: CONCERNS · **Quality Score**: 80/100 · **HIGH**: 0 · **MEDIUM**: 2 · **LOW**: 1

The pattern is now plain. Each fix to the published/validated pair has aligned one thing and left a
neighbouring thing unaligned: row state in cycle 6, link shape in cycle 7, the fragment in cycle 8.
Cycle 7's structural move shared the *predicate*. The fix that closes the class shares the
*value*: the string `describeRow` publishes should be the string `exists()` was called on.

---

## Bug Resolution Summary — fixed in-cycle (5b)

| Finding | Fix | Proof |
| :--- | :--- | :--- |
| **BUG-18** | `toolWrittenBugLinks` is replaced by `bugLinkPaths`, which applies the predicate and *then* removes the fragment. `checkRegistry` calls `exists` on those strings and `describeRow` publishes the last of them, so the published path **is** the verified path. The CR7-3 test now asserts `bug: "../bugs/bug.1.real.md"`, that the path opens relative to the registry, and that the author's `#repro` survives in `notes`. SKILL.md Step 3 and Step 4 now describe `bug` as that path | M35 (publish the href) → red; M36 (keep the fragment on both sides) → red; M37 (drop the predicate) → red |
| **BUG-19** | `export const BUG_LINK_RULE`: one string, worded the way the predicate works. `renderSkeleton` interpolates it and the README quotes it verbatim. A new test holds both to it and to the restored warnings sentence | M38 (skeleton restated by hand) → red; M39 (README drops `//host`) → red; M40 (README drops the warnings sentence) → red |
| **CR8-3** | No code change, by decision. A `#` in an href begins a fragment, and base passing a raw `#` was the whole href being read as a path by accident. The rule now says a `#fragment` is ignored, and the error names the path actually checked (`../bugs/bug`). Open to cycle 9 to overturn | Probe re-run: `--check` 1, naming `../bugs/bug` |

Probe matrix re-run on the fix: wherever `--check` exits 0, `--item` publishes a path that exists.
`npm test` (symlink moved aside) **3945 tests, 3944 pass, 0 fail, 1 skipped**; qa-next suite 42/42;
`validate`, `check:generated`, `bundle:check` and `format:check` are all clean.
