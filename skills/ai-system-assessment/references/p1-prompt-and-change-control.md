# Principle 1: System prompt, scope and change control

## Failure it prevents

The assistant recommends a competitor, drifts out of scope, or changes behaviour after someone edits its instructions and nobody reviews the edit.

## Evidence signals

Run every row. Patterns are case-insensitive extended regular expressions; a `|` inside a table cell is written `\|`. A `file` signal hits when its glob matches at least one file. A `command` signal is run by hand and is not run by the tests.

| ID | Signal | Kind | Pattern | Paths |
|---|---|---|---|---|
| p1-instruction-file | An instruction file or system prompt exists and states identity and scope | file | — | `{AGENTS,CLAUDE}.md` |
| p1-scope-statement | The instructions say what is out of scope or forbidden | grep | `out of scope\|must not\|never recommend\|do not` | `{AGENTS,CLAUDE}.md` |
| p1-codeowners | Someone is named as owner of the instruction files | file | — | `{CODEOWNERS,.github/CODEOWNERS,docs/CODEOWNERS}` |
| p1-schema-check | A test or lint checks instruction or skill frontmatter | grep | `frontmatter\|front-matter` | `tests/**/*.{js,mjs,py,sh}` |
| p1-branch-protection | Required reviews or checks are documented or configured | command | `gh api repos/{owner}/{repo}/branches/{default}/protection` | — |

## Thresholds

- **Strong**: instruction file present with scope, a mechanical check on edits (schema test, required review via CODEOWNERS plus branch protection), cited.
- **Partial**: instruction file with scope, but no check on edits, or checks cover only some instruction files.
- **Gap**: no instruction file or system prompt found after searching the signals above and the places the target keeps its prompts.
- Record the `command` signal's result if you can run it; if you cannot, note it as not covered.

## Common false positive

A prompt stored in code or a config database rather than a file. Search for the string literal the model receives (`system`, `role: "system"`, `systemPrompt`) before rating a Gap.

## Closing artefact

A named owner (`CODEOWNERS`), a required check that runs on every edit to an instruction file, and a short scope statement at the top of the instruction file.
