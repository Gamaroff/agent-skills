---
id: task.334.plan
title: "Implementation Plan: Probe fenced blocks that take several inputs"
type: plan
task-ref: task.334.probe-fence-blocks-with-several-inputs.md
---

# Implementation Plan: Probe fenced blocks that take several inputs

> Requirements and success criteria: [task.334.probe-fence-blocks-with-several-inputs.md](task.334.probe-fence-blocks-with-several-inputs.md)

## Overview

Add a repeatable `--bind` to the `fence:` form beside `--slot`, apply the binds before the slot, and
decline a block that still holds a `NAME="{…}"` placeholder before any case runs.

## Phase-by-Phase Implementation Guide

### Phase 1: `--bind` and the decline

**`security-probe.mjs`, the CLI flag map** (near `"--slot": "slot"`): `--bind` is repeatable, so
collect it into an array, as `--fixture-copy` is collected. Reuse that flag's accumulation code.

**Validation** (beside the `slot` check that returns `bad-slot`):

```js
// binds: [{token, value}] from "--bind token=value", split on the FIRST "="
if (binds.length && !isFenceForm) return decline("bad-bind", "--bind applies to the fence: entry form only");
for (const raw of bindsRaw) {
  const i = raw.indexOf("=");
  if (i <= 0) return decline("bad-bind", `--bind "${raw}" needs <token>=<value> with a non-empty token`);
  // token === slot, duplicate token → bad-bind
}
```

**After `extractFencedBlock`** (where the slot presence is checked): each bind token must appear in
the block (`bad-bind`, "a bind that substitutes nothing"). Then:

```js
const bound = binds.reduce((s, b) => s.replaceAll(b.token, () => b.value), extracted.code);
// Greedy within the line: placeholders nest braces (finalise's STEM="{story.{P}.{E}.{S} | …}").
const PLACEHOLDER = /^\s*([A-Za-z_][A-Za-z0-9_]*)="(\{.*\})"\s*$/gm;
const left = [...bound.replaceAll(slot, "").matchAll(PLACEHOLDER)];
if (left.length) return decline("unbound-placeholder", `the block still holds ${left.map(m => `${m[1]}="${m[2]}"`).join(", ")} — bind each with --bind '<token>=<value>'`);
fenceBlock = bound;
```

Removing the slot from the scan matters: the slot token is itself a `NAME="{…}"` placeholder.

**Per-case substitution** stays `fenceBlock.replaceAll(slot, () => c.input)`; `fenceBlock` is already
bound, so binds come first by construction.

**Record:** beside `base.slot = slot`, `base.binds = binds` when non-empty.

### Phase 2: Tests

Use the file's `fenceRoot` helper and the existing `fence:` cases as the model. The review-story Step
10 block's two placeholders are:

- `{resolved story file path}` — bind it to a story file the fixture writes;
- `{PIN_BRANCH as Step 9.6's resolve block printed it — empty when it did not pin}` — the slot.

A stub `node` on PATH (the pattern in `shared/resources/tests/review-story-pin-blocks.test.mjs`)
makes the sync call observable. Calibration block for the pattern:

```bash
X="${HOME}"; for f in {a,b}; do :; done; echo "{not an assignment}"
```

## Key Patterns and References

- `--fixture-copy`'s repeatable-flag handling is the model for `--bind`.
- Declines go through the existing `decline(reason, detail)`; add both reasons wherever the reason list
  is enumerated (grep `bad-slot` across `shared/resources/` and its tests to find each list).

## Testing Approach

Run `command node --test shared/resources/tests/security-probe.test.mjs`, then the mutations listed in
the task's § 8, each reverted after its test is seen red.
