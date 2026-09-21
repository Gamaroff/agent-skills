---
title: UAT run — {{id}} {{title}}
type: guide
status: active
created: {{date}}
updated: {{date}}
---

# UAT run — {{id}} {{title}}

| Field | Value |
| :--- | :--- |
| Story | [{{id}}]({{storyLinkFromRuns}}) |
| Surface | {{surface}} |
| Environment | {{envLabel}} — {{baseUrl}} |
| Commit under test | `{{commitShort}}` |
| Persona(s) | {{personas}} |
| Tester | qa-next |
| Verdict | {{pass|fail|blocked}} |

## Items

### {{itemId}} {{itemTitle}}

- **Steps:** {{steps as executed}}
- **Expected:** {{from the checklist}}
- **Observed:** {{exactly what was seen — status code, visible text, element state}}
- **Result:** {{pass|fail|blocked}}
- **Evidence:** `{{path under .claude/state/qa-next/…}}`

## Verdict

{{one paragraph: what passed, what failed, what could not be run and why. For fail: the bug file path.}}

## Findings

Everything seen that is **not** an item's own result: a rough edge on a story that passed, a defect on another surface, a fault in the environment or in this harness. One row each; `_None._` when there were none — the section is never omitted. **Where** is a route, element or endpoint; **What was observed** is the observation, not a diagnosis; **Severity** is `Blocker` / `Major` / `Minor` / `Trivial`; **Filed as** is the bug link (relative to this file), or `note` when a stranger could not reproduce it from this row alone. `uat-status.mjs --findings` lists the open ones across every run.

| # | Where | What was observed | Severity | Filed as |
| :--- | :--- | :--- | :--- | :--- |
| 1 | {{route / element / endpoint}} | {{what was seen}} | {{Blocker|Major|Minor|Trivial}} | {{[bug.N.slug](../../bugs/…) or `note`}} |
