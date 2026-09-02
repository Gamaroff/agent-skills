---
name: finalise-dod-security-prompt
description: Explore subagent prompt for the /finalise DoD security review — a story-type-aware grep checklist, plus a probe mode that executes candidate inputs against a boundary deliverable instead of inspecting it. Substitute <STORY_FILE> and <STORY_TYPE> before dispatching.
---

# Security Review — Explore Subagent Prompt

**Usage**: Dispatch as an Explore subagent from `/finalise` Steps 3–5 parallel dispatch. Substitute `<STORY_FILE>` and `<STORY_TYPE>` before sending. Story type values: `api` | `ui` | `data` | `auth` | `infrastructure` | `task` | `refactoring`.

---

## Instructions

You are a read-only security verification agent. Run the story-type-specific security checklist for the story/task being finalised, and — when Step 1b applies — probe the boundary it delivers.

**Read-only means you do not mutate. It does not mean you do not run.** You may execute code in order
to test a boundary (Step 4). You must not:

- modify, stage, or commit any file tracked by the repository
- open a network connection
- write anywhere outside a temporary directory

Calling a pure predicate on candidate inputs does none of those three things. This distinction is
load-bearing: an earlier version of this prompt said only "read-only agent", which was read as
*does not execute*, and the checklist below then passed a deny-list with fourteen documented ways
through it — two of them commands the list named by hand. Inspection cannot catch that class of
defect. Execution can.

### Step 1: Determine story type

Confirm `<STORY_TYPE>`. If it reads `task` or `refactoring`, infer the actual security domain from `<STORY_FILE>` content (API endpoints changed → treat as `api`; React/UI components → `ui`; schema migrations → `data`; auth logic → `auth`; CI/CD or infra config → `infrastructure`). If no code changes are security-relevant, mark all checks `NOT_APPLICABLE`.

### Step 1b: Is the deliverable a boundary?

Decide this **before** running the checklist — it selects whether Step 4 (probe mode) runs.

A **boundary deliverable** is one whose diff adds or modifies a function whose purpose is to **accept or
reject**: a classifier, validator, parser, sanitiser, authorisation check, allow-list or deny-list, or
any predicate whose `false` prevents an action.

Signals — any **one** is sufficient:

- an exported predicate that returns a verdict (`true`/`false`, `allow`/`deny`, a status enum)
- a named allow-list or deny-list in any form (array, regex alternation, `switch`, set membership)
- a function whose own tests are mostly of the shape "X is refused"
- a work-item document whose Success Criteria contain *never*, *must not*, *fails closed*, or *refused*

**The negative case is explicit, and it is the common case.** A CRUD endpoint, a renderer, a report
writer, a formatter, a schema migration, a logging change — none of these are boundaries, however
security-adjacent they look. Probe mode must **not** fire on them.

Record the decision either way. If the rule did not fire, return `probes: []` and say so in `summary`.
That is a legitimate, expected skip — not an omission.

### Step 2: Run story-type-specific checklist

For each check: grep the repository or diff for file:line evidence. **Citation rule**: `PASS` requires a non-null `citation`. No citation → `FAIL`. `NOT_APPLICABLE` requires a `note`.

#### api / backend checks
- **Authentication on endpoints**: grep for `@UseGuards`, `JwtAuthGuard`, `AuthMiddleware`, or equivalent in controller/route files changed by PR.
- **Input validation**: grep for `class-validator` decorators, `Joi.validate`, `zod.parse`, or validation pipe/DTO in changed files.
- **No sensitive data in logs**: grep for `logger` / `console.log` calls adjacent to fields named `password`, `token`, `secret`, `ssn`, `card` in changed files.
- **Parameterized queries / ORM**: grep changed files for raw SQL strings (`SELECT * FROM` without prepared statement syntax). Absence of raw SQL in changed files = PASS.
- **Error responses don't expose stack traces**: grep for `stack` in response bodies or `send(err)` patterns in changed files.

#### ui / frontend checks
- **Input sanitized before rendering**: grep for `dangerouslySetInnerHTML` or `innerHTML` in changed files. Presence without sanitization = FAIL.
- **Tokens not in localStorage**: grep changed files for `localStorage.setItem` where value includes `token`, `jwt`, `auth`.
- **Protected routes require auth**: grep for auth guard / HOC wrapping changed route components.
- **No API keys hardcoded**: grep changed files for patterns `apiKey =`, `API_KEY =`, `secret =` with string literals (not env var references).

#### data / database checks
- **DB credentials in env vars**: grep changed files for hardcoded connection string patterns (`host=`, `password=` with literal values, not `process.env`).
- **Migrations reversible**: check migration files changed in PR for `down()` method or rollback SQL.
- **PII fields encrypted/hashed**: grep schema or model files changed in PR for columns named `password`, `ssn`, `credit_card`, `dob` — verify they use `@Column({ select: false })`, hashing util, or encryption annotation.

#### auth checks
- **Passwords hashed**: grep changed files for `bcrypt.hash`, `argon2.hash`, `scrypt`. Plain `crypto.createHash('md5')` or `sha1` = FAIL.
- **Token expiration**: grep changed files for `expiresIn`, `exp`, `maxAge` in token-issuing code.
- **Session invalidated on logout**: grep for token revocation, blacklist, or session destroy in logout handler.

#### infrastructure checks
- **No secrets in version control**: grep newly added files for patterns `password=`, `api_key=`, `secret=`, `token=` with literal string values (not `${}` or env references).
- **TLS configured**: grep changed config files for `https`, `tls`, `ssl` settings or cert file references.
- **Logs don't contain PII**: grep changed logging config or middleware for PII field names.

#### task / refactoring (no code security domain)
- **No hardcoded secrets introduced**: grep all changed files for `password =`, `api_key =`, `secret =` with string literals.
- **No new unsafe patterns**: grep for `eval(`, `exec(`, `shell.run(` in changed files.

### Step 3: General security questions (all types)

- **Security TODOs/FIXMEs**: `grep -rn "TODO.*security\|FIXME.*security\|HACK.*security" --include="*.ts" --include="*.js" --include="*.py"` in changed files.
- **Dependency vulnerabilities**: check if `package.json` was modified in the PR diff; if so, note any new packages added (cite file:line). Full `npm audit` not required — note if risky packages added.

### Step 4: Probe mode — only when Step 1b fired

Skip this step entirely when Step 1b found no boundary.

The checklist above asks whether a boundary **exists**. This step asks whether it **holds**. Those are
different questions, and inspection can only answer the first: a deny-list can be present, well-formed,
and complete-looking while still being permeable to an input nobody thought to write down.

**1. Locate the entry point.** Find the exported function that makes the accept/reject decision — not
its caller, and not the code that acts on the verdict.

**2. Generate candidates** across these axes. They are the ones that defeat boundaries in practice:

| Axis | What to vary |
|---|---|
| **Alternative spellings** | quoting (`g"h"`, `cu'r'l`), escaping (`g\h`), globbing, case, unicode look-alikes, added whitespace |
| **Position** | a flag in trailing rather than leading position; the payload as the last argument rather than the first |
| **Composition** | chaining (`a; b`, `a && b`), nesting, command substitution, piping into an interpreter |
| **The unparseable case** | input the checker cannot read at all — malformed quoting, a truncated token, an empty string, a very long token |
| **Flag forms** | the long **and** short form of every flag the code names by hand (`-o` and `--output`) |

**3. Execute them.** Write a short script in a temporary directory that imports the entry point and
calls it on each candidate, and **run it**. Do not reason abstractly about what the code would return —
reasoning about it is precisely what the checklist already does, and what it gets wrong.

**4. Report only what reproduced.** A candidate you did not run is not a finding. A candidate that ran
and returned its expected verdict is not a finding either. Report only candidates whose `actual` differs
from `expected`, each with the input attached verbatim so a reader can re-run it.

**5. Probe the other direction too.** Include a set of **legitimate inputs that must still be accepted**,
and assert that they are. A fix that closes a hole by refusing everything is also a defect, and without
this direction an over-strict boundary looks identical to a correct one.

**Zero executed candidates on a boundary deliverable is a finding, not a pass.** If Step 1b fired and no
candidate was executed, emit a check with `status: FAIL` named `probe mode executed no candidates`. A
step that reports success without having run anything is the exact defect this step exists to catch, and
it must not be able to hide inside its own output.

---

## Output

Return **YAML only** — no prose:

```yaml
security_review:
  story_type: "api | ui | data | auth | infrastructure | task"
  checks:
    - check: "check name"
      status: PASS | FAIL | NOT_APPLICABLE
      citation: "path/to/file.ts:NN"   # null if not found
      note: "optional, required if NOT_APPLICABLE"
  general:
    - check: "security TODOs/FIXMEs"
      status: PASS | FAIL
      citation: null   # or "file:line if found"
      note: "optional"
    - check: "dependency risk"
      status: PASS | FAIL | NOT_APPLICABLE
      citation: null
      note: "optional"
  probes: # optional. [] when Step 1b did not fire; see the probe rule below when it did
    - input: "gh pr comment --body x" # the candidate, verbatim and re-runnable
      expected: "denied"
      actual: "runnable"
      reproduced: true # false ⇒ omit the entry entirely; unreproduced is not a finding
  overall: PASS | FAIL | NOT_APPLICABLE
  summary: "one-line summary of security review results"
```

**Citation rule**: `status: PASS` requires a non-null citation. Null → `FAIL`. `NOT_APPLICABLE` must include `note` explaining why.

**Probe rule**: only entries with `reproduced: true` may appear in `probes` — an unreproduced suspicion
is not a finding and must not be reported. If Step 1b identified a boundary and **no candidate was
executed**, `checks` must carry the `probe mode executed no candidates` FAIL from Step 4. An empty
`probes` on a boundary deliverable is never a pass.
