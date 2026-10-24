// rm-invocation.mjs — does one line of a fenced shell block run `rm`? (task 227, QA1-1, QA2-3)
//
// Backs the Step 8 guard in step-8-completion-checklist.test.mjs: a block that ends the run must
// remove nothing directly, because a host's removal check that cannot inspect an `rm` refuses the
// whole block (obs #87). It is a module of its own so security-probe.mjs can import the predicate.
//
// The rule is a WORD: `rm` with no letter, digit, `_` or `-` on either side, after quotes and
// backslashes are removed as the shell removes them (`r'm'`, `"rm"` and `\rm` are `rm`). It does
// not list what may come before or after `rm`. The first two versions did: one listed separators
// before it and missed `then rm`, `xargs rm` and `/bin/rm`; the next listed separators after it and
// missed `rm>/dev/null` and `rm<<EOF`. Any character that is not part of a word now ends the
// word, so a redirection, a path slash or a backtick counts as well as a space.
// It errs toward the hit, because a miss is a stalled run and a false hit only fails the guard on
// a line that runs nothing: `echo "rm it"`, `git rm x`, `rm.sh` and `x  # rm later` all count. A
// trailing comment is not stripped, because a `#` inside quotes would hide what follows it; only a
// line that IS a comment is skipped. `--rm` (docker), `rmdir` and `farm` are not the word.
// Not seen: `find … -delete`, `unlink`, and an `rm` spelled through a variable (`$RM`).

const RM_WORD = /(?<![\w-])rm(?![\w-])/;

// true when the line runs no `rm`; false when it does. The verdict is "may this line stay in a
// block that calls --complete", so a line that removes something is the refused input.
export function lineRunsNoRm(line) {
  if (typeof line !== "string") return false;
  if (/^\s*#/.test(line)) return true;
  return !RM_WORD.test(line.replace(/['"\\]/g, ""));
}
