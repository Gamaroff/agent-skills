---
title: UAT run — {{id}} {{function}}
type: guide
status: active
created: {{date}}
updated: {{date}}
---

# UAT run — {{id}} {{function}}

| Field | Value |
| :--- | :--- |
| Function | `{{id}}` — {{function}} |
| What it does | {{from the registry}} |
| Stories | {{story ids from the registry row, linked relative to this file}} |
| Surface | {{surface}} |
| Environment | {{envLabel}} — {{baseUrl}} |
| Commit under test | `{{commitShort}}` |
| Persona(s) | {{personas}} |
| Tester | qa-next |
| Verdict | {{pass|fail|blocked}} |

## Automated run

{{_None — no lane spec names this function._ · or:}}

- **Command:** `{{uatCommand}} --grep "@{{id}}\b"`
- **Exit code:** {{0|1}}
- **Report:** `{{path under .claude/state/qa-next/… — a copy of uatReportDir}}`
- **Tests:** {{one line per test from results.json — title · pass|fail · assertion message on fail}}

## Items

### {{itemId}} {{itemTitle}}

- **Steps:** {{steps as executed}}
- **Expected:** {{from the checklist}}
- **Observed:** {{exactly what was seen — status code, visible text, element state}}
- **Result:** {{pass|fail|blocked}}
- **Evidence:** `{{path under .claude/state/qa-next/…}}` · or `lane: {{test title}}` when the automated run covered it

## Verdict

{{one paragraph: what passed, what failed, what could not be run and why. For fail: the bug file path.}}

## Findings

Everything seen that is **not** an item's own result: a rough edge on a function that passed, a defect on another surface, a fault in the environment or in this harness. One row each; `_None._` when there were none — the section is never omitted. **Where** is a route, element or endpoint; **What was observed** is the observation, not a diagnosis; **Severity** is `Blocker` / `Major` / `Minor` / `Trivial`; **Filed as** is the bug link (relative to this file), or `note` when a stranger could not reproduce it from this row alone. `uat-status.mjs --findings` lists the open ones across every run.

| # | Where | What was observed | Severity | Filed as |
| :--- | :--- | :--- | :--- | :--- |
| 1 | {{route / element / endpoint}} | {{what was seen}} | {{Blocker|Major|Minor|Trivial}} | {{link to the bug report, relative to this file, or `note`}} |

## Automation candidate

{{_None — covered by `{{spec}}`._ · or, for a 🟡 with no lane spec, what a Playwright spec would need — this is `uat-automate {{id}}`'s input:}}

- **Persona:** {{account, or "fresh registration"}}
- **Tag:** `@{{id}}`
- **Steps as executed:** {{numbered; each with the selector or role/name used, and the input}}
- **Assertions:** {{one per Expected — the visible string / URL / element state / response code}}
- **Setup / teardown:** {{seeded data relied on; anything created that a run should not leave behind}}
