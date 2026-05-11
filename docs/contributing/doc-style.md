# Doc Style Guide

> **Audience:** contributors authoring or editing docs in this repo.

How docs are written so they stay consistent as the library grows.

## Audience labels

Every doc starts with a one-line audience hint immediately after the title:

```markdown
# Document title

> **Audience:** developers using these skills in a downstream project.
```

Pick one of:

- `anyone` — first-orientation reference material
- `developers using these skills in a downstream project` — consumer docs
- `developers running …` — task-focused consumer
- `contributors authoring or maintaining skills in this repo` — contributor docs
- `reference — …` — pure lookup material

The label tells readers in two seconds whether they're in the right place.

## Voice

- **Direct.** "Run `/create-prd`." not "You might consider running `/create-prd`."
- **Second-person sparingly.** Use "you" when giving instructions, but prefer "the skill" / "the pipeline" / "the orchestrator" when describing behaviour.
- **Avoid filler.** "Simply", "just", "basically", "actually" — cut.
- **State the rule, then explain why.** Especially in anti-patterns and FAQ.

## Structure

### Section template — standards docs

All `docs/standards/*-documents.md` files follow:

1. Purpose
2. Directory layout
3. File naming
4. Frontmatter schema (table)
5. Required body sections (if any)
6. Co-located artifacts
7. Status lifecycle (per-doc subset + link to canonical)
8. Branch strategy (if applicable)
9. Prerequisites checklist
10. Invocation
11. See also

### Section template — runbooks

All `docs/runbooks/*.md` files follow:

1. When to use this runbook
2. Prerequisites
3. Pipeline diagram (Mermaid)
4. Phase-by-phase walkthrough — trigger, inputs, outputs, pitfalls, link to SKILL.md
5. Called-skills map (orchestrators only)
6. Resume / failure recovery (anchor runbooks)
7. Verification
8. See also

### Section template — reference docs

Reference docs are looser. The minimum: title, audience label, one-paragraph intro, the reference content itself, a "See also" footer.

## Length

| Doc type | Target |
|---|---|
| Anchor runbook | 200–300 lines |
| Satellite runbook | 80–150 lines |
| Standards doc | 100–200 lines |
| Reference doc | 100–300 lines |
| Concept doc | 100–200 lines |

If a doc grows past ~400 lines, consider splitting (the evals split is an example).

## Skill names

Backtick all skill names: `` `develop-story` ``. On first mention per doc, link to the SKILL.md: `` [`develop-story`](../../skills/develop-story/SKILL.md) ``. Subsequent mentions can be bare backticks.

For slash commands, backtick the full invocation: `` `/develop-story <path>` ``.

## Code blocks

- Use fenced code blocks with a language hint where possible: ` ```bash `, ` ```yaml `, ` ```mermaid `.
- For terminal commands, prefer `bash` over no language.
- For file path examples (no execution), use no language.

## Cross-links

- **Same directory:** `[text](./file.md)`
- **Sibling directory:** `[text](../sibling/file.md)`
- **Two levels up (e.g. to skills/):** `[text](../../skills/foo/SKILL.md)`
- **Anchors:** `[text](./file.md#heading-slug)` — lowercase, dashes for spaces, drop punctuation
- **Never link to a directory** without a trailing `README.md` — bare-dir links are fragile across viewers

## Callouts

Use blockquote callouts sparingly. Prefer:

```markdown
> **Audience:** …
> **Note:** …
> **Rule:** …
```

Avoid HTML or non-standard admonition syntax.

## Mermaid

- Use `flowchart TD` (top-down) for sequences, `flowchart LR` (left-right) for compact horizontal flows, `sequenceDiagram` for ordered interactions.
- Validate with [`mermaid-architect`](../../skills/mermaid-architect/SKILL.md) before committing.
- Keep node labels short — long labels render poorly on narrow viewers.

## Status of in-progress docs

If a doc is a stub, say so at the top:

```markdown
> **Status of this doc:** stub — full schema to be authored.
```

## See also

- [Authoring skills](./authoring-skills.md)
- [Packaging](./packaging.md)
- [Standards / README](../standards/README.md)
- [Runbooks / README](../runbooks/README.md)
