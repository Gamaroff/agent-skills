# Implementation Plan: shellcheck CI lane

**Task**: [task.92.shellcheck-ci-lane.md](./task.92.shellcheck-ci-lane.md)

---

## Step 0 — Re-measure

The numbers in the task document are a snapshot from 2026-09-04. Re-take them first; both the tree and
shellcheck will have moved.

```bash
cd <repo>
git ls-files '*.sh' | grep -v 'skills/.*/references/' > /tmp/sh-sources.txt
wc -l < /tmp/sh-sources.txt          # expect ~56, NOT ~247

SC="docker run --rm -v $PWD:/mnt -w /mnt koalaman/shellcheck:stable"
for sev in error warning info style; do
  printf '%-8s %3d\n' "$sev" \
    "$($SC --severity=$sev $(tr '\n' ' ' < /tmp/sh-sources.txt) 2>&1 | grep -cE '^In .* line [0-9]+:')"
done
```

If `warning` has grown well beyond 26, re-read §3 of the task before continuing — the "achievable in
an afternoon" claim is what justifies gating there rather than at `error`.

---

## Step 1 — The file list

Derive from `git ls-files`, never a shell glob:

```bash
mapfile -t FILES < <(git ls-files '*.sh' | grep -v '^skills/[^/]*/references/')
```

Two reasons this is not a `**/*.sh` glob:

- **Bundled copies.** `skills/*/references/*.sh` are `npm run bundle` output. Linting them reports
  each shared finding once per bundling skill — 725 findings instead of 81, and a red lane that is
  fixed by editing a file the bundler will overwrite.
- **Untracked scratch.** A glob picks up anything a contributor left in the tree. `git ls-files`
  cannot.

Assert the count in the job so a future glob-widening is caught immediately:

```bash
echo "linting ${#FILES[@]} source scripts"
[ "${#FILES[@]}" -lt 200 ] || { echo "::error::file list includes bundled copies"; exit 1; }
```

---

## Step 2 — Triage the 26 warnings

The families, and the recommended disposition for each. Work through them in this order — the first
one is more than half the total.

### SC2034 "appears unused" — 14 findings

`bitbucket-auth.sh` (`BB_CURL_AUTH`, `BB_AUTH_SCHEME`), `jira-sprint-lib.sh` and the sprint scripts
(`JSM_DEFER_*`, `JSM_DEFERRED*`), plus a few singletons (`VALID_TYPES_RE`, `TASK_ID`, `EPIC`).

These are **output contracts of sourced files** — the variable is set here and read by the caller,
which shellcheck cannot see. Two honest options:

```bash
# Option 1 — export it. This is a real answer to "is it used elsewhere?", not a suppression,
# and it matches the documented contract of a file whose whole job is to set these.
export BB_CURL_AUTH BB_AUTH_SCHEME

# Option 2 — file-level disable where the pattern recurs throughout.
# shellcheck disable=SC2034  # JSM_DEFER_* are this library's output contract, read by its callers
```

Prefer **export** where the variable really is meant to cross a process boundary, and the file-level
disable where it is meant to cross only a `source` boundary (where `export` would be misleading).
Check `bitbucket-auth.sh`'s own header comment — it documents what it sets, and that comment is the
justification text.

### SC1007 `CDPATH=` — 4 findings

`resolve-platform.sh:66`, `jira-sprint-lib.sh:106`, `set-github-project-{priority,estimate}.sh`.

`CDPATH= cd -P -- "$(dirname …)"` is the standard idiom for neutralising a user's `CDPATH` for one
command; shellcheck misreads the empty assignment. Inline disable with that as the reason. Do **not**
"fix" it by removing the prefix — the comment above the line in `resolve-platform.sh` explains exactly
what breaks if you do.

### SC2209 — 3 findings

`ACCESS_TRACKER=command` in `setup-consumer.sh` and friends: assigning the literal access-mode value
`command`, which collides with a builtin name. Inline disable.

> Note this is the same finding task 83 measured as its baseline. Its DoD records the count as 1 for
> `setup-consumer.sh` alone; the other two are elsewhere in the tree.

### SC2211 / SC2006 — 2 warnings (+ style)

`tracker-access.test.sh:1034,1040`. The backticks are **markdown emphasis inside an assertion message
string**:

```bash
assert_rc "malformed + explicit-key `? access` → refused" "$RC" "1"
```

shellcheck parses the prose as command substitution. The cleanest fix is to **change the prose**, not
suppress it — single quotes or no quoting in the message reads the same to a human and removes the
finding:

```bash
assert_rc "malformed + explicit-key '? access' → refused" "$RC" "1"
```

Prefer this to a disable: it is a genuine (if harmless) ambiguity in the source, and this repo's prose
style is backtick-heavy enough that the pattern will recur.

### SC1090 "can't follow non-constant source" — 1

Inherent to a resolver that computes its own path. Either inline-disable, or set
`external-sources=true` in `.shellcheckrc` and give it a `# shellcheck source=` directive. The
directive is better where the path is knowable, because it lets shellcheck actually check the sourced
file's contract.

### SC2010 `ls | grep` — 1 ⚠️

**The one to look at properly.** Everything above is a false positive; this may not be. `ls | grep` is
genuinely fragile on unusual filenames. Read it, decide, and if it is real either fix it (with a test)
or file it separately if the fix is more than trivial.

---

## Step 3 — The workflow job

`validate.yml` is the natural home — it already runs repo-hygiene checks (catalog freshness, bundle
drift) rather than tests.

```yaml
- name: shellcheck
  run: |
    shellcheck --version          # pin or print — a silent version bump is the main red-herring risk
    mapfile -t FILES < <(git ls-files '*.sh' | grep -v '^skills/[^/]*/references/')
    echo "linting ${#FILES[@]} source scripts"
    [ "${#FILES[@]}" -lt 200 ] || { echo "::error::bundled copies in file list"; exit 1; }
    shellcheck --severity=warning "${FILES[@]}"
```

`ubuntu-latest` ships shellcheck, so no install step and no container pull. The tradeoff is that the
version moves with the runner image — hence printing it. If reproducibility matters more than speed,
pin with the container instead and say so in the job comment.

---

## Step 4 — Prove the gate fires

**This is the step that makes the lane real.** A gate nobody has watched fail is not known to be a
gate — `task.90` is this repo's own precedent, where a lock helper reported success for an advance
that never happened.

On a scratch branch:

```bash
cat >> shared/resources/read-config.sh <<'EOF'
_shellcheck_probe() { local unused_var="deliberate SC2034 probe"; }
EOF
git commit -am "TEMP: prove the shellcheck lane fails" && git push
# → confirm CI goes RED on the shellcheck job specifically, not on something else
git reset --hard HEAD~1 && git push -f
```

Record the failing run's URL in the implementation report. That link is the evidence the criterion
asks for.

---

## Step 5 — Documentation

- **CHANGELOG**: name the severity gate and state that new warning-tier findings will now fail CI.
- **Local invocation**, both forms — most contributors will not have the binary:

  ```bash
  shellcheck --severity=warning $(git ls-files '*.sh' | grep -v 'skills/.*/references/')
  # no binary? the container is the reference form task 83 used:
  docker run --rm -v "$PWD:/mnt" -w /mnt koalaman/shellcheck:stable --severity=warning <files>
  ```

- **The sources-only rule, written where the glob lives.** Someone will eventually see `skills/` being
  skipped and "fix" it. The comment must say 725-vs-81 and why.

---

## Definition of done for this plan

The job is green on the tree, has been **observed red** on a deliberate finding with the run linked,
lints 56 files rather than 247, every disable carries a reason, the SC2010 is resolved or justified,
and the local invocation is documented in both forms.
