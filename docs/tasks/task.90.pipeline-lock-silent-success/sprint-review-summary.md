# Sprint Review Summary: Task 90 — `advance-pipeline-lock.sh` reports success for an advance that did not happen

**Task:** `task.90.pipeline-lock-silent-success`
**PR:** [#313](https://github.com/Gamaroff/agent-skills/pull/313) → `develop`
**Accepted:** 2026-09-04 · **Final Gate:** PASS 100/100 · **QA Cycles:** 2

---

## Summary

The develop pipelines keep their state in one JSON lock file. Every `develop-*` orchestrator advances
it as the last action of each step, and both the `PreCompact` and `Stop` hooks read `current_step`
from it to decide where a compacted run resumes.

Given a **zero-byte** lock, `advance-pipeline-lock.sh` printed `step 0 → 5`, exited `0`, and left the
file empty. **Success was reported for a state transition that never happened, inside the pipeline's
own state machine.**

The cause is a property of `jq` that is silent in both directions: on empty input it emits nothing and
exits `0`. The defensive read fell back to `0`, and — the actual hole — the `if ! jq … > "$LOCK.tmp"`
write guard did not fire either, so `mv` installed an empty file. A **whitespace-only** lock was
worse: the same path *truncated* a file that had content and still reported success.

## What shipped

- **One decision predicate**, `jq -e 'type == "object"'`, rejecting every shape that cannot carry
  pipeline state: empty, whitespace-only, malformed, and — found by this task's own QA — anything that
  *parses* but holds no object (`null`, `[]`, `"str"`, `42`), where `.current_step = $n` fabricates
  `{"current_step":5}` out of nothing.
- **`--complete` deliberately exempt.** It removes the lock without parsing it; gating it would make a
  corrupt lock permanently unclearable — worse than the bug being fixed. Pinned by its own test.
- **The temp write hardened.** `> "$LOCK.tmp"` followed a pre-existing symlink on a predictable path.
  Now `mktemp` in the lock's own directory: `O_EXCL` on an unpredictable name.
- **16 new test assertions**, run under **bash and zsh** (30 total), with a `command -v zsh` guard so
  `ubuntu-latest` skips rather than fails.
- **A new `pipeline-lock` roadmap legend tag** — no tag covered this script, so `--batch` could have
  paired T90 with another row editing the same file and the two would have conflicted for real.

## Impact

The last silent-success path in the pipeline's state machine is closed. Nine consumer skills carry the
fixed script. A resume after compaction can no longer read a step that was never written.

## Testing & QA

| Gate | Result |
| --- | --- |
| `advance-pipeline-lock.test.sh` (bash) | 30 passed, 0 failed |
| `advance-pipeline-lock.test.sh` (zsh) | 30 passed, 0 failed |
| `npm run ci` (`format:check` + `npm test` + `eval:all`) | exit 0 |
| CI on the final head `1cb04a0` | 4/4 checks SUCCESS |
| Security probes executed | 24 candidates, 23 held |
| Bundled copies | 9 checked, 0 mismatched |

**Mutation-proved individually:** removing the guard predicate turns 6 scenarios red (empty,
whitespace, `null` × 2 interpreters); reverting `mktemp` turns 2 red. Each turns red exactly what it
should and nothing else.

## Known limitations

- Scenario 12's `[]`, `"str"` and `42` shapes are asserted but **not** mutation-proved — they already
  failed closed via the write path. Only `null` binds the new predicate.
- Four LOW residuals, all pre-existing: a symlinked `$LOCK` is replaced rather than followed (safer
  here); `PIPELINE_LOCK` as a directory is a silent no-op; a NUL-byte lock emits a cosmetic warning;
  two concatenated JSON objects pass the guard and garble the step message.

## Follow-up nobody owns yet

**Nothing in this repository can see a committed artifact orders of magnitude larger than plausible.**
`prettier --check` passes on a 28 MB markdown file. That is how a 480,884-line corrupted
implementation report reached this PR and survived every local gate until QA caught it. Worth its own
task.

## What this run got wrong

Three self-inflicted defects, all caught inside the pipeline, none shipped — and all left in the
record rather than tidied away:

1. A **false finding** that `npm run bundle` was leaving copies stale, from a checksum comparison that
   could never match (a bundled copy is the source plus an `AUTO-GENERATED` banner line). Retracted
   with its cause named. Acting on it briefly stripped that banner from 9 files; the pre-commit bundle
   restored it before the commit landed.
2. The **28 MB corrupted report**, from `str.replace("", …)` on a reversed slice. Rebuilt to 218 lines.
3. A **mutation proof that silently stopped holding** when the `null` fix was appended after the
   existing emptiness check rather than integrated with it, leaving a branch no test could falsify.
   Caught by re-running the proof rather than assuming it survived the fix.

## Demo notes

```bash
T=$(mktemp -d); : > "$T/lk"
PIPELINE_LOCK=$T/lk bash shared/resources/advance-pipeline-lock.sh 5; echo "rc=$?"
# before: "advance-pipeline-lock: step 0 → 5", rc=0, file still 0 bytes
# after:  "…is empty or whitespace-only; refusing to advance", rc=1, file untouched
```
