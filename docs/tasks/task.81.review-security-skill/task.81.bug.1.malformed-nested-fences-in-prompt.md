# Bug Report: Task 81 - Nested code fences break the reviewer prompt's Output Contract section

**Task**: [Link](./task.81.review-security-skill.md)
**Bug ID**: TASK-81-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
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

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-07

Reproduced with the fence scan. The block opened at line 110 (````markdown) was closed by line 122's
bare three-backtick fence rather than by line 127's, because line 119's ````bash carries an info
string and so cannot act as a closing fence while line 122's can.

**Root cause**: same fence width inside and outside. CommonMark closes a fenced block on the first
fence of **at least** the opening width with **no** info string, and both inner fences satisfy that
against a three-backtick opener.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-07

**Fix Description**: widened the outer example fence to **four** backticks, so the inner three-backtick
````bash and its closer are content rather than delimiters.

**Files Modified**:
- `shared/resources/security-review-prompt.md` — outer fence at lines 110 and 127
- `skills/review-security/references/security-review-prompt.md` — regenerated via `npm run bundle`
  (the source was edited, never the bundled copy)

**Testing**: re-ran the block-boundary check against both the source and the bundled copy. Result:

| | before | after |
| --- | --- | --- |
| example block | 110–122 (truncated) | 110–127 (complete) |
| lines 123–126 | outside any block | inside the example |
| `security_review:` YAML | swallowed into an untitled block | its own ````yaml block, 131–144 |

**Verification Steps for QA**: run the fence scan; confirm three balanced top-level blocks
(````js, ````markdown, ````yaml) and that lines 123–126 sit inside the example.

## Status History

| Date | Status | Note | Author |
| ---- | ------ | ---- | ------ |
| 2026-09-07 | New | Found during QA cycle 1 (Step 4b fence scan) | qa-task |
| 2026-09-07 | In Progress | Root cause confirmed — same fence width inside and outside | qa-fix |
| 2026-09-07 | Ready for QA | Four-backtick outer fence; boundaries verified in source and bundle | qa-fix |
| 2026-09-07 | Closed | Verified fixed — block boundaries re-derived in source and bundle; three balanced top-level blocks | qa-task |
