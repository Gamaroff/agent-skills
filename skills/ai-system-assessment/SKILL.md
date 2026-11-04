---
name: ai-system-assessment
description: Read-only assessment of a system, repository or project against eight practices for building AI systems (prompt and change control, grounding, tools, access control, guardrails, cost control, observability, evals before change). Rates each practice from cited evidence and writes a report with a roadmap ordered by value per effort. Use when the user asks to assess, audit or review an AI system, assistant, agent or prompt library against best practice, or asks what is missing before production. Does not auto-invoke.
disable-model-invocation: true
---

# AI System Assessment

Rate a target against eight practices for building AI systems. Read the target, record evidence, rate each practice, and write one report with a prioritised roadmap. Advisory only: this is not a certification and not a compliance score.

The eight practices come from how production assistants mature. A team wraps a model, then adds a system prompt, grounding, tools, access control, guardrails, cost control, observability and evals, each in response to a failure. The last lesson: an unevaluated prompt edit undoes all of it.

## Rules

1. **Read-only.** Never edit, install or run the target's code, tests or network services. Every check is a read or a grep. Running the target's tests is offered to the user, not done. The only write is the report file (see Output).
2. **Evidence or Unverified.** Every `Strong`, `Partial` and `Gap` cites a `path:line` or the exact command. A rating with neither is `Unverified`.
3. **Absence of evidence is not a Gap.** A Gap needs recorded searches that covered the plausible locations, including a search by what the control does, not only what it is called. Otherwise rate `Unverified`.
4. **Judge applicability by target type.** A prompt library is not marked down for lacking a vector database.
5. **Do not duplicate other skills.** See the table at the end.

## Workflow

1. **Identify the target.** Take a path or description from the user; default to the current repository. Read its README, instruction files and directory layout.
2. **Decide the target type** and say why. Load [references/target-types.md](references/target-types.md). Mark principles that cannot apply as `Not applicable`, with the reason.
3. **Load the rubric:** [references/rubric.md](references/rubric.md).
4. **For each applicable principle, load only its checklist** and run its signals. Record each result as `path:line` or the command.

   | # | Checklist |
   |---|---|
   | 1 | [p1-prompt-and-change-control.md](references/p1-prompt-and-change-control.md) |
   | 2 | [p2-grounding.md](references/p2-grounding.md) |
   | 3 | [p3-tools.md](references/p3-tools.md) |
   | 4 | [p4-access-control.md](references/p4-access-control.md) |
   | 5 | [p5-guardrails.md](references/p5-guardrails.md) |
   | 6 | [p6-cost-and-routing.md](references/p6-cost-and-routing.md) |
   | 7 | [p7-observability.md](references/p7-observability.md) |
   | 8 | [p8-evals-before-change.md](references/p8-evals-before-change.md) |

   Signal tables list a `Pattern` and `Paths`. Run them with the target's own tools (`grep -rniE`, `ls`). Paths are relative to the target root. A hit is a lead, not a rating: read it, and discard hits in changelogs, plans, task documents and archives (see the rubric).
5. **Rate each principle** using the rubric and the checklist's thresholds. For a `Gap`, list every search run. For a `Partial`, name what is not covered.
6. **Build the roadmap.** One item per Gap or Partial. Order by value per effort, highest first. Each item names the closing artefact from the checklist (a file, a test, a rule), its value (High/Medium/Low) and effort (S/M/L). Use [assets/roadmap.template.md](assets/roadmap.template.md).
7. **Write the report** from [assets/report.template.md](assets/report.template.md). Start with one table of ratings, detail below.

## Output

One report file, written in one run. Default path: `AI_SYSTEM_ASSESSMENT.md` in the working directory, or a path the user names. Never write inside `skills/`, and never inside the assessed target when it is another repository. Tell the user the path and the lowest-effort high-value roadmap item.

## What this is not

| Skill | It does | This skill does not |
|---|---|---|
| `tech-debt-audit` | audits code health across a whole repository | judge AI-system practice |
| `review-security` | executes a security control against adversarial input and reports whether it engages | test controls; it rates whether they exist, and points to `review-security` for depth on principle 5 |
| `review-code` | reviews a diff for bugs | review a diff |

## Limits

Ratings come from reading, so they can be wrong. A false Gap sends the reader to build something that exists: when unsure, choose `Unverified` and say what was not covered. Re-measure any figure before quoting it.
