# Principle 7: Observability

## Failure it prevents

A wrong answer nobody can explain. There is no record of the prompt, the retrieved context or the tool calls behind it.

## Evidence signals

Run every row. Patterns are case-insensitive extended regular expressions; a `|` inside a table cell is written `\|`. A `file` signal hits when its glob matches at least one file.

| ID | Signal | Kind | Pattern | Paths |
|---|---|---|---|---|
| p7-run-log | Each run leaves a log or state file (JSON lines, a report) | file | — | `{logs,.state,.claude/state}/**/*.{jsonl,json,log}` |
| p7-decision-log | Decisions the agent made are recorded in a document | grep | `decisions? log\|decision records?` | `**/*.md` |
| p7-tool-records | Tool calls and their results are recorded | grep | `journal\|audit log\|tool call log\|actions\.jsonl` | `**/*.{md,js,ts,py,sh}` |
| p7-trace-export | Traces or metrics are exported somewhere queryable | grep | `opentelemetry\|otel\|trace[-_ ]export\|langfuse\|datadog` | `**/*.{md,js,ts,py,json,yaml,yml}` |

## Thresholds

- **Strong**: runs are recorded with prompt, context and tool calls, and the record can be queried across runs, cited.
- **Partial**: per-run records exist but are local, uncommitted or not queryable across runs.
- **Gap**: nothing records what the system did after searching the signals.
- Note whether the records are committed, gitignored or exported. Gitignored records do not survive a fresh checkout.

## Common false positive

Application logs counted as AI observability. Look for the prompt, the context given and the tool calls, not request logs.

## Closing artefact

A per-run record of prompt, context and tool calls, and a cross-run metric (cost, pass rate, failure reasons).
