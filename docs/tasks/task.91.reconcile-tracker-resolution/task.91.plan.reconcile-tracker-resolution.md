# Implementation Plan: Reconcile install-time and run-time tracker resolution

**Task**: [task.91.reconcile-tracker-resolution.md](./task.91.reconcile-tracker-resolution.md)

---

## The shape of the problem, in one table

Run this first. It is the whole task in one command, and it is how both of task 83's resolver defects
were found — by **executing** both resolvers over a table of config shapes rather than reading either.

```bash
cd <repo>
run() { d=$(mktemp -d); printf "$1" > "$d/skills-config.yaml"; [ -n "$3" ] && printf '%s\n' "$3" > "$d/.env"
  rt=$( cd "$d"; bash -c 'source '"$PWD"'/shared/resources/resolve-platform.sh >/dev/null 2>&1; printf "%s" "${TRACKER:-<refused>}"' )
  it=$( cd "$d"; SETUP_CONSUMER_NO_MAIN=1 bash -c 'source '"$PWD"'/scripts/setup-consumer.sh; printf "%s" "$(_resolve_install_tracker)"' )
  printf '%-30s runtime=%-10s install=%-10s %s\n' "$2" "$rt" "$it" "$([ "$rt" = "$it" ] && echo OK || echo '*** DIVERGES ***')"; }

run 'tracker: jira\n'      'tracker: jira'          ''
run 'tracker: "jira"\n'    'tracker: "jira"'        ''
run 'tracker: jira\r\n'    'CRLF'                   ''
run 'tracker: auto\n'      'tracker: auto'          ''
run '# none\n'             'no key, JIRA_URL in .env' 'JIRA_URL=https://x.atlassian.net'
run 'tracker: bitbucket\n' 'invalid scalar'         ''
run 'tracker:\tjira\n'     'tab separator'          ''
```

At the time of writing, rows 1–4 agree (task 83 fixed the first three) and rows **5, 6 and 7 diverge**.
Those three rows are the acceptance criteria. When all seven read `OK`, Phase 2 and 3 are done.

---

## Phase 1 — Decide the approach

The task document lays out Options A, B and C with the reasoning. Phase 1 is not a re-litigation of
that; it is the one empirical question that decides between A and B.

**Can `setup-consumer.sh` reach a copy of `resolve-platform.sh` at each call site?**

```bash
# Site 1 — real install. The tarball is extracted to $_tmpdir before the resolver runs.
#          Every skill that references the resolver carries a bundled copy.
ls "$_tmpdir"/skills/*/references/resolve-platform.sh 2>/dev/null | head -1

# Site 2 — --update over an existing install.
ls .agents/skills/*/references/resolve-platform.sh 2>/dev/null | head -1

# Site 3 — --dry-run. Returns before the download. Expect NOTHING here.
```

Answer it by **running the wizard**, not by reading it. Then:

- **Sites 1 and 2 reachable, site 3 not** — the expected outcome. Go to Option A with an explicit
  decision about `--dry-run`: either it reports "tracker not resolved without the release archive"
  (honest, and consistent with that branch already declining to report per-skill counts for the same
  reason), or it keeps the local implementation as a dry-run-only fallback. **Prefer the former.** A
  dry run that guesses differently from the real run is the exact bug class this task is closing.
- **None reachable** — Option A is not viable. Go to Option B and accept its blast radius, with the
  config key still winning and the CHANGELOG naming the affected shape.

Record the answer and the decision in the task document's §3 before writing code.

---

## Phase 2 — Unify or synchronise

### If Option A

```bash
# Locate a bundled resolver; empty when none is reachable.
_locate_resolver() {
  local c
  for c in "${_tmpdir:-}"/skills/*/references/resolve-platform.sh \
           .agents/skills/*/references/resolve-platform.sh; do
    [ -r "$c" ] && { printf '%s' "$c"; return 0; }
  done
  return 1
}
```

Then call it in a **subshell**, which is what makes this safe — the subshell contains the `exit 1`
that was the stated reason for not sourcing it directly:

```bash
_t=$(bash -c "source '$_resolver' >/dev/null 2>&1 && printf '%s' \"\${TRACKER:-}\"" 2>/dev/null || true)
```

Two things to get right:

- **A refusal must not read as a value.** If the resolver returns non-zero, `$_t` is empty and the
  caller must treat that as "refused", not as "fall through to the default". Capture the status
  explicitly rather than inferring it from an empty string — that conflation is precisely what
  `runtimeTracker()` in the test file was changed to avoid.
- **`$TRACKER` from the wizard still has to win at rung 2.** The subshell does not see it, so the
  ordering logic stays in `_resolve_install_tracker`; only the *config reading* is delegated.

### If Option B

Add a `.env` probe to `resolve-platform.sh`'s identity fallback, **after** the process environment:

```sh
[ "$TRACKER" = "auto" ] && TRACKER=$(
  if [ -n "${JIRA_URL:-}" ]; then echo jira
  elif [ -f .env ] && grep -qE '^JIRA_URL=.+' .env 2>/dev/null; then echo jira
  else echo github; fi )
```

Then `npm run bundle` — every skill carries a copy, and a change here that is not bundled is a change
that ships to nobody. `evals/shared/tests/` has a bundle-drift guard; trust it to catch you, but do not
rely on it to remember for you.

---

## Phase 3 — Malformed input

Decide **halt vs skip-filtering** and state the reason in the code comment.

- **Halt** is consistent with the runtime and with `configuration.md:148`, which already promises that
  an unrecognised `tracker:` halts the run.
- **Skip filtering** is more forgiving for a tool whose worst outcome is "you get extra skills", and it
  keeps a broken config from blocking an install that would otherwise work.

Either is defensible; an *unstated* choice is not. Whichever is chosen, the error must name the file,
the offending value, and the legal set — the runtime's message is the model:

```
❌ skills-config.yaml: tracker: "bitbucket" is not a recognised value.
```

The tab case needs no separate handling if the value is read through the same path as the runtime
(Option A) — it falls out. Under Option B it needs the installer's `awk` to stop accepting a tab as a
separator, which means matching what a YAML reader does rather than what looks reasonable.

---

## Phase 4 — Tests

Extend the `PARITY_CASES` table in
`shared/resources/tests/setup-consumer-skill-exclusion.test.mjs` (§4b). The table already asserts the
two resolvers **agree** and separately what they agree on; add the three diverging rows to it rather
than writing new bespoke tests.

**The `.env` case needs a fixture directory, not just a config**, so it does not fit `PARITY_CASES` as
shaped — give it its own test using the same `runtimeTracker` / `resolveTracker` pair.

**Delete or invert `the .env probe is a DELIBERATE asymmetry, not an oversight`.** It pins the
divergence this task removes. Its failure message already says "if you changed that, update the
installer and this test together" — this task is that change. Replace it with a test asserting the two
now agree, and keep a comment recording that the asymmetry was deliberate until task 91 closed it, so
the history is not lost.

**Add any new environment variable to `hermeticEnv()`.** That helper exists because an ambient
`SKILLS_CONFIG_FILE` silently redirected every parity case away from its fixture — a defect found in
task 83's own fix, by its own refute pass.

### Mutation proofs required

| Change | Mutation | Expected |
|---|---|---|
| `.env` reconciliation | revert it | the `.env` parity case goes red |
| Malformed-scalar grading | revert it | the invalid-scalar parity case goes red |
| Tab handling | revert it | the tab parity case goes red |

A change that cannot be mutation-proved is a change with no test holding it.

---

## Definition of done for this plan

All seven rows of the table at the top read `OK`, each of the three newly-fixed rows is
mutation-proven, `npm run ci` is green, and `shellcheck` shows no new warnings against the
`origin/develop` baseline of 1.
