---
id: task.60.plan
title: 'Implementation Plan: Give the config reader''s awk tier a grammar, or make it refuse'
type: plan
task-ref: task.60.config-reader-strict-subset.md
---

# Implementation Plan: Give the config reader's awk tier a grammar, or make it refuse

> Requirements and success criteria: [task.60.config-reader-strict-subset.md](task.60.config-reader-strict-subset.md)

## Overview

Tier 2 of `read-config.sh` currently has two possible answers — *value* and *absent* — and everything
it cannot parse falls into *absent*, which is the permissive one. This plan gives it a third answer,
`__UNSUPPORTED__`, and a documented subset that decides which of the three applies. The specification
is written and validated against real configs **before** any code changes, because the one way this
task fails is by shipping a subset narrower than what consumers actually write.

**Read this first**: [`shared/resources/read-config.sh`](../../../shared/resources/read-config.sh) —
particularly its header comment, which explains why tier 1 is authoritative when it runs, why the
probe is memoised, and why the bulk transport is typed. Those three decisions are load-bearing and
this plan does not change any of them.

---

## Phase 1 — Define and document the subset

**Files:** `shared/resources/platform-detection.md`, `docs/reference/configuration.md`

No code in this phase. The output is a table, and the table is the specification everything else is
tested against.

### The surface being specified

Only six values are ever read. Confirm this before writing anything — if the list has grown, the
subset must grow with it:

```bash
grep -rhoE 'read_(nested_)?config_key(_strict)? [a-z]+ ?[a-zA-Z]*' shared/resources/*.sh \
  | grep -vE 'and|exactly|first' | sort -u
```

Expected today:

| Reader | Key |
| --- | --- |
| `read_config_key` | `tracker` |
| `read_config_key` | `vcs` |
| `read_nested_config_key` | `prd.prdShardedLocation` |
| `read_nested_config_key` | `architecture.architectureShardedLocation` |
| `read_nested_config_key_strict` | `access.tracker` |
| `read_nested_config_key_strict` | `access.vcs` |

### Proposed subset — starting point, to be validated not assumed

**Accepted:**

| Construct | Example |
| --- | --- |
| Comment line | `# anything` |
| Blank line | |
| Top-level scalar | `tracker: github` |
| Top-level block mapping key | `access:` |
| One indented scalar child | `  tracker: manual` |
| Quoted scalar value | `tracker: "github"` |
| Trailing inline comment | `tracker: github  # why` |
| Single-line flow mapping value | `tracker: {workflowFile: x.yaml}` |
| Block sequence item (scalar) | `  - docs/architecture/concepts/tech-stack.md` |
| Block scalar header + body | `note: \|` then indented free text |

**Refused** (legal YAML, outside the subset):

| Construct | Example |
| --- | --- |
| Anchor | `defaults: &d` |
| Alias | `access: *d` |
| Merge key | `<<: *d` |
| Quoted mapping key | `"access":` |
| Space before the colon | `access :` |
| Explicit key form | `? access` / `: value` |
| Flow mapping spanning lines | `access: {` … `}` |
| Nesting deeper than two levels | `access:` → `tracker:` → `mode: manual` |
| Explicit tag | `access: !!map` |
| UTF-8 BOM before the first key | |
| Document separator | `---` / `...` |

### Validation — do this before writing the doc, not after

```bash
# Every fixture the existing suite writes, plus the repo's own config.
# Any of these falling OUTSIDE the subset means the SUBSET is wrong.
grep -oE "fixture [a-z0-9-]+ '[^']*'" shared/resources/tracker-access.test.sh | head -60
cat skills-config.yaml
```

Two constructs need a deliberate call, and both should be written down as decisions rather than
resolved by accident:

- **Block scalars.** `read-config.sh` already tracks them (`config_file_status`'s awk lint) so their
  free-form bodies are not graded as YAML. Keep that; a body line is *ignorable*, never refused.
- **Sections the reader never consumes** (`jira:`, `github:`, `developNext:`, `sign-off:`). An anchor
  inside `jira:` cannot change what `access.tracker` resolves to — but proving that in a line-oriented
  scanner is exactly the kind of local reasoning that failed six times in task.51. **Default to
  refusing file-wide**, and only narrow it if Phase 1's validation shows a real config needs it.

### Doc changes

- `platform-detection.md`: replace the *Known limit* section with **Tier 2 — the strict subset**,
  carrying both tables and the two migration paths verbatim.
- `configuration.md`: leave the `access.tracker` warning **in place** until Phase 6.

---

## Phase 2 — Give tier 2 a third answer

**Files:** `shared/resources/read-config.sh`

### The shape

Add one scanner that classifies the whole file, and have the three tier-2 readers consult it before
their own extraction:

```sh
# _config_subset_scan — echo "" when the file is entirely within the documented subset,
# or "<line>:<construct>" for the FIRST construct outside it.
#
# One awk pass, memoised per source like _config_probe — the readers run inside command
# substitutions, so a scan that returned its answer on stdout without caching would re-run
# on every call. That is the mistake that made one `source` cost ten python spawns.
_CONFIG_SUBSET_VERDICT=""      # "" = not yet scanned, "-" = clean, else "<line>:<construct>"
```

Each refused construct gets one pattern and one name. Keep the names operator-facing — `an anchor
(&name)` beats `ANCHOR_TOKEN`.

### Wiring into the readers

`read_config_key`, `read_nested_config_key` and `read_nested_config_key_strict` each gain the same
guard at the top of their **tier-2 branch only** (tier 1 stays authoritative and untouched):

```sh
  # Tier 2 only. A construct this tier cannot read may change what a later line means, so the
  # verdict is file-wide rather than per-key. Returning "absent" here is what silently granted
  # `full` — the whole defect this task exists to close.
  [ -n "$(_config_subset_scan)" ] && { echo "__UNSUPPORTED__"; return 0; }
```

`read_nested_config_key` (the non-strict one) must **not** propagate `__UNSUPPORTED__` to its
callers — `resolve-paths.sh` never fails by contract. It maps the sentinel to `""` exactly as it
already maps `__UNREADABLE__`, and the caller falls back to its default. Only
`read_nested_config_key_strict` and `read_config_key` surface it.

> The precedent is already in the file: `read_nested_config_key_strict` exists solely because
> `__UNREADABLE__` leaked into `resolve-paths.sh` and produced `PRD_ROOT=__UNREADABLE__`, which
> reached `mkdir -p "__UNREADABLE__"`. Follow that split; do not invent a second mechanism.

### Test as you go

```bash
printf 'defaults: &d\n  tracker: manual\naccess:\n  <<: *d\n' > /tmp/t/skills-config.yaml
(cd /tmp/t && AGENT_SKILLS_CONFIG_TIER=awk bash -c 'source .../read-config.sh; read_nested_config_key_strict access tracker')
# expect: __UNSUPPORTED__     (today: empty → resolves full)
```

---

## Phase 3 — Propagate the refusal

**Files:** `shared/resources/resolve-platform.sh`

`resolve_access` already has the exact shape needed — the `__UNREADABLE__` branch added in task.51:

```sh
  if [ "$cfg" = "__UNREADABLE__" ]; then
    printf '❌ %s: access is written as a multi-line flow mapping, which this host cannot read.\n' ...
```

Generalise it. `__UNREADABLE__` was one construct handled narrowly; `__UNSUPPORTED__` is the class it
belongs to. Fold the old branch in rather than running both.

**The message is a deliverable, not a detail.** It is the entire migration path for BC-1, so it must
name the line, the construct, and both fixes:

```
❌ skills-config.yaml:4: this file uses a merge key (`<<`), which the no-dependency
   config reader cannot parse.

   This host has no python3 + pyyaml, so the reader is running in its limited mode.
   Rather than guess — and risk resolving a declared access restriction to `full` —
   it is refusing. Two ways forward:

     1. Rewrite the file in the documented subset:
        shared/resources/platform-detection.md → "Tier 2 — the strict subset"
     2. Install pyyaml (`pip install pyyaml`); the full-YAML tier accepts this file as written.
```

Also re-check, with a test for each:

- The **fail-closed branch** — with tier 2 refusing outright, its job may shrink. Do not delete it on
  reasoning alone; task.51 cycle 7 found two defects in exactly this area.
- The **`access:` opt-in probe** (`_rp_access_may_be_declared`) — same caution.
- **`config_child_shape`'s awk fallback** — currently grades `access: &acc` as a scalar and halts with
  the wrong reason. Under the new scan it should refuse with the right one.

---

## Phase 4 — Carry the parse-failure reason

**Files:** `shared/resources/read-config.sh`

The bulk transport already carries typed records:

```
<index> US <kind> US <payload> RS       kind: v = value from config, s = signal
```

Extend the **signal** payload only: `__ERR__:<line>:<message>`. Values are untouched.

**Do not weaken the transport hardening to do this.** The reason is DATA and travels the same path:

```python
if any(c in payload for c in ("\x1f", "\x1e", "\x00")):
    kind, payload = "s", "__ERR__"      # a reason that cannot be framed is dropped, not injected
```

A `yaml.YAMLError` carries `problem_mark.line` and `problem` — use them, and sanitise before framing.
Then retire the enumerated-shapes workaround added in task.51 cycle 7 (the "duplicate key / two `<<`
sources / NUL byte" bullet list in the malformed halt), because the message can now name the actual
cause.

**Revertable alone.** If this overruns, drop it and keep the workaround; Phases 1–3 and 5 stand
without it.

---

## Phase 5 — Make the suite hold it

**Files:** `shared/resources/tracker-access.test.sh`

### Delete §41

```bash
grep -n "41. KNOWN LIMIT" shared/resources/tracker-access.test.sh   # ~1024
```

Remove the whole block (~1024–1055). Its own comment says a failure there means the limit has been
fixed — **do not repair its assertions back to the escalating values.**

### Two new matrices

```sh
# --- 41. Tier 2 accepts the documented subset, identically to tier 1 -----------------
for shape in "${IN_SUBSET[@]}"; do
  D=$(fixture "subset-$RANDOM" "$shape")
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"; PY_AT="$AT"
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=awk"
  assert_eq "in-subset shape resolves identically on both tiers" "$AT" "$PY_AT"
done

# --- 42. Tier 2 REFUSES everything outside it ----------------------------------------
for shape in "${OUT_OF_SUBSET[@]}"; do
  D=$(fixture "outside-$RANDOM" "$shape")
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=awk"
  assert_rc "out-of-subset shape → refused [awk]" "$RC" "1"
  if [ "$AT" = "full" ]; then bad "…must not grant full" "AT=full"; else ok "…does not grant full"; fi
  assert_stderr_has "…and names the line" ":"
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=python"
  assert_rc "…while tier 1 still accepts it" "$RC" "0"
done
```

**Assert the resolved VALUE, never the exit code alone.** Every escalating config in task.51 returned
0; a suite asserting `rc=0` passed while the escalation was live.

### The awk-only host

Forcing the tier tests the branch. It does not test what a consumer runs:

```bash
SHIM=$(mktemp -d)
printf '#!/bin/sh\nexit 127\n' > "$SHIM/python3"; cp "$SHIM/python3" "$SHIM/python"
chmod +x "$SHIM"/python*
(cd "$FIXTURE" && env PATH="$SHIM:/usr/bin:/bin" HOME="$HOME" bash -c "source $RESOLVER; echo rc=\$? AT=\$ACCESS_TRACKER")
```

Run it under `zsh` too — macOS logins are zsh, and task.51 cycle 1 shipped a bash-only `${!var}` that
broke every call site on the shell consumers actually use.

### Mutation audit

For each invariant: revert it in isolation, run the full suite, record the failure count.

| Mutation | Must |
| --- | --- |
| Delete the `__UNSUPPORTED__` branch in a tier-2 reader | go red |
| Narrow one refused-construct regex to match nothing | go red |
| Widen the subset to accept a refused construct | go red |
| Remove an `AGENT_SKILLS_CONFIG_TIER` force-guard | go red |
| Change `read_nested_config_key` to propagate `__UNSUPPORTED__` | go red (`resolve-paths.sh` must never fail) |

**A count is not a result — a witness is.** Gate 6 of task.51 found 11 of 35 mutations surviving
behind a green 166/166 suite. Record the failure count for each mutation in the QA report.

---

## Phase 6 — Retire the documentation of the limit

**Files:** `platform-detection.md`, `configuration.md`, task.51's doc

Only after Phase 5 is green.

- `platform-detection.md` — remove *Known limit — the awk tier reads only the canonical spelling of
  `access:`*; the subset spec from Phase 1 replaces it
- `configuration.md` — remove the canonical-block-form warning from the `access.tracker` row
- task.51 — mark LIMIT-1 and LIMIT-2 closed under *Known limits*, linking here
- `npm run bundle`, commit the regenerated `skills/*/references/` trees

```bash
npm run bundle && git status --short | wc -l   # then re-run: must be identical (idempotent)
```

---

## Key Patterns and References

- **`__UNREADABLE__` / `read_nested_config_key_strict`** — the existing precedent for a sentinel that
  only opt-in callers see. Follow it; do not invent a parallel mechanism.
- **`_config_probe` memoisation** — the reason it sets a global instead of echoing: readers run inside
  command substitutions, so a cache written in a subshell never reaches the parent. The subset scan
  has the same constraint.
- **Typed US/RS bulk records** — three QA cycles of task.51 went into making this transport
  unforgeable. Extend the payload; do not change the framing.
- **Tier 1 is authoritative when it runs** — letting an "absent" answer from tier 1 fall through to
  awk is what made `tracker: null` halt. Keep tier 2 unconsulted whenever tier 1 answers.

## Testing Approach

| What | How |
| --- | --- |
| Subset acceptance | Both tiers resolve the same value for every in-subset shape |
| Subset refusal | Tier 2 halts naming the line; tier 1 still accepts |
| Never-fail contract | `resolve-paths.sh` returns defaults on a refused config |
| End-to-end halt | A real guarded caller exits 1 — not just the resolver's return code |
| Cross-shell | `bash` and `zsh` |
| Real host | `python3`/`python` shimmed to exit 127 |
| awk variants | macOS BWK awk, `gawk`, `mawk` |
| Mutation | Every invariant reverted in isolation, failure count recorded |
| Regression | `npm test`, `npm run validate:all`, bundle idempotent |
