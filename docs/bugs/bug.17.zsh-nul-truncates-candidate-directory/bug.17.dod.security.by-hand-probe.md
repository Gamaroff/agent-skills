# bug.17 — DoD security: by-hand probe record (§5.1, supplementary)

**Not a probe count.** The probe engine has no entry form that reaches `advance-pipeline-lock.sh --restore [--which] <doc-dir>`, a shell script taking a flag and a positional. `shell-fn:` cannot source it, because the top-level parse exits 97. `cli:` runs only `.mjs`/`.js`. `shell:` reaches only the numeric-advance arm. The engine record (`bug.17.dod.security.run.json`) therefore reads `totals.executed: 0`, the same gap as task.133 dod.2 (obs #231). This file is the evidence behind an operator decision. It is not a substitute for the engine.

**Run:** 2026-09-30, by the `/finalise --bug` security agent, under `env -i` in a scratch directory. Each case runs `--restore --which <doc>`, then `--restore <doc>`, under bash and zsh, against the shipped script (`4579f760`) and the pre-fix script (`8d5ba45e`).

**Cases:** 25 hostile directory values, all expected **refused**:

- NUL (suffix, at the end, inside traversal)
- a leading or trailing newline
- CR, tab, U+001F, U+007F, ESC, U+0085
- a lone surrogate, a trailing space, another document's directory
- non-string values (array, object, number, bool, null, empty)

8 legitimate values, all expected **restored**: the exact path, a trailing slash, `./` and a bare relative path, a symlink, `\u`-escaped ASCII, a name with a space, and a unicode name.

## Result

| Script | Runs (33 cases × bash + zsh) | Matched expectation | Mismatches |
|---|---|---|---|
| post-fix `4579f760` | 66 | 66 | 0 |
| pre-fix `8d5ba45e` | 66 | 58 | 8 |

Pre-fix mismatches, each a hostile candidate the script **accepted**:

```
MISMATCH zsh  hostile nul-suffix                         accepted  advance-pipel
MISMATCH bash hostile nul-bare-end                       accepted  advance-pipel
MISMATCH zsh  hostile nul-bare-end                       accepted  advance-pipel
MISMATCH zsh  hostile nul-slash-suffix                   accepted  advance-pipel
MISMATCH bash hostile trailing-newline                   accepted  advance-pipel
MISMATCH zsh  hostile trailing-newline                   accepted  advance-pipel
MISMATCH bash hostile trailing-2newlines                 accepted  advance-pipel
MISMATCH zsh  hostile trailing-2newlines                 accepted  advance-pipel
```

The trailing-newline and NUL-at-end cases are accepted under **bash** as well as zsh. The report named zsh only.

## Harness

```bash
#!/usr/local/bin/bash
# By-hand §5.1 probe of advance-pipeline-lock.sh --restore choose_candidate. Scratch only.
S=<scratch>; SCRIPT="${SCRIPT:-$S/script.sh}"
W=$S/work; rm -rf "$W"; mkdir -p "$W/state" "$W/doc" "$W/other" "$W/my doc" "$W/dóc"; ln -s "$W/doc" "$W/doclink"
H=$(mktemp -d "$S/home.XXXX")
D="$W/doc"
L="$W/state/develop-pipeline.lock"; SNAP="$W/state/develop-pipeline.last-halt.json"
pass=0; fail=0; total=0
# case: id | direction | json value for task_or_story_directory (raw JSON) | doc-dir arg
run() {
  local id="$1" dir="$2" val="$3" arg="$4" sh
  for sh in bash zsh; do
    rm -f "$L" "$SNAP" "$L".pausing.*
    printf '{"task_or_story_directory":%s,"current_step":6}\n' "$val" > "$L.pausing.777"
    local out rc out2 rc2 outcome
    out=$(cd "$W" && env -i PATH=/usr/bin:/bin:/usr/local/bin HOME="$H" PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$SNAP" "$sh" "$SCRIPT" --restore --which "$arg" 2>/dev/null); rc=$?
    out2=$(cd "$W" && env -i PATH=/usr/bin:/bin:/usr/local/bin HOME="$H" PIPELINE_LOCK="$L" PIPELINE_HALT_SNAPSHOT="$SNAP" "$sh" "$SCRIPT" --restore "$arg" 2>&1); rc2=$?
    if [ "$rc" -eq 0 ] && [ -n "$out" ] && [ "$rc2" -eq 0 ] && [ -f "$L" ]; then outcome=accepted
    elif [ "$rc" -eq 1 ] && [ -z "$out" ] && [ "$rc2" -eq 1 ] && [ ! -f "$L" ] && [ -f "$L.pausing.777" ]; then outcome=rejected
    else outcome="inconsistent(which rc=$rc out=$out restore rc=$rc2 lock=$([ -f "$L" ] && echo y || echo n))"; fi
    total=$((total+1))
    local want=rejected; [ "$dir" = legit ] && want=accepted
    if [ "$outcome" = "$want" ]; then pass=$((pass+1)); r=ok; else fail=$((fail+1)); r=MISMATCH; fi
    local msg; msg=$(printf '%s' "$out2" | tr '\n' ' ' | cut -c1-110)
    printf '%-8s %-4s %-7s %-34s %-9s %s\n' "$r" "$sh" "$dir" "$id" "$outcome" "$msg"
  done
}
j() { jq -cn --arg s "$1" '$s'; }   # JSON-encode a shell string
# hostile — a string the candidate does NOT hold must never match $D
run nul-suffix          hostile "\"$D\\u0000x\""               "$D"
run nul-bare-end        hostile "\"$D\\u0000\""                "$D"
run nul-then-traversal  hostile "\"$D\\u0000/../other\""       "$D"
run nul-slash-suffix    hostile "\"$D/\\u0000evil\""           "$D"
run trailing-newline    hostile "\"$D\\n\""                    "$D"
run trailing-2newlines  hostile "\"$D\\n\\n\""                 "$D"
run leading-newline     hostile "\"\\n$D\""                    "$D"
run trailing-cr         hostile "\"$D\\r\""                    "$D"
run trailing-tab        hostile "\"$D\\t\""                    "$D"
run unit-sep-1f         hostile "\"$D\\u001f\""                "$D"
run del-7f              hostile "\"$D\\u007f\""                "$D"
run esc-1b              hostile "\"$D\\u001b[0m\""             "$D"
run c1-nel-0085         hostile "\"$D\\u0085\""                "$D"
run lone-surrogate      hostile "\"$D\\ud800\""                "$D"
run trailing-space      hostile "\"$D \""                      "$D"
run other-doc           hostile "$(j "$W/other")"              "$D"
run other-doc-nul-doc   hostile "\"$W/other\\u0000$D\""        "$D"
run array-of-doc        hostile "[$(j "$D")]"                  "$D"
run array-nul           hostile "[\"$D\\u0000x\"]"             "$D"
run object-dir          hostile "{\"p\":$(j "$D")}"            "$D"
run number-dir          hostile "5"                             "$D"
run true-dir            hostile "true"                          "$D"
run null-dir-legacy     hostile "null"                          "$D"
run empty-dir-legacy    hostile "\"\""                          "$D"
run newline-in-arg-side hostile "\"$D\\nx\""                   "$D"
# legitimate — must still restore
run exact               legit   "$(j "$D")"                    "$D"
run trailing-slash      legit   "$(j "$D/")"                   "$D"
run relative-dot        legit   "\"./doc\""                    "$D"
run relative-plain      legit   "\"doc\""                      "$D"
run symlink             legit   "$(j "$W/doclink")"            "$D"
run escaped-ascii       legit   "\"$(printf '%s' "$D" | sed 's#/doc$#/\\u0064oc#')\"" "$D"
run space-in-name       legit   "$(j "$W/my doc")"             "$W/my doc"
run unicode-name        legit   "$(j "$W/dóc")"                "$W/dóc"
echo "total=$total ok=$pass mismatch=$fail"
```
