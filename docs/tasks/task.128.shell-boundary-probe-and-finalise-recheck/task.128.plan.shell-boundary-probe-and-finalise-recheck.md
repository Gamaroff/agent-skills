# Implementation Plan: task.128 — shell boundary probe and finalise fix-and-recheck

## Overview

Three independent mechanisms: the probe engine reaches a shell script (Phase 1); the boundary rule names one (Phase 2); finalise can close a small provable gap under a pinned precondition table (Phase 3). Phase 2 depends on Phase 1's flag name; Phase 3 depends on nothing.

## Phase-by-Phase Implementation Guide

### Phase 1: Filename sink and shell entry

1. `security-input-corpus.mjs`: add `"filename"` to `SINKS`; cases with `input` (the name), `why`, `expected` (`refuse` | `accept:<stdout>`), `direction`. Hostile: `x.gate.5.y\nz.gate.9.w.yml`, `$(touch PWNED).gate.3.x.yml`, `` `id`.gate.3.x.yml ``, `a;b|c.gate.4.x.yml`, `--.gate.2.x.yml`, `-n.gate.2.x.yml`, `g[1].gate.2.x.yml`, `task.gate.99999999999.x.yml`. Legitimate: `task.121.gate.3.name.yml`, `story.2.1.gate.007.name.yml` (→ 7), a unicode name, a hyphenated name.
2. `security-probe.mjs`: parse `shell:<path>`; containment as for JS; per case `mkdtemp`, write a control file (`task.1.gate.1.x.yml`) and the case's file; run `bash <script> <dir>` and, when `zshAvailable()`, `zsh -c 'bash <script> <dir>'`; verdict per shell; `executed` counts each run. Reuse `spawnSync` with an argv array, `</dev/null`, a 5 s timeout.
3. Tests: `security-probe.test.mjs` shell cases using `shared/resources/qa-cycle.sh` and a pre-fix copy extracted with `git show a412f59a^:shared/resources/qa-cycle.sh` into a fixture file committed under `tests/fixtures/`.

### Phase 2: Boundary rule and prompts

1. `probe-boundary-rule.md`: add the header signal and the routing rule; keep the negative case explicit.
2. Every prompt/step that shows the JS command shows the shell command beside it (grep sites first: `grep -rn "security-probe.mjs" shared/resources skills/*/SKILL.md`).
3. Test: fixture text from task.121 gate 5 `nfr_validation.security.notes` → the rule's signal list matches.

### Phase 3: finalise fix-and-recheck

1. Step 6 table: a row "any section FAIL whose every finding is `severity: low` and fix-and-recheck preconditions hold → FIX-AND-RECHECK". Step 8: the procedure — commit with `fix(<stem>): finalise DoD <section> — …`, `git push`, retake CI reading 1 on that head via the background poll, re-run the reproduction the agent recorded, append "Deviations recorded" to the DoD summary, then continue to Step 7.
2. Preconditions as a Markdown table AND a JSON fixture the test reads, so prose and test cannot disagree.

## Key Patterns and References

- `security-probe.mjs` containment-before-import (task.118 bug.1) — the shell path must check before `spawnSync` for the same reason.
- `tests/qa-cycle.test.js` `run(shell, dir)` — the two-shell invocation shape to reuse.
- `task.121.dod.1` § Step 5 "Deviations recorded" — the wording Phase 3 formalises.

## Testing Approach

Mutation proofs per phase: remove the newline case → engine test on the pre-fix script goes green (wrong); remove the header signal → rule fixture test red; drop one precondition from the JSON → table test red.
