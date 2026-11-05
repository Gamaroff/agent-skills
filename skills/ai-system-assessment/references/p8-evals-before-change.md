# Principle 8: Evals before every change

## Failure it prevents

A Friday prompt edit undoes everything. A change to the instructions ships with no measurement of whether answers got worse.

## Evidence signals

Run every row. Patterns are case-insensitive extended regular expressions; a `|` inside a table cell is written `\|`. A `file` signal hits when its glob matches at least one file.

| ID | Signal | Kind | Pattern | Paths |
|---|---|---|---|---|
| p8-eval-suite | An eval or test suite for the AI behaviour exists | file | — | `{evals,eval}/**/*` |
| p8-ci-on-prompt-edit | CI runs when a prompt or instruction file changes | grep | `on:\|pull_request` | `.github/workflows/*.{yml,yaml}` |
| p8-behavioural-eval | At least one eval measures behaviour as a pass rate against a baseline | grep | `pass[-_ ]?rate\|minPass\|baseline` | `{evals,eval,tests}/**/*` |
| p8-mutation-proof | Fixes are mutation-proven (revert the behaviour, a test fails) | grep | `mutation[-_ ]prov` | `**/*.md` |

## Thresholds

- **Strong**: an eval gates prompt edits in CI and at least one eval measures behaviour against a baseline, cited.
- **Partial**: tests run on every change but replay recorded output, or behavioural evals exist and do not gate.
- **Gap**: no eval or test touches the AI behaviour after searching the signals.
- Distinguish hermetic checks (wiring, structure, replayed fixtures) from behavioural evals (a pass rate on live model output). Replayed fixtures do not detect a behaviour regression from a prompt edit; say so when the only evidence is replay.

## Common false positive

Unit tests of helper code counted as evals. They protect the plumbing, not the prompt.

## Closing artefact

A behavioural eval with a stored baseline, run in CI on any change to an instruction file, and a required-check rule that blocks the merge when it drops.
