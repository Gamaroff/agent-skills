---
id: task.227.plan
title: "Implementation Plan: Step 8 — move the state-file removals out of the Completion Checklist"
type: plan
task-ref: task.227.step-8-checklist-no-rm.md
---

# Implementation Plan: Step 8 — move the state-file removals out of the Completion Checklist

> Requirements and success criteria: [task.227.step-8-checklist-no-rm.md](task.227.step-8-checklist-no-rm.md)

## Overview

Move the five state-file removals from the checklist block into `advance-pipeline-lock.sh --complete`, ahead of its no-lock exit, and guard the block against an `rm` coming back. Test first.

## Measuring the population

From the repository root (Python, run from a file written with the Write tool, not a heredoc):

```python
import glob, re
for f in sorted(glob.glob("shared/resources/develop-pipeline-*.md")):
    lines = open(f).read().split("\n"); inb = False; buf = []
    for i, l in enumerate(lines, 1):
        s = l.strip()
        if s.startswith("```"):
            if not inb and s[3:].strip() in ("bash", "sh", ""):
                inb, start, buf = True, i, []
            elif inb:
                inb = False
                rms = [start + 1 + j for j, b in enumerate(buf)
                       if re.search(r'(^|[\s;&|{(])rm\s', b) and not b.lstrip().startswith("#")]
                if rms:
                    print(f, start, rms, "--complete" in "\n".join(buf))
            continue
        if inb:
            buf.append(l)
```

On 2026-10-22 it printed 8 blocks; one (`develop-pipeline-step-8-commit.md`, the checklist) has `--complete`. The test re-measures; this count is a note, not a contract.

## Phase-by-Phase Implementation Guide

### Phase 1: Tests first

**`shared/resources/advance-pipeline-lock.test.sh`** — follow the existing case shape (`L` = lock path in a temp dir, `PIPELINE_LOCK="$L"`, run `"$SH" "$SCRIPT" …`). Two cases:

```bash
# N.  --complete removes Step 4's and 5c's records beside the lock, in both arms (task 227)
D=$(mktemp -d); L="$D/develop-pipeline.lock"
for r in step4-scope-paths.txt step4-held-paths.txt step4-hold-dir.txt 5c-carry-eligible.txt 5c-carry-classified.txt keep-me.txt; do : > "$D/$r"; done
printf '{"current_step":8}' > "$L"
PIPELINE_LOCK="$L" "$SH" "$SCRIPT" --complete
# assert: lock gone, the five gone, keep-me.txt present
# then repeat with no lock written (the no-lock arm)
```

Use the file's own assertion helpers. Read its header for them; do not invent new ones.

**`shared/resources/tests/step-8-completion-checklist.test.mjs`**

- In `a passing checklist removes Step 4's records`, also `write` `.claude/state/5c-carry-eligible.txt` and `.claude/state/5c-carry-classified.txt`, and add both to the asserted list. The checklist's `LOCK_HELPER` binding (`checklist()`, the `bind` call) already points at the real script, so after Phase 2 the removal comes from `--complete`.
- The guard, beside `every orchestrator mention of --complete names the Step 8 Completion Checklist`:

```js
const RM_WORD = /(^|[;&|({]\s*|\s&&\s*|\s\|\|\s*)rm\s/;
test("no fenced block that calls --complete carries an rm invocation", () => {
  let seen = 0;
  for (const file of pipelineDocs()) {           // the develop-pipeline-*.md list the file already builds
    const text = readDoc(file);
    for (const [a, b] of fencedRanges(text)) {
      const lines = text.slice(a, b).split("\n").filter((l) => !/^\s*#/.test(l));
      if (!lines.some((l) => l.includes("advance-pipeline-lock.sh --complete"))) continue;
      seen++;
      const hits = lines.filter((l) => RM_WORD.test(l.trim()));
      assert.deepEqual(hits, [], `${file}: a block that ends the run removes files directly`);
    }
  }
  assert.ok(seen >= 1, "no block calls --complete — the guard read nothing");
});
```

Check which helper builds the `develop-pipeline-*.md` list (the file has one near `:581`, `.filter((f) => /^develop-pipeline-.*\.md$/.test(f))`) and reuse it. Add the control from the task's Testing Strategy: assert `RM_WORD` does not match `# rm -f of a name`, `confirm x` or `docker run --rm x`, and does match `rm -f a` and `x && rm -f a`.

Red before Phase 2: the two script cases (records survive) and the guard (the block has two `rm` lines).

### Phase 2: Move the removals

**`shared/resources/advance-pipeline-lock.sh`** — after `LOCK=` (`:120`) and before the no-lock `if` whose `case` exits at `:174`:

```bash
# --complete clears the run's records with the lock, in both arms (task 227). They used to be
# removed by `rm -f` lines in Step 8's Completion Checklist block; a host that cannot inspect an
# `rm` inside a wrapped script refuses the whole block, and the checks never ran (obs #87).
if [ "${1:-}" = "--complete" ]; then
  STATE_DIR=$(dirname "$LOCK")
  rm -f "$STATE_DIR/step4-scope-paths.txt" "$STATE_DIR/step4-held-paths.txt" "$STATE_DIR/step4-hold-dir.txt" \
        "$STATE_DIR/5c-carry-eligible.txt" "$STATE_DIR/5c-carry-classified.txt"
fi
```

Check first that nothing between `:120` and the no-lock `if` already consumes `$1` or exits for `--complete`; place the block after the last such line if so.

**`shared/resources/develop-pipeline-step-8-commit.md`** — in the checklist block, delete:

```bash
# Every check passed: Step 4's records have done their job. A record left behind would be read as
# current by the next run in this checkout (task.147 QA-2, CR-7).
rm -f .claude/state/step4-scope-paths.txt .claude/state/step4-held-paths.txt .claude/state/step4-hold-dir.txt
# The 5c carry records too: 6a has committed the set, and a list left behind must not be read by a
# later run's resume probe (task.173 QA-3, CR-1).
rm -f .claude/state/5c-carry-eligible.txt .claude/state/5c-carry-classified.txt
```

and extend the comment above `--complete`: it also removes Step 4's and 5c's records (task.147 QA-2 CR-7; task.173 QA-3 CR-1), so the block itself removes nothing and a host's removal check has nothing to refuse (task 227).

Mutations to run and revert: (1) restore one `rm -f` line in the block → guard red; (2) move the new script block inside the lock-present arm only → the no-lock case red.

### Phase 3: Bundle, docs, changelog

- `npm run bundle`, then `npm run bundle:check`.
- Usage text in `advance-pipeline-lock.sh` (`usage()`): add the records to the `--complete` line.
- `CHANGELOG.md`, Unreleased: "`advance-pipeline-lock.sh --complete` now removes Step 4's and 5c's records; Step 8's Completion Checklist removes nothing directly, so a host's removal check cannot refuse it (task 227)."
- `npm run ci`.

## Key Patterns and References

- Literal names, no glob: `docs/reference/anti-patterns.md` § "Never put a must-succeed path and a glob in one `rm` argv".
- `--complete` stays jq-free: the new block runs before the jq gate, like the existing `--complete` arm (comment at `advance-pipeline-lock.sh:183`).

## Testing Approach

See the task's § 8. Run the checklist test file under the harness's bash and zsh loop, as it does today.
