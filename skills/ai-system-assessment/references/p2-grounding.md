# Principle 2: Grounding

## Failure it prevents

A confident wrong answer. The model states a policy from memory (a $500 refund limit when the real limit is $50) because nothing gave it the owned source of truth.

## Evidence signals

Run every row. Patterns are case-insensitive extended regular expressions; a `|` inside a table cell is written `\|`. A `file` signal hits when its glob matches at least one file.

| ID | Signal | Kind | Pattern | Paths |
|---|---|---|---|---|
| p2-source-of-truth | Docs name a single source of truth the model must use | grep | `single source of truth\|source of truth\|canonical` | `docs/**/*.md` |
| p2-retrieval | Retrieval, embeddings or a document index feed the model | grep | `retriev\|embedding\|vector\|rag\b` | `{src,lib,app}/**/*.{js,ts,py}` |
| p2-drift-test | A test or CI step fails when copies of a source drift apart | file | — | `tests/**/*drift*` |
| p2-context-budget | A size limit or budget on always-loaded context | grep | `token budget\|context budget\|max[-_ ]?tokens\|size budget` | `**/*.{md,json,yaml,yml}` |

## Thresholds

- **Strong**: a named source of truth plus a mechanical drift check, cited.
- **Partial**: a named source of truth or retrieval exists, but nothing fails when it goes stale.
- **Gap**: the model is given no owned context and the target documents none, after searching the signals and the places context is assembled.
- For a prompt library, grounding is how prompts obtain ground-truth context (shared docs, bundling, drift checks). Retrieval signals are not expected.

## Common false positive

Treating a long instruction file as grounding. Grounding means the context is tied to an owned source and kept current, not that it is large.

## Closing artefact

A drift test over the copies of the source of truth, and a size budget on always-loaded context.
