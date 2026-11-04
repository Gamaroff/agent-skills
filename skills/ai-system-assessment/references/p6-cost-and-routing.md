# Principle 6: Cost control (caching and model routing)

## Failure it prevents

A Monday-morning token bill: every call goes to the largest model with the full context, and a runaway loop spends without a limit.

## Evidence signals

Run every row. Patterns are case-insensitive extended regular expressions; a `|` inside a table cell is written `\|`. A `file` signal hits when its glob matches at least one file.

| ID | Signal | Kind | Pattern | Paths |
|---|---|---|---|---|
| p6-loop-limit | Loops and retries have a cap | grep | `MAX_ITER\|max[-_ ]?(iterations\|cost\|retries\|turns)` | `**/*.{md,js,ts,py,sh,json,yaml,yml}` |
| p6-cheap-mode | A lite or fast mode shortens work on low-risk items | grep | `lite mode\|fast mode\|--mode\|cheap` | `**/*.md` |
| p6-model-routing | Different steps use different models on purpose | grep | `--model\|model[-_ ]routing\|haiku\|sonnet` | `**/*.{md,js,ts,py,sh,json,yaml,yml}` |
| p6-caching | Prompt caching or response caching is used or specified | grep | `cache_control\|prompt caching\|response cache` | `**/*.{md,js,ts,py,sh,json,yaml,yml}` |

## Thresholds

- **Strong**: caps, routing and caching are all present and read by tooling, cited.
- **Partial**: caps exist but routing or caching is missing, or routing exists only as advice.
- **Gap**: no cap, no routing and no caching found after running the signals.
- Count a missing cache or routing rule as a Gap for that signal, not for the whole principle; rate the principle on the whole picture.

## Common false positive

A model name in an example (`--model sonnet` in a how-to) counted as routing. Routing is a rule or setting a step reads.

## Closing artefact

A per-step model table, a caching rule for stable prompt prefixes, and a cost cap on every unattended loop.
