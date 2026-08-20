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
task fails is by shipping a subset narrower than what consumers actually write. The corpus that
proves that is `docs/reference/configuration.md`'s canonical example config — **not** this repo's
twelve-line `skills-config.yaml`, which exercises none of the shapes a consumer writes.

It also closes one escalation that is not tier 2's: a mapping-valued `access.tracker` reads as absent
under `pyyaml` too, so `read_nested_config_key_strict` needs the same distinction on tier 1 (Phase 2).

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

### The rule the tables encode

Judge every construct by one question: **can this change what one of the six keys resolves to,
relative to what its own line says?**

- The **aliasing family** can — an anchor, an alias, a merge key, a quoted or explicit key, a flow
  mapping spanning lines, an explicit tag, a BOM, a document separator. These are **refused**.
- Everything else cannot. A key three levels down is still read from its own line; a sequence item
  is not a key at all. These are **accepted or ignorable** — never refused.

Do not define the subset by shape. A shape-based draft of this table refused "nesting deeper than two
levels", which refuses `docs/reference/configuration.md`'s own canonical example config
(`jira.statusMap.*`, `sign-off.story.required`, `branching.epicIntegration.*` at three levels,
`developBatch.resources[].probe.command` at four, `[Waiting for Review, In Review]` as a flow
sequence, `identities:` → `- jira:` / `  git:` as a sequence of mappings). That is R-1 arriving before
a line of code — and this repo's twelve-line `skills-config.yaml` would never have revealed it.

### Proposed subset — starting point, to be validated not assumed

**Accepted (or ignorable):**

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
| Nesting at **any** depth | `jira:` → `statusMap:` → `ready-for-development: …` |
| Flow sequence value | `ready-for-review: [Waiting for Review, In Review]` |
| Sequence of mappings | `identities:` → `- jira: …` / `  git: …` |
| Empty flow sequence | `worktreeSeedPaths: []` |

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
| Explicit tag | `access: !!map` |
| UTF-8 BOM before the first key | |
| Document separator | `---` / `...` |

### Validation — do this before writing the doc, not after

Three corpora, **in this order**. Any of these falling OUTSIDE the subset means the SUBSET is wrong.

```bash
# 1. THE ONE THAT MATTERS MOST — the config a real consumer writes, per the published schema.
#    A shape-based subset refuses this outright; that is how R-1 was caught at review time.
sed -n '40,125p' docs/reference/configuration.md

# 2. This repo's own config. Small — it proves almost nothing on its own.
cat skills-config.yaml

# 3. Every fixture the existing suite writes.
grep -oE "fixture [a-z0-9-]+ '[^']*'" shared/resources/tracker-access.test.sh | head -60
```

Two constructs need a deliberate call, and both should be written down as decisions rather than
resolved by accident:

- **Block scalars.** `read-config.sh` already tracks them (`config_file_status`'s awk lint) so their
  free-form bodies are not graded as YAML. Keep that; a body line is *ignorable*, never refused.
- **Sections the reader never consumes** (`jira:`, `github:`, `developNext:`, `sign-off:`). An anchor
  inside `jira:` cannot change what `access.tracker` resolves to — but proving that in a line-oriented
  scanner is exactly the kind of local reasoning that failed six times in task.51. **Keep refusing
  file-wide.** The blast radius stays the file; what changed is *which constructs* trigger it, and
  the aliasing family is narrow enough that a real config rarely contains one.
- **`config_file_status`'s existing awk lint** (`read-config.sh:348`). It already scans the whole file
  on tier 2 and returns a third value the resolver never acts on — `unverified`, not `ok`/`malformed`
  (`resolve-platform.sh:277` branches only on `malformed`). Write down the relationship before adding
  a second lint over the same file. Recommended: keep them independent — `config_file_status` answers
  *is this YAML at all*, the subset scan answers *can I read it correctly* — and say so in both
  header comments. Two overlapping awk lints with an unstated relationship will drift, the way
  `_config_denull` drifted across two call sites in task.51.

### Doc changes

- `platform-detection.md`: replace the *Known limit* section with **Tier 2 — the strict subset**,
  carrying both tables and the two migration paths verbatim.
- `configuration.md`: leave the `access.tracker` warning **in place** until Phase 6.

---

## Phase 2 — Give tier 2 a third answer

**Files:** `shared/resources/read-config.sh`

### The shape

Add one scanner that classifies the whole file. **Run it once at source time and have consumers read
the global** — do not call it lazily, and never through a command substitution:

```sh
# _config_subset_scan — sets _CONFIG_SUBSET_VERDICT to "-" when the file is entirely within the
# documented subset, or "<line>:<construct>" for the FIRST construct outside it.
#
# One awk pass, run ONCE at source time from the bottom of this file — exactly like _config_probe,
# and for exactly its reason: every reader here runs inside a command substitution, so a scan
# memoised on first use caches into a subshell that exits immediately. The cache would never reach
# the parent and the scan would re-run on every call. That is the mistake that made one `source`
# cost ten python spawns, and §9's performance criterion ("one awk pass per source") forbids it.
#
# Sets a global and echoes nothing, for the same reason.
_CONFIG_SUBSET_VERDICT=""      # "-" = clean, else "<line>:<construct>"; only meaningful on tier 2
```

> A `[ -n "$(_config_subset_scan)" ]` call site is self-defeating: the `$( )` is the very subshell
> the memo cannot escape. If you find yourself writing one, the scan is in the wrong place.

Each refused construct gets one pattern and one name. Keep the names operator-facing — `an anchor
(&name)` beats `ANCHOR_TOKEN`.

### Wiring into the readers

`read_config_key`, `read_nested_config_key` and `read_nested_config_key_strict` each gain the same
guard at the top of their **tier-2 branch only** (tier 1's parsing stays authoritative and untouched):

```sh
  # Tier 2 only. An aliasing construct may change what a later line means, so the verdict is
  # file-wide rather than per-key. Returning "absent" here is what silently granted `full` — the
  # whole defect this task exists to close. Read the global; do NOT re-scan.
  [ "$_CONFIG_SUBSET_VERDICT" != "-" ] && { echo "__UNSUPPORTED__"; return 0; }
```

These guards are defence in depth. **The refusal an operator actually sees comes from Phase 3's
hoisted check in `resolve-platform.sh`**, which reads `_CONFIG_SUBSET_VERDICT` directly — see below
for why routing it through a reader's stdout is both unreachable and forgeable.

`read_nested_config_key` (the non-strict one) must **not** propagate `__UNSUPPORTED__` to its
callers — `resolve-paths.sh` never fails by contract. It maps the sentinel to `""` exactly as it
already maps `__UNREADABLE__`, and the caller falls back to its default. Only
`read_nested_config_key_strict` and `read_config_key` surface it.

> The precedent is already in the file: `read_nested_config_key_strict` exists solely because
> `__UNREADABLE__` leaked into `resolve-paths.sh` and produced `PRD_ROOT=__UNREADABLE__`, which
> reached `mkdir -p "__UNREADABLE__"`. Follow that split; do not invent a second mechanism.

### The tier-1 half — a mapping-valued `access.*`

Tier 2 is not the only tier that reads a nesting typo as absent. `_scalar()` returns
`("s", "__MAP__")` for a dict, and `read_nested_config_key_strict` maps `__MAP__` to `""`:

```sh
    case "$raw" in
      __NONE__ | __MAP__) echo ""; return 0 ;;     # <-- __MAP__ is NOT absent
```

So `access:` → `tracker:` → `mode: manual` resolves to `full` at rc=0 under `pyyaml`. Reproduce it
before changing anything — `tracker-access.test.sh` §41's `knownlimit-child` fixture already asserts
it for `for tier in python awk`:

```bash
printf 'access:\n  tracker:\n    mode: manual\n' > /tmp/t/skills-config.yaml
(cd /tmp/t && AGENT_SKILLS_CONFIG_TIER=python bash -c 'source .../resolve-platform.sh; echo $ACCESS_TRACKER')
# today: full     — wanted: a refusal
```

Split the case in the **strict** reader only: `__NONE__` stays absent, `__MAP__` becomes a distinct
refusal ("`access.tracker` is a mapping; expected one of the five modes"). `read_nested_config_key`
keeps collapsing both, so `resolve-paths.sh` is untouched — the same split, for the same reason, as
`__UNREADABLE__`.

### Test as you go

```bash
printf 'defaults: &d\n  tracker: manual\naccess:\n  <<: *d\n' > /tmp/t/skills-config.yaml
(cd /tmp/t && AGENT_SKILLS_CONFIG_TIER=awk bash -c 'source .../read-config.sh; read_nested_config_key_strict access tracker')
# expect: __UNSUPPORTED__     (today: empty → resolves full)
```

And the corpus that matters most — it must stay clean, on both tiers:

```bash
sed -n '40,125p' docs/reference/configuration.md > /tmp/t/skills-config.yaml   # strip the fence first
(cd /tmp/t && AGENT_SKILLS_CONFIG_TIER=awk bash -c 'source .../resolve-platform.sh; echo rc=$? AT=$ACCESS_TRACKER')
# expect: rc=0 AT=full   — a REFUSAL here means the subset is wrong, not the config
```

---

## Phase 3 — Propagate the refusal

**Files:** `shared/resources/resolve-platform.sh`

### Where the refusal fires — read this before touching `resolve_access`

`resolve_access` is the wrong site, even though it is where the `__UNREADABLE__` precedent lives.
`resolve-platform.sh` runs its blocks in this order:

| Order | Block | Line | Reader |
| --- | --- | --- | --- |
| 1 | `config_bulk` | 187 | tier 1 only — skipped entirely on tier 2 |
| 2 | malformed / fail-closed branch | 277 | `config_file_status` |
| 3 | **Identity — `TRACKER`, `VCS`** | **305, 318** | **`read_config_key`** |
| 4 | `access:` shape check | 336 | `config_child_shape` |
| 5 | `resolve_access tracker` / `vcs` | 342–343 | `read_nested_config_key_strict` |

On tier 2 with an out-of-subset file, step 3 fires first. `read_config_key` returns
`__UNSUPPORTED__`, `validate_enum` rejects it, and the run halts at line 307 with:

```
❌ skills-config.yaml: tracker: "__UNSUPPORTED__" is not a recognised value.
   Legal values for tracker: jira github auto
```

No line. No construct. Neither migration path. And the message below — which BC-1 designates as *the
entire migration path* — never prints. A suite asserting `rc=1` would call that a pass.

**Hoist one check above the identity block**, between steps 2 and 3:

```sh
# One site, one message, all five consumed keys. Reads the scan's verdict global DIRECTLY — never a
# reader's stdout. Tier 2's plain-stdout channel has no kind byte, so a config value spelling
# `__UNSUPPORTED__` would be indistinguishable from the signal there; that is the `__MAP__` forgery
# class task.51 spent three QA cycles closing, and it has no framing to lean on on this tier.
if [ -n "$_CONFIG_SUBSET_VERDICT" ] && [ "$_CONFIG_SUBSET_VERDICT" != "-" ]; then
  … the message below …
  return 1
fi
```

`resolve_access` already has the shape of the message needed — the `__UNREADABLE__` branch added in
task.51. **Move it, do not generalise it in place**, and delete the old branch rather than running
both:

```sh
  if [ "$cfg" = "__UNREADABLE__" ]; then
    printf '❌ %s: access is written as a multi-line flow mapping, which this host cannot read.\n' ...
```

`__UNREADABLE__` was one construct handled narrowly; `__UNSUPPORTED__` is the class it belongs to.

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
  reasoning alone; task.51 cycle 7 found two defects in exactly this area. Note it is driven by
  `config_file_status`, which on tier 2 returns `unverified` rather than `malformed`, so this branch
  does not currently fire from the awk path at all.
- The **`access:` opt-in probe** (`_rp_access_may_be_declared`) — same caution.
- **`config_child_shape`'s awk fallback** — currently grades `access: &acc` as a scalar and halts with
  the wrong reason. It sits at step 4, *below* the hoisted check, so the new refusal pre-empts it;
  keep it for the tier-1 path and prove that with a test.
- **`resolve_access` runs twice** (tracker, then vcs). Another reason the check belongs above them
  both rather than inside: hoisting it also removes a duplicated evaluation.

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

### First, invert §30 — the one existing assertion that conflicts

```bash
sed -n '700,703p' shared/resources/tracker-access.test.sh
```

```sh
D=$(fixture merge-override 'defaults: &d\n  tracker: read-only\n  vcs: full\naccess:\n  <<: *d\n  tracker: manual\n')
for tier in python awk; do
  run_case "$D" "AGENT_SKILLS_CONFIG_TIER=$tier"
  assert_rc "<<: override [$tier] → status 0"        "$RC" "0"
done
```

That fixture carries an anchor **and** a merge key and asserts `rc=0` on the **awk** tier. Under this
task the awk arm must assert `rc=1` with the refusal on stderr. Split the loop; keep the python arm
as it is. This is a deliverable, not a regression.

It is the **only** conflict in the suite — verified by cross-scanning every `fixture` line carrying
`&`, `*`, `<<`, `"access"` or `---` against its tier argument. §25, §31 and §37's merge/anchor
fixtures are all forced to `AGENT_SKILLS_CONFIG_TIER=python`; §26's multi-line-flow fixture asserts
only that no sentinel reaches `PRD_ROOT`/`ARCH_ROOT`, which still holds once `read_nested_config_key`
maps `__UNSUPPORTED__` to `""`.

### Then migrate §41 — do not simply delete it

```bash
grep -n "41. KNOWN LIMIT" shared/resources/tracker-access.test.sh   # ~1024
```

The block holds four fixtures, and they are not all the same kind:

| Fixture | Today | Becomes |
| --- | --- | --- |
| `<<: *d` merge, `<<: {…}` merge, `"access":` quoted key | awk → `full`, python → `manual` | three refusal-matrix cases (awk refuses; python still reads `manual`) |
| `knownlimit-child` (`access:` → `tracker:` → `mode:`) | `full` on **both** tiers | a refusal on **both** tiers, per the tier-1 fix in Phase 2 |

Carry all four across **first**, then remove the block (~1024–1055). Its own comment says a failure
there means the limit has been fixed — **do not repair its assertions back to the escalating values**,
and do not drop the coverage on the way out either.

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
| Move the hoisted refusal back below the identity block | go red (only the stderr assertions catch this; an rc-only suite would not) |
| Make the subset scan lazy again | go red (source-time spawn count rises) |
| Collapse tier 1's `__MAP__` for `access.*` back to absent | go red |
| Have the hoisted check read a reader's stdout instead of the verdict global | go red (the `tracker: __UNSUPPORTED__` forgery fixture) |

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
- **`_config_probe` memoisation** — the reason it sets a global instead of echoing, and the reason it
  runs once at the bottom of the file rather than on first use: readers run inside command
  substitutions, so a cache written in a subshell never reaches the parent. The subset scan has the
  same constraint and therefore the same lifecycle. A `$(_config_subset_scan)` call site defeats it.
- **Execution order in `resolve-platform.sh`** — identity (`read_config_key`, ~line 305) runs *before*
  access (`resolve_access`, ~line 342). A refusal raised only in the access path is unreachable; it
  belongs above both. Read the order before deciding where any new halt goes.
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
| awk variants | macOS BWK awk, `gawk`, `mawk` — installed in `.github/workflows/test.yml`; skip with a printed notice when absent locally. Divergences are in scope |
| Mutation | Every invariant reverted in isolation, failure count recorded |
| Regression | `npm test`, `npm run validate:all`, bundle idempotent |
