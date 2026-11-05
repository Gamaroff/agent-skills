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
| 4. Link-free stub (Phase 4) | the stub's registry path written as a link again | `253 gap 4`, `epicRegistryPointer keeps the old table…` | yes |
| 5. Dirty / behind (Phase 4) | `--apply` no longer turns the warnings into blockers | `253 gap 5` | yes |
| 5. Dirty / behind (Phase 4) | the `git fetch` replaced by a no-op (the never-fetched case) | `253 gap 5`, `253 gap 5 controls` | yes |
| 5. Dirty / behind (Phase 4) | the `dirty-tree` warning dropped | `253 gap 5`, `253 gap 5/6: the text output…` | yes |
| 6. Generated file (Phase 4) | the skip-and-list branch for generated files removed | `253 gap 6`, `253 gap 5/6: the text output…` | yes |
| 6. Generated file (Phase 4) | `!isGenerated(rel)` removed from `inRewriteScope` | `253 gap 6: inRewriteScope refuses a generated file…` | yes |
| 2. Post-apply scan (Phase 3) | `maskedLinks` returns nothing (fenced / code-span links unreported) | `253 gap 2` | yes |
| 2. Post-apply scan (Phase 3) | old-path scan disabled | `253 gap 2` | yes |
| 2. Post-apply scan (Phase 3) | dead-link existence check removed (every link reported) | `253 gap 2` | yes |
| 7. Legacy-name line (Phase 3) | `parseLegacy` result ignored (nothing matches) | `253 gap 7` | yes |
| 7. Legacy-name line (Phase 3) | "already the new scheme" exclusion removed | **no test went red** — `parseLegacy` already rejects new-scheme names, so the line was dead; deleted rather than kept | n/a |
| QA bug 1 (cycle 1) | `if (behind.status !== 0)` branch disabled (a failed `rev-list` read as 0 behind again) | `253 gap 5 controls` (upstream branch deleted on the remote) | yes |
| QA bug 2 (cycle 2) | the story `prd_source` entry written as a constant | `253 gap 3` (asserts each key's value; the old not-null assertion would have stayed green) | yes |
| QA bug 3 (cycle 2) | `maskedLinks` ignores the opening fence character (`true &&`) | `253 gap 2: maskedLinks closes a fence only on…` | yes |
| QA bug 3 (cycle 2) | `maskedLinks` ignores the opening fence length | same test (the four-backtick control) | yes |
| QA CR-3 (cycle 2) | `--prune` removed from the fetch | `253 gap 5 controls` (branch deleted on the remote by another party) | yes |

Gap 3 did not reproduce (Phase 1), so it has no fix and no mutation row.
