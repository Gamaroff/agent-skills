# Bug Report: Task 243 - Recording a node again can add a second row instead of replacing the first

**Task**: [Link](./task.243.wireframe-component-mapping.md)
**Bug ID**: TASK-243-BUG-16
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
**Found By**: QA Engineer
**Date Found**: 2026-10-29

## Description

Since the cycle 12 fix (bug.15), `parsePattern` decodes percent-escapes. Two different signature
texts can now mean the same attribute value: `window>input{v=é}` and `window>input{v=%C3%A9}`, or
`v=72%` and `v=72%25`.

`record` (`shared/resources/wireframe-map.js:811`) still finds the row to replace by comparing the
raw signature text. Recording a node under the spelling `signatureOf` writes therefore adds a second
row after a hand-written row in the other spelling. Both rows match the node, the earlier one wins
the tie, and the answer just recorded never takes effect.

## Steps to Reproduce

Run the reproduction script from the QA scratchpad, or the shorter check below:

```bash
command node -e '
const m = require("./shared/resources/wireframe-map.js");
const node = m.listNodes(m.extractBlocks("```wireloom\nwindow:\n  input v=\"é\"\n```\n")).find((n) => n.primitive === "input");
const rows = [
  { signature: "window>input{v=é}", label: "", component: "Old" },
  { signature: "window>input{v=%C3%A9}", label: "", component: "New" },
];
console.log(node.signature, "->", m.match(rows, node).component);
'
```

With `record`: record `window>input{v=é}` as `Old`, then the node's own signature
`window>input{v=%C3%A9}` as `New`. Both calls report `added`, and the map holds two rows for the
node. The same happens with `72%` then `72%25`.

## Expected Behavior

Recording a signature that means the same thing as an existing row (same label) replaces that row,
and the newer answer is the one `resolve` applies.

## Actual Behavior

The second record reports `added`, the map holds two rows, and `match` returns the older answer
(`window>input{v=%C3%A9} -> Old`).

## Impact

A corrected answer is silently ignored whenever the existing row was written by hand in the other
spelling, which the procedure allows for values such as `72%` and `é`. Nothing is written outside
the map and nothing escapes. Provenance: at the gate 12 head (`295974a5`) the same two records also
add two rows, but there they mean different values, so that is correct. This defect is introduced by
the cycle 12 decoding.

## Recommendation

Find the row to replace by comparing parsed signatures (parent, primitive, flags and decoded
attributes), or by rewriting both sides to one canonical encoded form, plus the label. Add a test
that records over a hand-written row in the other encoding and expects `replaced`. Found by the
gate 13 code review (CR-1).

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-29 | New | qa-task | Found by task.243.qa.13.wireframe-component-mapping.md (CR-1) |
