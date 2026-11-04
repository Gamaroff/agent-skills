# Principle 5: Guardrails

## Failure it prevents

A hidden line in an email, ticket or web page is read as an instruction and triggers refunds, leaks data or runs commands.

## Scope note

This principle rates whether guardrails exist. It does not test whether one engages under adversarial input. For that, point the reader to `review-security`, which executes the control. Do not duplicate it here.

## Evidence signals

Run every row. Patterns are case-insensitive extended regular expressions; a `|` inside a table cell is written `\|`. A `file` signal hits when its glob matches at least one file.

The untrusted-content row searches by behaviour, because the control is often written without the words "prompt injection". A search for the names alone (`prompt injection`, `untrusted`) misses it.

| ID | Signal | Kind | Pattern | Paths |
|---|---|---|---|---|
| p5-untrusted-text-rule | A rule says text from tickets, PRs, emails or web pages is data, never instructions | grep | `(fetched\|third[- ]party\|external\|ticket\|e-?mail\|web page\|issue body).{0,80}\bdata\b.{0,20}(never\|not).{0,20}instruction` | `**/*.md` |
| p5-secret-scan | Secret scanning runs in CI or a hook | grep | `gitleaks\|trufflehog\|detect-secrets\|secret[-_ ]scan` | `{.github,.husky,scripts}/**/*` |
| p5-pii-masking | Personal data is masked or redacted before it reaches the model or logs | grep | `pii\|mask\|redact\|scrub` | `{src,lib,app,tools,scripts}/**/*` |
| p5-input-filter | An input filter or content check runs before the model call | grep | `sanitiz\|input filter\|moderation\|content filter` | `{src,lib,app,tools,scripts}/**/*` |

## Thresholds

- **Strong**: an untrusted-content rule plus a mechanical check (a lint test, a hook, a filter), and secret scanning, all cited.
- **Partial**: the rule exists in prose only, or secret scanning exists without the untrusted-content rule.
- **Gap**: the model reads third-party text and no rule, filter or scan was found after running the signals, including the behaviour-shaped one.
- When rating a Gap, list the places where third-party text reaches the model (`path:line` per read site).

## Common false positive

Secret scanning counted as injection defence. They are different controls; rate each on its own signal.

## Closing artefact

A written rule that third-party text is data, a lint test that fails when a skill reads such text without it, and input and output filters at the model boundary.
