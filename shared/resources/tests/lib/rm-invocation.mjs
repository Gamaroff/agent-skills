// rm-invocation.mjs — does one line of a fenced shell block run `rm`? (task 227, QA1-1)
//
// Backs the Step 8 guard in step-8-completion-checklist.test.mjs: a block that ends the run must
// remove nothing directly, because a host's removal check that cannot inspect an `rm` refuses the
// whole block (obs #87). It is a module of its own so security-probe.mjs can import the predicate.
//
// The rule is a WORD, not a command position: `rm` (or a path ending in `/rm`) after the start of
// the line, whitespace, a separator (`;` `&` `|`), an opener (`(` `{` `` ` ``) or `!`, followed by
// whitespace, a closer or the end of the line. Quotes and backslashes are removed first, as the
// shell removes them, so `r'm'`, `"rm"` and `\rm` are `rm`. Command position needs a shell parser,
// and the first version, which approximated it with "after a separator", missed `then rm`, `do rm`,
// `! rm`, `command rm`, `xargs rm`, `sudo rm` and `/bin/rm`.
// Every miss this rule makes is a stalled run, and every false hit is a guard that fails on a line
// that runs nothing, so it errs toward the hit: `echo "rm it"` and `x  # rm later` both count. A
// trailing comment is not stripped, because a `#` inside quotes would hide what follows it; only a
// line that IS a comment is skipped.
// Not seen: `find … -delete`, `unlink`, and an `rm` spelled through a variable (`$RM`).

const RM_WORD = /(^|[\s;&|({`!])(?:\S*\/)?rm(?=$|[\s;&|)}`])/;

// true when the line runs no `rm`; false when it does. The verdict is "may this line stay in a
// block that calls --complete", so a line that removes something is the refused input.
export function lineRunsNoRm(line) {
  if (typeof line !== "string") return false;
  if (/^\s*#/.test(line)) return true;
  return !RM_WORD.test(line.replace(/['"\\]/g, ""));
}
