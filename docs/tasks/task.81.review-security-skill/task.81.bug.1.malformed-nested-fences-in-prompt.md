# Bug Report: Task 81 - Nested code fences break the reviewer prompt's Output Contract section

**Task**: [Link](./task.81.review-security-skill.md)
**Bug ID**: TASK-81-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: New
**Found By**: QA Engineer
**Date Found**: 2026-09-07

## Description

`shared/resources/security-review-prompt.md` §4 "Output contract" wraps an example report in a
```` ```markdown ```` fence and nests a ```` ```bash ```` fence inside it. Both use three backticks, so
the inner block's closing fence terminates the **outer** block.

Per CommonMark, a closing fence must carry no info string. Line 119 (`` ```bash ``) therefore cannot
close the block opened at line 110 — but line 122's bare `` ``` `` can, and does.

## Steps to Reproduce

```bash
grep -n '^\s*```' shared/resources/security-review-prompt.md
```

Fences appear at lines 110 (```markdown), 119 (```bash), 122, 127, 131 (```yaml), 144.

## Expected Behavior

§4 renders as: one example-report block, then prose, then one YAML block.

## Actual Behavior

- Lines 110–122 render as the example block, truncated mid-example.
- Lines 123–126 (`**What passed that should not**`, `**What it did reject**`) render as loose
  markdown *outside* any block — the two bullets that carry the section's actual explanatory content.
- Line 127's bare `` ``` `` opens a **new** block, which swallows line 129's prose ("And the machine
  block, once per report…") and the ```` ```yaml ```` opener, ending only at line 144.

The net effect is that the `security_review:` schema loses its YAML highlighting and is presented as
part of an untitled block that begins with a sentence of prose.

## Impact

§4 is the Output Contract — the part of the prompt a reviewing agent must follow most precisely, and
the definition of the machine block a gate consumes. A reader of the rendered form sees a mangled
contract. Nothing fails at runtime, which is why neither `prettier --check` nor the test suite caught
it: the raw text still satisfies the suite's `/```yaml\n(security_review:[\s\S]*?)```/` match.

## Recommendation

Open the outer example fence with **four** backticks so the inner three-backtick fences are content:

````
````markdown
… example containing ```bash … ``` …
````
````

Then re-run the fence scan and confirm zero nested-fence reports.

## Status History

| Date | Status | Note | Author |
| ---- | ------ | ---- | ------ |
| 2026-09-07 | New | Found during QA cycle 1 (Step 4b fence scan) | qa-task |
