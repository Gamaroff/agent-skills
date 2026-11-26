# QA Report: Task 329 - A git-name sink for classifiers of repository names (cycle 2)

**Task**: [task.329.git-name-probe-sink.md](./task.329.git-name-probe-sink.md)
**Gate File**: [task.329.gate.2.git-name-probe-sink.yml](./task.329.gate.2.git-name-probe-sink.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-26
**Testing Completed**: 2026-11-26
**Gate Status**: CONCERNS

---

## Executive Summary

The cycle-2 refute pass re-read the whole branch. It found that two corpus `correct` texts claim
more than `isDocsPath` does. QA ran `isDocsPath` on each claim, and both are false. Three further
texts are inaccurate. The code and tests are unchanged in substance, and every gate-1 finding is
fixed. Two `isDocsPath` gaps the pass exposed are identical on develop and go to a follow-up.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (T329-QA-4 and T329-QA-5 fixed)

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| T329-QA-1 control-char rationale (core.quotePath) | ✅ FIXED — `6709861a4` |
| T329-QA-2 "no `..` in it" | ✅ FIXED — `6709861a4` |
| T329-QA-3 `.git` spellings | ⚠️ PARTIAL — reworded, but the new list is presented as complete and is not (T329-QA-4) |

### Review Methodology

- **Diff review: code review**, as a **refute pass**, because this is cycle 2 (one prior gate). The
  whole branch diff `origin/develop...HEAD` was read, minus the generated `references/` copies. One
  read-only Explore subagent ran with the refute directive; it returned in 157.7 s (`duration_ms`).
- Re-review scope: unscoped — cycle 2 always reviews the whole branch.
- Step 4b: no changed blocks (unchanged since cycle 1: the cycle-1 fix touched only the corpus).
- CI on 6709861a4558: not read at write time; the cycle-1 push started it.

---

## New Findings This Cycle

- **[medium]** `shared/resources/security-input-corpus.mjs:822`: `git-name.dotfile` `correct`
  presents its list of `.git` spellings as complete. In fact `isDocsPath("docs/.git::$INDEX_ALLOCATION/x.md", ["**"])`
  and `isDocsPath("docs/.git:x/y.md", ["**"])` both return `true`. → Reword so the list is not
  claimed to be complete (T329-QA-4).
- **[medium]** `shared/resources/security-input-corpus.mjs:814`: `git-name.non-ascii` `correct`
  says "only control characters are refused", which is wrong in both directions. `"docs/a.md "` →
  `false` (normalisePath trims the trailing space), `docs/a` + U+2028 + `.md` → `false`, and
  `docs/a` + U+0085 + `.md` → `true`. → State the narrow rule (T329-QA-5).
- **[low]** `shared/resources/security-input-corpus.mjs:672`: the header says one refusal line
  per case. `leading-slash` and `dot-slash` need two (T329-QA-6).
- **[low]** `shared/resources/tests/security-probe.test.mjs:4666`: the comment says "since
  task.325", but that helper exists only on the unmerged task-325 branch (T329-QA-7).
- **[low]** `shared/resources/security-input-corpus.mjs:806`: `plus-signs` describes a regex
  built from the name. `globMatch` (`glob-match.js:77`) builds none (T329-QA-8).

**Provenance (5b).** `git diff --quiet origin/develop -- shared/resources/ci-tree-equivalence.js`
exits 0, so `isDocsPath` is unchanged by this PR. The NTFS `.git:` stream gap and the U+0085
acceptance are therefore identical on the base. They are `pre-existing`, recorded under
`recommendations.future`, and are not in `top_issues[]`. The false *claims* about them are new in
this PR, and those are the two MEDIUM entries.

**Not promoted:** CR-6, low confidence: should the sink be chosen by the predicate or by its call
chain? It is advisory. The routing sentence already says "a name only compared against patterns",
which describes the predicate under probe.

---

## Code Review

**Correctness bugs (3):**
- [medium/high] `shared/resources/security-input-corpus.mjs:822`: the `.git` spellings list is claimed complete and is not. Reproduced by QA. → T329-QA-4
- [medium/high] `shared/resources/security-input-corpus.mjs:814`: "only control characters are refused" is false both ways. Reproduced by QA. → T329-QA-5
- [low/high] `shared/resources/security-input-corpus.mjs:672`: the "one refusal line" header is false for 2 of 14 cases. → T329-QA-6

**Cleanups (3):**
- `shared/resources/tests/security-probe.test.mjs:4666`: the "since task.325" comment. → T329-QA-7
- `shared/resources/security-input-corpus.mjs:806`: the regex-from-name rationale. → T329-QA-8
- `shared/resources/finalise-dod-security-prompt.md:97`: whether the sink is chosen by the predicate or by its call chain. Advisory, not promoted.

Reproduction command, run from the repository root (U+2028 and U+0085 are built with
`String.fromCharCode`, so this file carries no raw invisible character):

```bash
command node -e 'const {isDocsPath}=require("./shared/resources/ci-tree-equivalence.js");
const c = (n) => String.fromCharCode(n);
for (const s of ["docs/.git::$INDEX_ALLOCATION/x.md", "docs/.git:x/y.md", "docs/a.md ", "docs/a" + c(0x2028) + ".md", "docs/a" + c(0x85) + ".md", "docs/café.md"]) console.log(JSON.stringify(s), isDocsPath(s, ["**"]));'
# true, true, false, false, true, true
```

The control case is `docs/café.md`, which returns `true` as its case says.

---

## Success Criteria Verification

Unchanged from cycle 1: all six criteria hold, and the mutation records are in
[task.329.qa.1.git-name-probe-sink.md](./task.329.qa.1.git-name-probe-sink.md). The cycle-1 fix
added one proof: reverting one `.md` row turns "the prose peer contains the generated tables
verbatim" red → covered.

## NFR Assessment

- Security — PASS (reasoned; `boundary: false`, as in cycle 1)
- Performance — PASS
- Reliability — PASS
- Maintainability — CONCERNS (T329-QA-4, T329-QA-5)

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Next Steps**: qa-fix cycle 2 for T329-QA-4 to T329-QA-8, then QA cycle 3. The two `isDocsPath`
gaps go to a follow-up task.
