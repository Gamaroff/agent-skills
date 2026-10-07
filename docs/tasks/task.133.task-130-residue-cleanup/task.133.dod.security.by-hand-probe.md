# task.133 — §5.1 by-hand probe of `advance-pipeline-lock.sh --restore` (`choose_candidate()`)

**Run:** 2026-09-30T09:45:14Z, commit `607ef810` (PR #528 head), scratch `git worktree` of HEAD, `env -i PATH=/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin HOME=$(mktemp -d) LC_ALL=C`.
The throwaway HOME was empty afterwards; no `PWNED` file anywhere in the scratch tree or at `/`.
The scratch tree carried the tracked `.agents/` (handoff, plans) but no `.claude/` and no credentials.

**Why by hand:** the engine declined (`task.133.dod.security.run.json`, `entry-not-probeable`): `shell-fn:` cannot source the script (top-level parse exits 97), `shell:` passes one positional, `cli:` accepts only `.mjs`/`.js`.
**This count is a self-report.** `finalise-dod-security-prompt.md` says a hand-harness count does not satisfy the zero-guard; this record is evidence for an override decision, not a `probes_executed` figure.

## Arms × shapes

| Arm | Shapes | Expect |
|---|---|---|
| `--restore --which <arg>` | 13 hostile `<doc-dir>`: other doc, `../../etc`, `/`, `/etc`, empty, `*`, `$(touch PWNED)`, `;touch PWNED`, newline, `--accept-legacy`, `-rf`, nonexistent, space | refuse |
| `--restore --accept-legacy --which <arg>` | same 13 | refuse |
| `--restore --which <arg>` | 5 legitimate spellings of the doc dir (abs, relative, `./`, trailing `/`, `docs/../docs/d1`) | accept |
| `--restore --which <d1>` | 7 hostile candidate `task_or_story_directory` values: `$(…)`, backticks, `d1/../d2`, symlink to d2, `../d1`, `*`, `d1\u0000x` | refuse |
| `--restore --which <d1>` | 6 non-object candidates: `null`, `[]`, `"x"`, empty, `{`, `5` | refuse |
| `--restore <arg>` (consumes) | 3 hostile `<doc-dir>` (other doc's candidate must survive) + 1 legitimate | refuse / accept |

## Results

| Shell | Executed | Matched expectation | Reproduced |
|---|---|---|---|
| bash 3.2 (`/bin/bash`) | 48 | 48 | 0 |
| zsh | 48 | 47 | **1** |

**Reproduced (zsh only, 3/3 runs):** a candidate with `"task_or_story_directory": "<d1>\u0000x"` is **accepted** for `--which <d1>`.
zsh keeps the NUL through `$(jq -r …)`, `cd` truncates the path at it, and `canon()` returns `<d1>`. bash drops the NUL (`<d1>x`) and refuses.
Severity: **low**. It needs a crafted file in `.claude/state/`, the script's shebang is bash, and zsh runs it only in the test suite's interpreter pass. It predates task.133: `canon()` and the provenance compare are task.130's, and this diff only moves a message.

## Probe script

```bash
#!/bin/bash
# §5.1 by-hand probe of advance-pipeline-lock.sh --restore choose_candidate(); run under env -i.
S="$1"; ROOT="$2"; cd "$ROOT"
mkdir -p docs/d1 docs/d2 ".claude/state" "docs/sp ace" 
ln -sfn "$ROOT/docs/d2" docs/link-to-d2
st=.claude/state; L=$st/develop-pipeline.lock; H=$st/develop-pipeline.last-halt.json
export PIPELINE_LOCK=$L PIPELINE_HALT_SNAPSHOT=$H
n=0
seed() { rm -f $L $H $L.pausing.*; printf '%s' "$1" > "$L.pausing.1"; }
run() { # arm, expect(accept|refuse), args...
  local arm="$1" exp="$2"; shift 2; n=$((n+1))
  out=$(bash "$S" "$@" 2>"$ROOT/err"); rc=$?
  got=refuse; [ $rc -eq 0 ] && [ -n "$out" ] && got=accept
  [ "$arm" = restore ] && { [ $rc -eq 0 ] && [ -f $L ] && got=accept || got=refuse; }
  mark=ok; [ "$got" = "$exp" ] || mark=MISMATCH
  printf '%-8s %-8s %-7s rc=%s %s | %q\n' "$mark" "$arm" "$got" "$rc" "$(printf '%q ' "$@")" "$(head -c 160 "$ROOT/err" | tr '\n' ' ')"
}
D1="$ROOT/docs/d1"
# Hostile <doc-dir> arguments, candidate is for d1 → every one must refuse.
for arm in which which-legacy; do
  for bad in "$ROOT/docs/d2" "../../etc" "/" "/etc" "" "*" '$(touch PWNED)' "docs/d1;touch PWNED" $'docs/d1\nx' "--accept-legacy" "-rf" "$ROOT/docs/nonexistent" "$ROOT/docs/sp ace"; do
    seed "{\"task_or_story_directory\":\"$D1\",\"current_step\":5}"
    if [ $arm = which ]; then run which refuse --restore --which "$bad"; else run which-legacy refuse --restore --accept-legacy --which "$bad"; fi
  done
done
# Legitimate forms that name d1 → must accept (overblock direction).
for good in "$D1" "docs/d1" "./docs/d1" "$D1/" "docs/../docs/d1"; do
  seed "{\"task_or_story_directory\":\"$D1\",\"current_step\":5}"; run which accept --restore --which "$good"
done
# Hostile candidate CONTENT (task_or_story_directory) against a legitimate d1 → must refuse, no exec.
for bad in '$(touch PWNED)' '`touch PWNED`' "$ROOT/docs/d1/../d2" "$ROOT/docs/link-to-d2" "../d1" '*' "$ROOT/docs/d1\u0000x"; do
  seed "{\"task_or_story_directory\":\"$bad\",\"current_step\":5}"; run which refuse --restore --which "$D1"
done
# Non-object candidates → skipped, refuse.
for bad in 'null' '[]' '"x"' '' '{' '5'; do seed "$bad"; run which refuse --restore --which "$D1"; done
# Consuming arm: hostile dir must not restore or delete another doc's candidate.
for bad in "$ROOT/docs/d2" '$(touch PWNED)' "../../etc"; do
  seed "{\"task_or_story_directory\":\"$D1\",\"current_step\":5}"; run restore refuse --restore "$bad"
  [ -f "$L.pausing.1" ] || echo "MISMATCH  restore deleted the d1 candidate for arg $(printf %q "$bad")"
done
seed "{\"task_or_story_directory\":\"$D1\",\"current_step\":5}"; run restore accept --restore "$D1"
echo "EXECUTED $n"
find / -maxdepth 0 >/dev/null; find "$ROOT" -name PWNED; [ -e /PWNED ] && echo "PWNED at /"
```

## Raw output (bash)

```
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d2  | advance-pipeline-lock:\ \'.claude/state/develop-p
ok       which    refuse  rc=1 --restore --which ../../etc  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'../../etc\'\ 
ok       which    refuse  rc=1 --restore --which /  | $'advance-pipeline-lock: \'.claude/state/develop-pipeline.lock.pausing.1\' is for \'<scratch…>
ok       which    refuse  rc=1 --restore --which /etc  | $'advance-pipeline-lock: \'.claude/state/develop-pipeline.lock.pausing.1\' is for \'<scratch…>
ok       which    refuse  rc=1 --restore --which ''  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'\'\ 
ok       which    refuse  rc=1 --restore --which \*  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'\*\'\ 
ok       which    refuse  rc=1 --restore --which \$\(touch\ PWNED\)  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'\$\(touch\ 
ok       which    refuse  rc=1 --restore --which docs/d1\;touch\ PWNED  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'docs/d1\
ok       which    refuse  rc=1 --restore --which $'docs/d1\nx'  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'docs/d1\ x\'\ 
ok       which    refuse  rc=1 --restore --which --accept-legacy  | advance-pipeline-lock:\ --restore\ takes\ flags\ BEFORE\ the\ \<doc-dir\>\,\ and\ exactly\ o
ok       which    refuse  rc=1 --restore --which -rf  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'-rf\'\ 
ok       which    refuse  rc=1 --restore --which <scratch>/docs/nonexistent  | advance-pipeline-lock:\ --restore\ needs
ok       which    refuse  rc=1 --restore --which <scratch>/docs/sp\ ace  | advance-pipeline-lock:\ \'.claude/state/deve
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which <scratch>/docs/d2  | advance-pipeline-lock:\ \'.cl
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which ../../etc  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which /  | $'advance-pipeline-lock: \'.claude/state/develop-pipeline.lock.pausing.1\' is for \'/U
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which /etc  | $'advance-pipeline-lock: \'.claude/state/develop-pipeline.lock.pausing.1\' is for \
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which ''  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'\'\ 
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which \*  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'\*\'\ 
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which \$\(touch\ PWNED\)  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which docs/d1\;touch\ PWNED  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which $'docs/d1\nx'  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which --accept-legacy  | advance-pipeline-lock:\ --restore\ takes\ flags\ BEFORE\ the\ \<doc-dir\
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which -rf  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'-rf\'\
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which <scratch>/docs/nonexistent  | advance-pipeline-loc
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which <scratch>/docs/sp\ ace  | advance-pipeline-lock:\ 
ok       which    accept  rc=0 --restore --which <scratch>/docs/d1  | ''
ok       which    accept  rc=0 --restore --which docs/d1  | ''
ok       which    accept  rc=0 --restore --which ./docs/d1  | ''
ok       which    accept  rc=0 --restore --which <scratch>/docs/d1/  | ''
ok       which    accept  rc=0 --restore --which docs/../docs/d1  | ''
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | advance-pipeline-lock:\ \'.claude/state/develop-p
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | advance-pipeline-lock:\ \'.claude/state/develop-p
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | advance-pipeline-lock:\ \'.claude/state/develop-p
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | advance-pipeline-lock:\ \'.claude/state/develop-p
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | $'advance-pipeline-lock: \'.claude/state/develop-
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | $'advance-pipeline-lock: \'.claude/state/develop-
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | advance-pipeline-lock:\ \'.claude/state/develop-p
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | $'advance-pipeline-lock: \'.claude/state/develop-
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | $'advance-pipeline-lock: \'.claude/state/develop-
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | $'advance-pipeline-lock: \'.claude/state/develop-
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | $'advance-pipeline-lock: \'.claude/state/develop-
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | $'advance-pipeline-lock: \'.claude/state/develop-
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | $'advance-pipeline-lock: \'.claude/state/develop-
ok       restore  refuse  rc=1 --restore <scratch>/docs/d2  | advance-pipeline-lock:\ \'.claude/state/develop-pipeline.
ok       restore  refuse  rc=1 --restore \$\(touch\ PWNED\)  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'\$\(touch\ PWNED\)\
ok       restore  refuse  rc=1 --restore ../../etc  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'../../etc\'\ 
ok       restore  accept  rc=0 --restore <scratch>/docs/d1  | ''
EXECUTED 48
```

## Raw output (zsh)

```
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d2  | advance-pipeline-lock:\ \'.claude/state/develop-p
ok       which    refuse  rc=1 --restore --which ../../etc  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'../../etc\'\ 
ok       which    refuse  rc=1 --restore --which /  | $'advance-pipeline-lock: \'.claude/state/develop-pipeline.lock.pausing.1\' is for \'<scratch…>
ok       which    refuse  rc=1 --restore --which /etc  | $'advance-pipeline-lock: \'.claude/state/develop-pipeline.lock.pausing.1\' is for \'<scratch…>
ok       which    refuse  rc=1 --restore --which ''  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'\'\ 
ok       which    refuse  rc=1 --restore --which \*  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'\*\'\ 
ok       which    refuse  rc=1 --restore --which \$\(touch\ PWNED\)  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'\$\(touch\ 
ok       which    refuse  rc=1 --restore --which docs/d1\;touch\ PWNED  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'docs/d1\
ok       which    refuse  rc=1 --restore --which $'docs/d1\nx'  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'docs/d1\ x\'\ 
ok       which    refuse  rc=1 --restore --which --accept-legacy  | advance-pipeline-lock:\ --restore\ takes\ flags\ BEFORE\ the\ \<doc-dir\>\,\ and\ exactly\ o
ok       which    refuse  rc=1 --restore --which -rf  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'-rf\'\ 
ok       which    refuse  rc=1 --restore --which <scratch>/docs/nonexistent  | advance-pipeline-lock:\ --restore\ needs
ok       which    refuse  rc=1 --restore --which <scratch>/docs/sp\ ace  | advance-pipeline-lock:\ \'.claude/state/deve
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which <scratch>/docs/d2  | advance-pipeline-lock:\ \'.cl
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which ../../etc  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which /  | $'advance-pipeline-lock: \'.claude/state/develop-pipeline.lock.pausing.1\' is for \'/U
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which /etc  | $'advance-pipeline-lock: \'.claude/state/develop-pipeline.lock.pausing.1\' is for \
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which ''  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'\'\ 
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which \*  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'\*\'\ 
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which \$\(touch\ PWNED\)  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which docs/d1\;touch\ PWNED  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which $'docs/d1\nx'  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which --accept-legacy  | advance-pipeline-lock:\ --restore\ takes\ flags\ BEFORE\ the\ \<doc-dir\
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which -rf  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'-rf\'\
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which <scratch>/docs/nonexistent  | advance-pipeline-loc
ok       which-legacy refuse  rc=1 --restore --accept-legacy --which <scratch>/docs/sp\ ace  | advance-pipeline-lock:\ 
ok       which    accept  rc=0 --restore --which <scratch>/docs/d1  | ''
ok       which    accept  rc=0 --restore --which docs/d1  | ''
ok       which    accept  rc=0 --restore --which ./docs/d1  | ''
ok       which    accept  rc=0 --restore --which <scratch>/docs/d1/  | ''
ok       which    accept  rc=0 --restore --which docs/../docs/d1  | ''
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | advance-pipeline-lock:\ \'.claude/state/develop-p
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | advance-pipeline-lock:\ \'.claude/state/develop-p
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | advance-pipeline-lock:\ \'.claude/state/develop-p
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | advance-pipeline-lock:\ \'.claude/state/develop-p
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | $'advance-pipeline-lock: \'.claude/state/develop-
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | $'advance-pipeline-lock: \'.claude/state/develop-
MISMATCH which    accept  rc=0 --restore --which <scratch>/docs/d1  | ''
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | $'advance-pipeline-lock: \'.claude/state/develop-
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | $'advance-pipeline-lock: \'.claude/state/develop-
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | $'advance-pipeline-lock: \'.claude/state/develop-
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | $'advance-pipeline-lock: \'.claude/state/develop-
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | $'advance-pipeline-lock: \'.claude/state/develop-
ok       which    refuse  rc=1 --restore --which <scratch>/docs/d1  | $'advance-pipeline-lock: \'.claude/state/develop-
ok       restore  refuse  rc=1 --restore <scratch>/docs/d2  | advance-pipeline-lock:\ \'.claude/state/develop-pipeline.
ok       restore  refuse  rc=1 --restore \$\(touch\ PWNED\)  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'\$\(touch\ PWNED\)\
ok       restore  refuse  rc=1 --restore ../../etc  | advance-pipeline-lock:\ --restore\ needs\ an\ existing\ \<doc-dir\>\,\ got\ \'../../etc\'\ 
ok       restore  accept  rc=0 --restore <scratch>/docs/d1  | ''
EXECUTED 48
```
