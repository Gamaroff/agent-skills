---
id: task.170.plan
title: "Implementation Plan: QA re-entry after a finalise DoD-gaps halt fixed by a code change"
type: plan
description: "Code-level guide for task 170: the reenter-qa-after-finalise.sh writer, its refusal list, the resume-contract bullet and the guards."
task-ref: task.170.qa-reentry-after-finalise-gaps.md
created: 2026-09-30
updated: 2026-10-03
---

# Implementation Plan: QA re-entry after a finalise DoD-gaps halt fixed by a code change

> Requirements and success criteria:
> [task.170.qa-reentry-after-finalise-gaps.md](task.170.qa-reentry-after-finalise-gaps.md)

## Overview

Copy `grant-qa-cycles.sh`'s shape — reconstruct from disk, restore through the one `--restore` path,
write atomically — and add the one thing it never does: lower `current_step` from 7 to 5, only after
every refusal check has passed.

## Phase 1: The re-entry writer

`shared/resources/reenter-qa-after-finalise.sh <doc-dir> <implementation-report>`:

```bash
SNAP=.claude/state/develop-pipeline.last-halt.json
# refusals, in order — each prints "reenter-qa: <reason>" and exits 1
# document match through the restore's OWN selection, before any write (review 1, I4):
CAND=$(bash advance-pipeline-lock.sh --restore --which "$DOC_DIR") || refuse no-snapshot / other-document
# halt_step is a string ("7") — the HALT snippet writes it with jq --arg (review 1, O4)
[ "$(jq -r '.halt_step // empty | tostring' "$CAND")" = "7" ] || refuse not-a-finalise-halt
DOD=$(newest_numbered "$DOC_DIR" dod -name '*.dod.*.md')    # finalise's newest-numbered.sh
grep -q '^\*\*Final Status:\*\* ❌ GAPS' "$DOD"            || refuse dod-not-gaps
GATE=$(bash qa-cycle.sh "$DOC_DIR" --path gate)             || refuse no-gate
HEAD_OF_GATE=$(grep -E '^head:' "$GATE" | …)                # the qa-task Phase 0 parse
# the FULL qa-task Phase 0 measure (review 1, I1): a head that is absent / not 40-hex / not a
# commit / not an ancestor of HEAD counts as moved; otherwise commits since the head + uncommitted
# + untracked, all outside $DOC_DIR
CODE_MOVED=$(git rev-list --count "$HEAD_OF_GATE"..HEAD -- . ":(exclude)$DOC_DIR")
git diff --quiet HEAD -- . ":(exclude)$DOC_DIR" || CODE_MOVED=$((CODE_MOVED + 1))
[ -z "$(git ls-files --others --exclude-standard -- . ":(exclude)$DOC_DIR")" ] || CODE_MOVED=$((CODE_MOVED + 1))
[ "$CODE_MOVED" -gt 0 ]                                     || refuse no-code-moved
```

> **Superseded in QA cycles 1–3** (the shipped script is the evidence): the DoD stem is read from the
> DoD files, not parsed; movement is committed history only, with an uncommitted fix refused as
> `uncommitted-fix`; `qa_reentry` also records `base_cycle`, which the resume contract's re-entry
> precedence keys on.

Then: `advance-pipeline-lock.sh --restore "$DOC_DIR"`, and one `jq` over the restored lock:

```jq
.current_step = 5
| .qa_phase = "5a"
| .qa_max_cycles = ([(.qa_max_cycles // 0), ($cycles + 2)] | max)   # base as grant-qa-cycles.sh; never lower (review 1, I2)
| .qa_reentry = { from_step: 7, reason: "dod-gaps-code-fix", at: $now, gate_head: $head }
```

written through `mktemp` beside the lock and `mv`, temp removed on any failure (the
`advance-pipeline-lock.sh` pattern — never `$LOCK.tmp`). A failed write after the restore keeps
the restored step-7 lock: the snapshot is consumed, so the lock is the run's only state.

## Phase 2: Contract and step docs

`develop-pipeline-resume-contract.md` § "Restore the lock (both resume paths)": insert a bullet
**before** "any other `halt_reason`":

> `halt_step` 7 with the newest DoD file at GAPS **and** code moved past the newest gate's `head:`
> → **do not restore here**; offer "Re-enter QA at 5a" and, on accept, run
> `reenter-qa-after-finalise.sh`. A document-only change takes the next bullet.

Keep the `<!-- who-restores: statement -->` marker's single-statement property: the parity test
reads that section, so extend it rather than restating the rule elsewhere.

## Phase 3: Guards

- `reenter-qa-after-finalise.test.sh`: fixture repo in `mktemp -d`, one test per refusal, one accept.
- `develop-pipeline-on-stop.test.sh`: a lock `{current_step:5, qa_phase:"5a", qa_reentry:{…}}`
  names `/qa-task`.
- Parity (`evals/shared/tests/`): the refusal reasons in the script equal the list in the contract.

## Testing Approach

```bash
bash shared/resources/reenter-qa-after-finalise.test.sh
shellcheck --severity=warning shared/resources/reenter-qa-after-finalise.sh
npm run bundle && npm run bundle:check
npm run ci:fast   # symlinks moved aside
```
