# Sprint Review Summary - Fail-closed reader for the 5c open-coverage check

**Story/Task ID:** task.240
**Completed Date:** 2026-10-28
**Completed By:** Lorien Gamaroff
**Pull Request:** [#776](https://github.com/Gamaroff/agent-skills/pull/776)

---

## Summary

The QA loop's Step 5c check counts open coverage findings in a PR review report. That count now
comes from a Node reader instead of an awk. Anything the reader cannot place reads `unreadable` and
halts the run, so it never prints a wrong count.

---

## What Was Delivered

### Success Criteria Met

- [x] SC-1: every refusal shape reads `unreadable`; every coverage shape reads its count
- [x] SC-2: the parity suite passes under bash and zsh, and no case moved from one count to another
- [x] SC-3: a failing `node` reads `unreadable`
- [x] SC-4: all 187 tracked review reports read the same as before
- [x] SC-5: one `command node` call at 5c, no awk
- [x] SC-6 to SC-8: `ci:fast`, `bundle:check` and `validate` pass
- [x] SC-9: every new guard mutation-proven (M1–M37)
- [x] SC-10 and SC-11: CHANGELOG entry; phrase probe complete

### Key Features Implemented

- **`shared/resources/open-coverage.js`**: reads one line per key over an allow-listed character set (version 1.2), decodes the report's bytes strictly (an invalid UTF-8 sequence is `bad-encoding`), and refuses everything else
- **§5c call site**: one `command node` call plus a `case` backstop, in place of a 35-line awk
- **PyYAML differential test**: compares the reader with YAML on random blocks

---

## Technical Details

### Files Modified/Created

- `shared/resources/open-coverage.js` - the reader (new)
- `shared/resources/pr-review-current.js` - exports the findings-block extractor
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` - the §5c block
- `shared/resources/tests/open-coverage.test.mjs` - unit suite (123 tests)
- `shared/resources/tests/open-coverage-differential.test.mjs` - PyYAML differential (new, from QA)
- `evals/shared/tests/pr-review-loop-parity.test.mjs` - parity cases also run through the reader
- Bundled copies under `skills/develop-task/references/`, `skills/develop-story/references/` and `skills/qa-fix/references/`

### Architecture/Design Decisions

After two QA-loop escalations on shape-by-shape fixes, the reader was narrowed to one line per key
(version 1.2, author-approved). A report shape outside that grammar halts 5c rather than risk a
false count.

### Dependencies

- **New Dependencies Added:** none (Node built-ins only)
- **Breaking Changes:** shapes the awk counted (flow entries, nested lists, block scalars, wrapped values, free text holding `: `) now read `unreadable`. No tracked report uses one.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 123 in `shared/resources/tests/open-coverage.test.mjs`
- **Integration Tests:** parity suite in `evals/shared/tests/pr-review-loop-parity.test.mjs`; PyYAML differential
- **Test Coverage:** `ci:fast` 6,710 pass, 0 fail

### Code Review

- **Reviewers:** QA code reviewer every cycle (9 cycles); Step 5c conformance review
- **Approval Status:** gate 9 PASS (100/100); PR review CONCERNS, no coverage finding
- **Review Comments Addressed:** BUG-1 to BUG-11 fixed and closed; PR review PC-1 to PC-3, PC-5 and PC-6 fixed

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No hardcoded secrets
- [x] No eval, exec or shell in shipped code
- [x] No dependency changes
- [x] `boundary: internal`: the input is the pipeline's own review report

### Compliance Review

Not applicable: internal developer tooling.

---

## Documentation

- [x] §5c and its bundled copies updated
- [x] CHANGELOG `[Unreleased]` entry (task 240)
- [x] The reader's header states the accepted grammar

---

## Demo Notes

### How to Verify

1. `command node shared/resources/open-coverage.js --file <a *.pr-review.*.md>`
2. A report with one open coverage finding prints `OPEN_COVERAGE=1`; a report it cannot place prints `OPEN_COVERAGE=unreadable`, with the reason on stderr
3. `command node --test shared/resources/tests/open-coverage.test.mjs` passes

---

## Known Limitations and Future Work

- review-pr's template writes `finding:` and `suggested_action:` unquoted, so a sentence holding `: ` halts 5c (PR review PC-5). Quote them in the template.
- Gate 9 `recommendations.future`: separate reasons for a non-view byte container and for an unreadable file; pin `ignoreBOM` on the bytes path; `python3 -I` and a user-site PyYAML.
