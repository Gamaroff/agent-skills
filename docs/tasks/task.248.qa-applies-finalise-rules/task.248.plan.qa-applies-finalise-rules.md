---
id: task.248.plan
title: "Implementation Plan: QA applies the finalise DoD's rules before finalise does"
type: plan
task-ref: task.248.qa-applies-finalise-rules.md
---

# Implementation Plan: QA applies the finalise DoD's rules before finalise does

> Requirements and success criteria: [task.248.qa-applies-finalise-rules.md](task.248.qa-applies-finalise-rules.md)

## Overview

Four rules that `/finalise`'s DoD agents enforce get one runnable definition each, and the QA skills
run that definition instead of judging by eye. The phases are ordered so that each engine exists,
tested, before any prose calls it.

## Order and dependencies

1. **Phase 1, boundary CLI.** Independent; it only adds a CLI entry to an existing module.
2. **Phase 2, criteria drift.** Independent of Phase 1. It needs a criteria reader that keeps
   continuation lines. Either extend `readCriteria` in `finalise-rerun-scope.js` behind an option,
   so its current callers keep their output, or extract a shared helper. Prefer the option: one
   reader, one heading rule.
3. **Phase 3, CHANGELOG script.** Independent. 6d switches to it in the same phase, because a
   script nobody calls proves nothing.
4. **Phase 4, wiring.** Depends on 1–3.

## Phase notes

### Phase 1

- Keep the CLI behind an `import.meta.url === pathToFileURL(process.argv[1]).href` guard, so the
  module's importers (`security-probe.mjs`) see no side effect.
- `no-criteria` exits 1 with `boundary: null`, never `false`. Absence of a section is not a negative
  answer.

### Phase 2

- Base ref: `--base <ref>`. The QA skill passes the PR base's merge-base. The engine refuses
  (`usage`) when `git show <base>:<path>` fails for any reason other than "path not in tree", which
  is `new-document`.
- Normalise before comparing: strip the checkbox state (`[ ]`/`[x]`), collapse whitespace.
- The approver match is `/\bapproved by\s+[^,.;\n]+/i` on the new text. A test pins one form that
  must not match (`approval pending`). It matches task.234's real wording ("amendment approved by
  Lorien Gamaroff at `/finalise`").
- `kind`: `appended` when the normalised old text is a prefix of, or wholly contained in order
  within, the normalised new text; otherwise `reworded`. Decide it per criterion, after normalising.

### Phase 3

- Same `awk` range and `grep -qiE "\btask[ .]${N}\b"` as 6d today. Lift them, don't rewrite them.
- The stem argument is validated as `task.N` or a story/bug id via `doc-id.js` when it is not a
  task. Reject anything else with exit 2. A valid story or bug stem exits 3: 6d checks tasks only.
- `changelog-enforce.sh` answering neither `on` nor `off` exits 4, which 6d maps to its
  `changelog-unknown` HALT. Order: enforcement first (3 or 4), then the file test, then the grep.

### Phase 4

- Each QA site gets one fenced block that runs the engine and one sentence that maps its result to
  a finding. The rule's wording stays in its home file.
- After editing `shared/resources/` sources, run `npm run bundle` and commit every regenerated copy.

## Verification

- `npm test` for the three new test files, then `npm run ci` with `.agents/skills` moved aside.
- `CI=true command node --test tests/ci-tool-skips.test.js`.
- Mutation proofs as listed in the task's Testing Strategy, recorded in the implementation report.
