# Bug Report: Task 243 - An attribute value with a comma or brace breaks its own signature

**Task**: [Link](./task.243.wireframe-component-mapping.md)
**Bug ID**: TASK-243-BUG-15
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
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

## Developer Fix Cycle

### Iteration 1

**Root Cause**: `signatureOf` and `parsePattern` had no shared rule for a value. The writer put the
raw value in the signature, and the reader ended and split the list on characters the value was free
to hold.

**Fix**: one encoding, defined once. `encodeValue` percent-encodes each attribute value outside an
allow-list: what `encodeURIComponent` leaves alone, plus `/ : # @ + =` for readability. `decodeValue`
in `parsePattern` reverses it. Decoding is lenient: a `%` that starts no valid escape run (`72%`,
written by hand) stays literal, so a hand-written row needs no encoding unless its value holds `,`,
`}`, `%`, whitespace or a table character. The allow-list also keeps `|`, backticks, padding and
line terminators out of every signature, so `record` accepts every signature `listNodes` produces.
The grammar statement now says so in the engine header, the seeded map's guidance, the procedure's
"In the map" rule and `docs/reference/configuration.md`.

**Files Modified**:

- `shared/resources/wireframe-map.js`: `encodeValue`, `decodeValue`, and the header and seeded-map guidance
- `shared/resources/tests/wireframe-map.test.mjs`: new test, "every node's signature reads back to the node, and record then resolve settles it"
- `shared/resources/wireframe-component-mapping.md`, `docs/reference/configuration.md`: the encoding rule
- the eight `skills/*/references/` copies of both shared files (re-bundled)

**Testing**: the new test covers 11 awkward values (`1,500`, `a}b`, `72%`, `100%25`, `a|b`, a
backtick, padding, a tab, `/home`, `a=b`, `é`). For each one it checks:

- the node matches its own signature;
- no other value's signature matches it, so nothing is merged;
- `record` then `resolve` settles it.

Hand-written `72%`, `/home`, `1%2C500` and a non-UTF-8 run `%E2%80` are read as intended.

Mutation-proven, 3 of 3 `covered`: encoding off, decoding off, and a strict decode each turn the new test red (19/20); restored 20/20.

**Verification Steps for QA**: run the reproduction above; every node's attrs read back unchanged.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-29 | New | qa-task | Found by task.243.qa.12.wireframe-component-mapping.md (CR-1) |
| 2026-10-29 | In Progress | qa-fix | Investigation started (fix cycle 12) |
| 2026-10-29 | Ready for QA | qa-fix | One percent-encoding shared by signatureOf and parsePattern; mutation-proven 3 of 3 |
| 2026-10-29 | Closed | qa-task | Verified by task.243.qa.13.wireframe-component-mapping.md |
