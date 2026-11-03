---
type: log
title: "task.253 mutation proof"
description: "For each fix, the behaviour reverted and the test that went red. Committed so the QA report and the DoD can cite it."
---

# task.253 — mutation proof

One row per fix: revert the behaviour, run the named test, expect red, restore, expect green. Mutations were applied to the working tree only and restored before the commit. Date of every row: 2026-11-03.

| Gap / phase | Mutation (what was reverted) | Test that went red | Restored → green |
| --- | --- | --- | --- |
| 1. Multi-line link (Phase 2) | `linkPass` reads `openLine` instead of `targetLine ?? openLine` | `253 gap 1` (`migrate-doc-numbering.test.mjs`) | yes |
| 1. Multi-line link (Phase 2) | `scanLinks` never sets `targetLine` | `task 253: a link whose text spans a newline…`, `task 253: targetLine tracks…` (`doc-links.test.mjs`) and `253 gap 1` | yes |
