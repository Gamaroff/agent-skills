---
title: QA Surface Checklist — {{letter}}. {{surfaceTitle}}
type: guide
status: active
created: {{date}}
updated: {{date}}
---

# QA Surface Checklist — {{letter}}. {{surfaceTitle}}

Executable items for this surface, grouped by story. Each item is **Persona · Steps · Expected · Automated by**. *Expected* is an observation a stranger could confirm. *Automated by* names the spec that already exercises it, or `manual only` — the `manual only` items are the ones only a human ever checks.

Results are never recorded here — they go in `runs/<date>-<env>-<id>.md`.

## {{id}} — {{storyTitle}}

### {{letter}}.{{id}}.1 {{item title}}

- **Persona:** {{account or "none (signed out)"}}
- **Steps:** {{numbered, concrete: route, click, input}}
- **Expected:** {{status code / visible string / element state}}
- **Automated by:** {{spec path}} · or `manual only`
