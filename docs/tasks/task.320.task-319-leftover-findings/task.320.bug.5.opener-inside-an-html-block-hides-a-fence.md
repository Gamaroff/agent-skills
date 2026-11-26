# Bug Report: Task 320 - A comment opener inside an HTML block hides a fence

**Task**: [Link](./task.320.task-319-leftover-findings.md)
**Bug ID**: TASK-320-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
**Deferred To**: task.326 (approved by Lorien Gamaroff, 2026-11-26). Unfixed here; closed when task 326 lands.
**Found By**: QA Engineer
**Date Found**: 2026-11-25

## Description

`partsOf` in `finalise-rerun-at-head.js` starts a comment block at any column-0 `<!--` that a later line closes (T320-CR-601). Inside an open HTML block (`<details>`, `<div>`, `<pre>`, `<table>` with no blank line before the opener), Markdown starts no comment there, so the fence after it is a real fence. A `## ` line in that fence then fails to end the criteria section.

## Steps to Reproduce

Configure `finalise.rerunAtHead: [echo a]`. Give the engine a document whose criteria section holds `<details>`, then `<!-- x` on the next line, then `</details>`, then a fence holding `## y`, then a list item naming `echo a`. End the document with `<!-- note -->` under `## Other`.

## Expected Behavior

`scan-broken`.

## Actual Behavior

`none-named`, exit 0. With no comment at the end, the answer is `scan-broken` (control). The same on `90aabca6c` (reviewer's run).

## Impact

A criterion that names a listed command is not re-run, and nothing says so. No tracked document has this shape.

## Recommendation

Start no comment block while an HTML block is open, reusing the HTML block lists already in the file.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-11-25 | New | qa-task | Raised by task.320.qa.6.task-319-leftover-findings.md as T320-CR-601 |
| 2026-11-26 | New | Lorien Gamaroff | Not fixed in task.320: residual accepted at the QA loop-limit escalation (task.320.gate.6.task-319-leftover-findings.yml waiver). Left open for a follow-up |
| 2026-11-26 | New | Lorien Gamaroff | Deferred to task.326 (task.326.task-320-accepted-residual.md); task.320 criterion 1 amended to match |
