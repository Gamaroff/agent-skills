# Bug Report: Task 243 - An attribute value with a comma or brace breaks its own signature

**Task**: [Link](./task.243.wireframe-component-mapping.md)
**Bug ID**: TASK-243-BUG-15
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
**Found By**: QA Engineer
**Date Found**: 2026-10-29

## Description

`signatureOf` (`shared/resources/wireframe-map.js:215`) writes each attribute as `key=value` with the
value unescaped. `parsePattern` reads the attribute list with `\{([^}]*)\}` and splits it on `,`. A
value that holds a `,` or a `}` therefore does not survive its own signature:

- `resource value="1,500"` (the form in `skills/wireframe/references/grammar.md:820`) gives
  `resourcebar>resource{name=Credits,value=1,500}`, which parses back as `{name: "Credits", value: "1"}`.
- `input placeholder="a}b"` gives `window>input{placeholder=a}b}`, which `parsePattern` returns `null`
  for, so `record` refuses the node's own signature as a usage error.

A row recorded for the first node never matches it, so `resolve` lists it as open on every run and
the developer is asked the same question again.

## Steps to Reproduce

````bash
command node -e '
const m = require("./shared/resources/wireframe-map.js");
const wf = "```wireloom\nwindow \"X\":\n  resourcebar:\n    resource name=\"Credits\" value=\"1,500\"\n  input placeholder=\"a}b\"\n```\n";
for (const n of m.listNodes(m.extractBlocks(wf))) console.log(n.signature, JSON.stringify(m.parsePattern(n.signature)?.attrs ?? null));
'
````

## Expected Behavior

Every signature `listNodes` produces parses back through `parsePattern` to the same attributes, and
matches its own node.

## Actual Behavior

`value=1,500` parses as `value: "1"`, and the self-match returns `null`. `placeholder=a}b` does not
parse.

## Impact

The `record` → `resolve` loop does not converge for any node whose attribute value holds `,` or `}`.
Nothing is written wrongly and nothing escapes, but the link the developer confirmed is never applied.

## Recommendation

Give attribute values one encoding that `signatureOf` and `parsePattern` both use, for example quoting
or escaping `,`, `}` and `]`. Add a test that every `listNodes` signature matches its own node through
`parsePattern` and `match`. Found by the gate 12 code review (CR-1).

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-29 | New | qa-task | Found by task.243.qa.12.wireframe-component-mapping.md (CR-1) |
