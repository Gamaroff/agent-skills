# QA Report: Task 329 - A git-name sink for classifiers of repository names (cycle 3)

**Task**: [task.329.git-name-probe-sink.md](./task.329.git-name-probe-sink.md)
**Gate File**: [task.329.gate.3.git-name-probe-sink.yml](./task.329.gate.3.git-name-probe-sink.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-26
**Testing Completed**: 2026-11-26
**Gate Status**: PASS

---

## Executive Summary

Every gate-2 finding is fixed, and QA ran `isDocsPath` on each reworded claim. The scoped review
found two LOW prose cleanups. No correctness or product defect remains.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| T329-QA-4 `.git` spellings claimed complete | ✅ FIXED — `eed003c37` |
| T329-QA-5 "only control characters are refused" | ✅ FIXED — `eed003c37` |
| T329-QA-6 "one refusal line" header | ✅ FIXED — `eed003c37` |
| T329-QA-7 "since task.325" comment | ✅ FIXED — `eed003c37` (wording refined: T329-QA-10) |
| T329-QA-8 regex-from-name rationale | ✅ FIXED — `eed003c37` (one clause untested: T329-QA-9) |

### Review Methodology

- **Diff review: code review**, scoped (cycle 3) to the changes since gate 2's `head:`,
  `6709861a4..eed003c37`. That is the corpus `.mjs` and the probe test; the `.md` peer and the
  bundled copies are held by the parity test and `bundle:check`. No refute pass this cycle. One
  read-only Explore subagent returned in 84.1 s (`duration_ms`).
- Re-review scope: `6709861a4..HEAD`, 2 source files.
- CI on `6709861a4`: all six workflows `success` (Test included).

## Claims Verified by Execution

From the repository root, `isDocsPath(s, ["**"])` gives:

| Input | Result | Claim it holds |
| --- | --- | --- |
| `docs/café.md`, `docs/日本語.md` | true | a character above 0x7F is not refused for being non-ASCII |
| `docs/.gitkeep`, `docs/.gitignore`, `docs/.github/x.md` | true | a `.git` prefix is not internal |
| `docs/.git/x.md`, `docs/.GIT/x.md`, `docs/.git./x.md`, `docs/git~1/x.md` | false | the spellings the `dotfile` text names as `.git` itself |

`GIT_NAME_MUTATIONS` (`security-probe.test.mjs`) lists `leading-slash` and `dot-slash` only under the
segment + normalise row, which matches the reworded header.

## New Findings This Cycle

- **[low]** `shared/resources/security-input-corpus.mjs:808`: the `plus-signs` glob-compiling clause
  is not exercised, because the sink probes with `**`, which has no literal parts (T329-QA-9).
- **[low]** `shared/resources/tests/security-probe.test.mjs:4666`: "each refusal has two
  spellings". `dotGit` and `config` have one each (T329-QA-10).

## Success Criteria Verification

Unchanged since cycle 1: all six criteria hold. See
[task.329.qa.1.git-name-probe-sink.md](./task.329.qa.1.git-name-probe-sink.md).

## Mutation records for § 8 (added at /finalise, DoD run 1)

The `/finalise` AC check found that qa.1's records M1–M7 are refusal-line removals and pin mutations.
They are not the four mutations task § 8 names, three of which had never been run. All four were run
on 2026-11-26 against `62fe945b1`. Before each test run, `cmp` against a snapshot confirmed the
mutation was applied. After each run the file was restored and checked with `git diff --quiet`. The
baseline afterwards: `security-input-corpus.test.mjs` 24/24, and the `task.329` tests in
`security-probe.test.mjs` 3/3.

- mutation-proven: M8 `git-name` dropped from `SINKS` → red: "every sink declares a floor, so a new sink cannot pass vacuously", "allCases is memoised and at least as large as the declared floors", "the prose peer contains the generated tables verbatim" → covered
- mutation-proven: M9 hostile case `git-name.leading-slash` flipped to legitimate → red: "task.329: isDocsPath through the git-name sink engages at HEAD — every hostile refused, every legitimate accepted", "task.329: each isDocsPath refusal removed reproduces exactly its git-name cases", "per-sink case counts meet their floors", "every case appears in the document, under its own sink and direction", "the prose peer contains the generated tables verbatim" → covered
- mutation-proven: M10 `git-name` dropped from `finalise-dod-security-prompt.md`'s sink list → red: "every sink is named in each prompt's sink enumeration" (`finalise-dod-security-prompt.md's sink enumeration does not name: git-name`) → covered
- mutation-proven: M11 the paired segment + normalise mutation, with `leading-slash` (`/docs/a.md`) dropped from its expected list in `GIT_NAME_MUTATIONS` → red: "task.329: each isDocsPath refusal removed reproduces exactly its git-name cases" (actual extra: `leading-slash`), "task.329: every git-name hostile case is reached by a mutation of isDocsPath" → covered

The run logs were kept in `.claude/state/mut-dod1/` (gitignored).

## NFR Assessment

- Security — PASS (reasoned; `boundary: false`)
- Performance — PASS
- Reliability — PASS
- Maintainability — PASS

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 96/100
**Next Steps**: HIGH has been 0 on gates 2 and 3, and this PASS gate's only open entries are LOW,
so the loop takes the cosmetic-residue exit to 5c. T329-QA-9 and T329-QA-10 go to Deferred Work.
