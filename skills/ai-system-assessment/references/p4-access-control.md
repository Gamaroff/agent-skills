# Principle 4: Access control

## Failure it prevents

A new hire reads a manager's pay. The assistant holds one broad credential, so any user can reach anything the assistant can.

## Evidence signals

Run every row. Patterns are case-insensitive extended regular expressions; a `|` inside a table cell is written `\|`. A `file` signal hits when its glob matches at least one file.

| ID | Signal | Kind | Pattern | Paths |
|---|---|---|---|---|
| p4-permission-modes | Documented access modes (read-only, restricted, full) the tooling reads | grep | `access[.:_ ](tracker\|vcs\|mode)\|permission[ _-]modes?\|read[-_ ]only (mode\|access)` | `**/*.{md,yaml,yml,json,sh}` |
| p4-user-identity | The end user's identity is passed into each tool call | grep | `on[-_ ]behalf[-_ ]of\|user[-_ ]?id\|acting user\|impersonat` | `{src,lib,app,tools}/**/*` |
| p4-tool-allowlist | A per-tool or per-skill allowlist limits what the agent can call | grep | `allowed-tools\|allowlist\|allow[-_ ]list` | `**/*.{md,json,yaml,yml}` |
| p4-credential-redaction | Credentials are redacted from logs and prompts | grep | `redact\|mask(ed)? secret\|never print` | `**/*.{md,js,ts,py,sh}` |

## Thresholds

- **Strong**: a restriction the tooling enforces (mode resolution, allowlist, identity passed through), cited and held by a test.
- **Partial**: restrictions are documented but only some tools honour them, or enforcement is by convention.
- **Gap**: one broad credential is used for every user or task and no restriction was found after searching the signals.
- For a prompt library, read this principle as what the agent is permitted to do, not end-user identity.

## Common false positive

Treating login at the front door as access control for the tools. Check that identity reaches the tool call.

## Closing artefact

Most-restrictive-wins access resolution that every outward call reads, plus a per-tool allowlist.
