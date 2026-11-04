# Principle 3: Tools and MCP, with idempotent calls

## Failure it prevents

An assistant that cannot act, or acts twice: a retried call posts a second comment, issues a second refund, or runs a second deploy.

## Evidence signals

Run every row. Patterns are case-insensitive extended regular expressions; a `|` inside a table cell is written `\|`. A `file` signal hits when its glob matches at least one file.

| ID | Signal | Kind | Pattern | Paths |
|---|---|---|---|---|
| p3-tool-wrappers | Tools the model calls are wrapped scripts, CLIs or typed schemas | file | — | `{tools,scripts,bin,mcp}/**/*` |
| p3-idempotency | Writes carry an idempotency key or marker so a retry is safe | grep | `idempoten\|dedup[e]?[-_ ]?(key\|marker)` | `{tools,scripts,bin,src,lib}/**/*` |
| p3-tool-fakes | Tests use a fake of the tool or service instead of the real one | file | — | `tests/**/fake*` |
| p3-exit-codes | Tool wrappers report failure through documented exit codes or error fields | grep | `exit code\|exit [0-9]\|reason` | `{tools,scripts,bin}/**/*` |

## Thresholds

- **Strong**: tools are wrapped, writes are idempotent, and a test with a fake holds the behaviour, cited.
- **Partial**: tools exist and some writes are idempotent, or idempotency is stated but unheld.
- **Gap**: the target lets a model write to an outside system and no wrapper, key or marker was found after searching the signals.
- A target whose model has no tools at all rates `Not applicable` with that reason.

## Common false positive

Idempotency provided by the remote service (a PUT that is naturally safe). Cite the call and say so; it is `Partial` unless a test holds it.

## Closing artefact

One wrapper per outward write, carrying an idempotency marker, with a fake and a retry test.
