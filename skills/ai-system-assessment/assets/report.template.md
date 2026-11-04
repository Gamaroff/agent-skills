# AI System Assessment: {{target}}

**Date:** {{date}}
**Target type:** {{target_type}} — {{target_type_reason}}
**Assessed from:** {{revision_or_path}}

Advisory. Ratings come from reading the target; none is a certification.

## Ratings

| # | Principle | Rating | Key evidence |
|---|---|---|---|
| 1 | System prompt, scope and change control | {{p1.rating}} | {{p1.evidence}} |
| 2 | Grounding | {{p2.rating}} | {{p2.evidence}} |
| 3 | Tools and idempotent calls | {{p3.rating}} | {{p3.evidence}} |
| 4 | Access control | {{p4.rating}} | {{p4.evidence}} |
| 5 | Guardrails | {{p5.rating}} | {{p5.evidence}} |
| 6 | Cost control | {{p6.rating}} | {{p6.evidence}} |
| 7 | Observability | {{p7.rating}} | {{p7.evidence}} |
| 8 | Evals before change | {{p8.rating}} | {{p8.evidence}} |

Ratings used: Strong, Partial, Gap, Not applicable, Unverified (see the rubric).

## Detail per principle

Repeat this block for each principle 1 to 8.

### {{n}}. {{principle}} — {{rating}}

- **Evidence:** {{path:line or command, one per line}}
- **Gaps:** {{what is missing}}
- **Searches run (required for Gap):** {{command and paths, one per line}}
- **Not covered (required for Unverified or Partial):** {{what was not checked}}
- **Not applicable because (required for Not applicable):** {{reason}}

## Roadmap

{{roadmap}}

## Not covered by this assessment

{{limits}}
