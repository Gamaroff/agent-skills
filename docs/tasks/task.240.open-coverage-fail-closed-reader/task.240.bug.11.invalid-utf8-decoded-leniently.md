# Bug Report: Task 240 - An invalid UTF-8 byte in the report is decoded leniently and still counts

**Task**: [Link](./task.240.open-coverage-fail-closed-reader.md)
**Bug ID**: TASK-240-BUG-11
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (cycle 8 scoped review, CR-1; reproduced by QA)
**Date Found**: 2026-10-28

## Description

The CLI reads the report with `fs.readFileSync(file, "utf8")`
(`shared/resources/open-coverage.js:310`). Node's `utf8` decoder does not fail on an invalid byte:
it replaces it with U+FFFD. U+FFFD is a symbol (`\p{S}`), so it passes `BLOCK_CHARS`, and the
reader counts a block that PyYAML refuses to read at all.

The differential suite cannot see this. It calls `countOpenCoverage` on JS strings, so it never
runs the decode step. The defect sits in the CLI, which is what §5c calls.

## Steps to Reproduce

```bash
printf '# R\n\n## Machine-Readable Findings\n\n```yaml\nfindings:\n  - category: coverage\n    note: a\xffb\n```\n' > /tmp/cr1.md
command node shared/resources/open-coverage.js --file /tmp/cr1.md
```

| Input | Reader at `afccc788` | PyYAML 6.0.3 on the block bytes |
| --- | --- | --- |
| `note: a\xffb` inside an entry | `OPEN_COVERAGE=1` | `ReaderError: unacceptable character #x00ff: invalid start byte` |

## Expected Behavior

`OPEN_COVERAGE=unreadable`, with a stderr reason naming the decode failure.

## Actual Behavior

`OPEN_COVERAGE=1`.

## Impact

The count matches what the writer meant: the bad byte sits in a free-text value. What breaks is
the fail-closed contract, that a printed count is one YAML would read the same way. Corpus: 0 of
187 tracked `*.pr-review.*.md` files hold invalid UTF-8 (measured with `iconv -f utf-8 -t utf-8`
over `git ls-files '*pr-review.*.md'`).

## Recommendation

Decode with `new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(file))` and treat a
decode failure as a refusal (`OPEN_COVERAGE=unreadable`). Add a CLI test that writes a file holding
an invalid byte inside the block and expects `unreadable`. Mutation-prove it by reverting to the
lenient decode.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-28

**Root Cause**: the reader's character allow-list (`BLOCK_CHARS`) judged decoded text, and the
decode itself was lenient. `fs.readFileSync(file, "utf8")` maps every invalid sequence to U+FFFD,
which is `\p{S}`, so the allow-list never saw the byte YAML rejects.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-28

**Fix Description**: the decode moved inside the reader's one contract. `countOpenCoverage` now
takes the report's text or its bytes; bytes are decoded with a fatal
`TextDecoder("utf-8", { ignoreBOM: true })`, and an invalid sequence is the new refusal reason
`bad-encoding`. The CLI reads bytes and passes them through. `ignoreBOM` keeps a leading BOM in the
text, as the old `utf8` read did, so valid input reads exactly as before.

**Files Modified**:

- `shared/resources/open-coverage.js`: strict decode, `bad-encoding` in `REASONS`, the CLI reads bytes
- `shared/resources/tests/open-coverage.test.mjs`: 4 byte-level `REFUSED` rows (a stray `0xff`, a truncated `0xc3`, an overlong `0xc0 0xaf`, a surrogate `0xed 0xa0 0x80`), a bytes-equal-text row, and a CLI case
- `shared/resources/tests/open-coverage-differential.test.mjs`: header corrected (gate 8 CR-2)
- `CHANGELOG.md`; bundled copies regenerated

**Testing**: PyYAML 6.0.3 raises `ReaderError` on all four byte shapes, and each now reads
`unreadable` (`bad-encoding`). Mutations: a lenient decode inside the reader (M36) turns 5 tests
red; a `utf8` read in the CLI (M37) turns the CLI test red. A literal U+FFFD in valid UTF-8 still
counts, as PyYAML reads it. A leading BOM reads as before. A bad byte outside the block is now
refused too, which is fail-closed. Corpus: 187 reports, the distribution unchanged.

**Verification Steps for QA**: re-run the reproduction above; expect `OPEN_COVERAGE=unreadable` and
`bad-encoding` on stderr.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-28 | New | qa-task | Found by task.240.qa.8.open-coverage-fail-closed-reader.md (CR-1) |
| 2026-10-28 | In Progress | qa-fix | Investigation started (qa-fix cycle 8) |
| 2026-10-28 | Ready for QA | qa-fix | Fixed: strict UTF-8 decode inside the reader (qa-fix cycle 8) |
