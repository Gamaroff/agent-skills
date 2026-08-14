# Sprint Review Summary — Task 46

**Task:** Write relative document links, and stop a fenced `# ` truncating a Jira description
**Status:** ✅ Accepted (2026-08-14)
**PR:** [#215](https://github.com/Gamaroff/agent-skills/pull/215) → `develop`
**QA Gate:** PASS (95/100), 2 cycles · **Tests:** 1,253 pass / 0 fail · **CI:** green on `8b7f473`

---

## Summary

Two silent defects in the Jira sync path are fixed. Both failed without a warning, a non-zero exit,
or a visible difference at the point of failure — and both were found from a downstream consumer,
not from this repo's own tests.

**1. A `# ` inside a fenced code block truncated the published Jira description.** `sectionRe`'s
lookahead `(?=\n## |\n# |$)` cannot tell a heading from a shell comment, so a
`# every absolute URL, grouped by ref` line inside a ` ```bash ` block ended the section there and
everything after it vanished from the card. Measured on one card: a Technical Background section
cut from **13,965 characters to 2,283**, discarding a dependency table and an entire open-questions
block. The symptom is indistinguishable from `CONTENT_LIMIT_EXCEEDED` truncation, so the first
instinct is to blame document size and start cutting prose — which makes the real cause harder to
find, not easier.

**2. Branch-pinned document links rot, and nothing catches them.** The three sync scripts stamped an
absolute `.../src/<ref>/<path>` Bitbucket URL into every document they touched, where `<ref>` was
whichever branch the sync happened to run on. Those URLs 404 the moment that branch is deleted after
merge, while the file sits perfectly safe on the default branch. A link checker resolves *relative*
paths; an absolute URL is not inspected at all, so the rot accumulated against a green build.
Measured in one consumer: **1,889 such URLs across 614 documents** — a quarter of its docs tree —
44 already dead, having never once failed a check.

---

## What shipped

| Area | Change |
| ---- | ------ |
| **Fence-aware extraction** | `extractSection` walks lines with a CommonMark-correct fence tracker; `extractBodySections` and `extractStoriesTable` route through it |
| **Relative document links** | `toRelativeDocLink` writes repo-relative hrefs into local files; Jira still gets absolute URLs via `resolveRelativeLink` at ADF-render time |
| **The four `*_bitbucket_url` writes** | Removed. Every **read** is retained, so a hand-set value keeps resolving |
| **`sync-jira-epic` Story reminder** | No longer prints an absolute URL for the author to paste into each story |
| **`jira-epic-creator`** | Same defect fixed in its standalone copy, plus a second instance found while fixing (a `###` inside a fence cut the table early) |
| **Write-back test coverage** | 0 → 25 tests across all three sync scripts |
| **Prettier policy** | `.prettierrc`, `.prettierignore`, `npm run format` — adopted in response to a QA finding |

---

## Testing & QA

Two QA cycles. Cycle 1 returned **CONCERNS (80/100)** on two maintainability findings; both were
fixed and cycle 2 returned **PASS (95/100)** with `top_issues: []`.

**The review technique is worth carrying forward.** The raw diff was 4,920 lines. Normalising both
sides with `prettier@3` and re-diffing isolated the true functional delta to **256 lines**, which
made a complete line-by-line review practical — and the measurement itself produced the first
finding: `sync-jira-task.js` changed 647 lines of which **27** were functional, `sync-jira-story.js`
788 of which **35** were.

`Docs link check` passing on the final commit is the most substantive single piece of evidence: it
is the job that resolves relative links and ignores absolute ones, so it confirms end-to-end that
the replacement links are real rather than merely well-formed.

---

## Notable decisions

- **Reads of `*_bitbucket_url` were kept.** Only the writes are removed. Stripping keys from
  documents that already carry one is a consumer's decision, not this tool's.
- **The Prettier reformat was adopted rather than unwound.** Splitting it into its own commit would
  have rewritten pushed history for a one-time reviewability gain while leaving the recurrence cause
  untouched.
- **`jira-epic-creator` was fixed rather than de-scoped.** Its comment instructed maintainers to
  keep its copy in step with the canonical pattern; shipping the fix beside a written instruction to
  undo it is not a defensible end state.

---

## Known limitations & follow-ups

1. **Existing rot is not repaired.** This stops new absolute URLs being minted; the 1,889 already
   written drain only as documents are re-synced, since the write is an upsert. Consumer-side
   cleanup is a separate card in that repo.
2. **Repo-wide format sweep deferred.** 50 files remain unformatted, so `npm run format:check` fails
   today by design. Wiring it into CI must wait for the sweep.
3. **`dropHeadingLines` / `firstTableIn`** still use the naive `RE_FENCE` — declared out of scope,
   no observed effect, worth a follow-up.
4. **Three fence-tracker copies now exist.** `jira-epic-creator` cannot import the shared library by
   design, so consolidating needs a smaller extraction point than a straight import.

---

## Impact

Consumers stop accumulating dead documentation links against a green build, and stop losing
description content to a markdown parsing artefact that gave no signal it had happened. Both were
invisible from inside the repo that caused them — which is the argument for the coverage this task
added alongside the fixes.
