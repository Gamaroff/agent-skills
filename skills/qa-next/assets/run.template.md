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
