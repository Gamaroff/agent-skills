#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/qa-execute-snippets.mjs. Regenerate via `npm run bundle`.
/**
 * qa-execute-snippets — extract, classify and dual-shell execute the fenced
 * ```bash blocks in a markdown file.
 *
 * Usage:
 *   node <this-file> --file <path.md> [options]
 *
 * Options:
 *   --file <path>        markdown file to analyse (required)
 *   --bind NAME=VALUE    bind a caller-supplied variable; repeatable
 *   --copy <dir>         seed the temp working directory from this directory
 *   --timeout <ms>       per-block, per-shell timeout (default 10000)
 *   --no-zsh             force the bash arm only (testing / mutation proving)
 *   --json               emit one JSON object on stdout
 *
 * Exit codes (repository convention):
 *   0  clean — no findings
 *   1  findings present
 *   2  hard error (missing file, bad argument)
 *
 * The rule this implements — what counts as runnable prose, why the safety
 * boundary is an allow-list rather than a deny-list, and why stdout rather than
 * exit status is the load-bearing comparison — is stated once in
 * `qa-runnable-prose-detection.md`, which sits beside this file in both the
 * source tree and every bundled copy. Read that first; this file is the
 * mechanism, not the argument.
 */

import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ── Extraction ────────────────────────────────────────────────────────────────

/**
 * Every fenced ```bash block, with the 1-based line number of its opening fence.
 * Only the `bash` info string is in scope — see the detection rule §1.
 */
export function extractBlocks(markdown) {
  const lines = markdown.split("\n");
  const blocks = [];
  let open = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // CR-10 — take the language as the FIRST WORD of the info string and ignore
    // the rest. Rejecting an attributed fence (```bash showLineNumbers) did not
    // merely skip that block: its body was dropped and its CLOSING fence was then
    // read as an opening one, inverting fence state for the rest of the file.
    // Verified: a doc with one attributed block extracted zero blocks, so the gate
    // reported a clean run on a document it had never read.
    const fence = /^(\s*)(`{3,}|~{3,})\s*([A-Za-z0-9_+-]*)([^`]*)$/.exec(line);
    if (!fence) {
      // Ordinary content. Only meaningful while a fence is open — that is the
      // block body, and dropping it here is how an earlier draft extracted every
      // block as empty.
      if (open !== null) open.body.push(line);
      continue;
    }
    const [, indent, marker, info] = fence;

    if (open === null) {
      open = {
        indent,
        marker: marker[0],
        len: marker.length,
        info,
        start: i,
        body: [],
      };
      continue;
    }

    // A closing fence uses the same marker character and is at least as long.
    if (marker[0] === open.marker && marker.length >= open.len && info === "") {
      if (open.info === "bash") {
        blocks.push({
          line: open.start + 1,
          code: open.body.join("\n"),
        });
      }
      open = null;
      continue;
    }

    // A differently-marked fence inside an open block is content, not a fence.
    open.body.push(line);
  }

  // An unterminated fence is not a block — we never execute what we cannot delimit.
  return blocks;
}

// ── Classification ────────────────────────────────────────────────────────────

/**
 * Commands known to be read-only. This is the safety boundary and it is an
 * ALLOW-list: anything absent here classifies as `mutating` and is skipped.
 * A deny-list alone fails open — every command nobody thought to forbid runs.
 *
 * `gh` and `curl` are deliberately absent in every form, including read-only
 * ones: a QA gate should not make network calls, and the execution environment
 * carries no credentials.
 */
export const SAFE_COMMANDS = new Set([
  "basename",
  "cat",
  "comm",
  "cut",
  "date",
  "diff",
  "dirname",
  "echo",
  "egrep",
  "false",
  "fgrep",
  "file",
  "grep",
  "head",
  "jq",
  "ls",
  "printf",
  "pwd",
  "readlink",
  "realpath",
  "seq",
  "sort",
  "stat",
  "tail",
  "test",
  "tr",
  "true",
  "uniq",
  "wc",
  // `sed` is read-only unless asked to edit in place; `find` unless given a
  // write action; both are constrained by DENY_PATTERNS below.
  "sed",
  "find",
]);

/**
 * Commands that RUN another command. Their blast radius is whatever follows, and
 * only the prefix was ever scanned — `env touch /tmp/x`, `command mv a b` and
 * `time mv a b` all classified runnable. They are refused outright rather than
 * recursed into: the recursion would have to re-implement each one's option
 * grammar to find where the real command starts, and getting that wrong fails
 * open again.
 *
 * `awk` is here for the same reason by a different route — its program text is a
 * quoted argument, so `awk 'BEGIN{system("touch /tmp/x")}'` is arbitrary shell
 * that the quote-blanking hides from the scan entirely.
 */
export const COMMAND_RUNNERS = new Set([
  "awk",
  "command",
  "env",
  "eval",
  "exec",
  "nice",
  "nohup",
  "sudo",
  "time",
  "timeout",
  "watch",
  "xargs",
]);

/**
 * Shell keywords, and builtins that cannot mutate anything outside the block's
 * own shell. `source` and `.` are deliberately absent: they execute an arbitrary
 * file, which is exactly what the allow-list exists to refuse.
 */
const SHELL_KEYWORDS = new Set([
  "!",
  "[",
  "[[",
  "]]",
  "]",
  "{",
  "}",
  "(",
  ")",
  "case",
  "do",
  "done",
  "elif",
  "else",
  "esac",
  "fi",
  "for",
  "function",
  "if",
  "in",
  "select",
  "then",
  "until",
  "while",
  // Builtins whose blast radius is the block's own shell process.
  ":",
  "break",
  "cd",
  "continue",
  "exit",
  "export",
  "local",
  "read",
  "readonly",
  "return",
  "set",
  "shift",
  "type",
  "unset",
  "which",
]);

/**
 * What a command name can look like. A token that cannot name a command — a
 * `case` arm glob pattern, a blanked quoted string, a stray backslash — is not
 * an invocation, so the segment holding it is not scanned.
 *
 * This does NOT weaken the fail-closed rule. Anything that *could* be a command
 * name and is not on the allow-list still classifies as mutating. What this
 * removes is the noise that made a real skill file report ten "unrecognised
 * commands" that were glob patterns, and skip all twelve of its blocks.
 */
const COMMAND_NAME = /^[A-Za-z_.\/][\w.\/+-]*$/;

/** `git` subcommands that only read. Any other subcommand is mutating. */
const SAFE_GIT_SUBCOMMANDS = new Set([
  "cat-file",
  "describe",
  "diff",
  "log",
  "ls-files",
  "ls-remote",
  "ls-tree",
  "rev-list",
  "rev-parse",
  "show",
  "status",
]);

/**
 * Named dangers. These do not define the boundary — SAFE_COMMANDS does — but
 * they produce a precise reason for the cases worth naming.
 */
/**
 * Commands for which `-o` is NOT an output file: `grep` reads it as
 * `--only-matching` and `find` as the OR operator. Both are read-only.
 */
const O_FLAG_NOT_OUTPUT = new Set(["grep", "egrep", "fgrep", "rg", "find"]);

/** Prefixes that precede the real command without being it. */
const COMMAND_PREFIXES = new Set(["sudo", "env", "command", "nohup", "nice"]);

/**
 * Does any command in this block write a file via `-o`?
 *
 * BUG-6 root cause D — `-o` used to be matched as a bare string with no reference
 * to the command it belongs to, so `grep -o` and `find … -o` were refused. The
 * first attempt at scoping it was a regex with a negative lookahead, and it was
 * wrong twice over, which is why this is a function instead:
 *
 *  - `\s*` before a lookahead BACKTRACKS. At `| grep -o …` the engine tried the
 *    lookahead after the space, failed it, then retried with `\s*` empty — where
 *    `grep` no longer sits at the cursor, so the negative lookahead trivially
 *    succeeded and the exemption evaporated. It held only at zero-whitespace
 *    positions, which meant this repository's OWN documented `| grep -o …`
 *    snippet stayed refused.
 *  - A command substitution inherited its enclosing segment's exemption, so
 *    `find . -newer $(sort -o /tmp/pwned f)` was let through — a FAIL-OPEN newly
 *    created by the fix for an over-refusal. `$(`, backticks and grouping
 *    parentheses are therefore segment boundaries here.
 */
function hasOutputFlagWrite(text) {
  const segments = text.split(/\n|;|\|\||&&|\||&|\$\(|`|\(|\)|\{|\}/);
  for (const seg of segments) {
    if (!/\s-o(?:\s+|=)\S/.test(seg)) continue;
    const words = seg.trim().split(/\s+/).filter(Boolean);
    let i = 0;
    // Step over assignments and prefix commands to reach the real command name.
    while (
      i < words.length &&
      (COMMAND_PREFIXES.has(words[i]) || /^[A-Za-z_]\w*=/.test(words[i]))
    ) {
      i += 1;
    }
    const name = (words[i] || "")
      .replace(/['"\\]/g, "")
      .split("/")
      .pop();
    if (O_FLAG_NOT_OUTPUT.has(name)) continue;
    return true; // an unrecognised command with `-o` still fails closed
  }
  return false;
}

export const DENY_PATTERNS = [
  [/\bgh\s+pr\s+comment\b/, "gh pr comment"],
  [/\bgh\s+issue\b/, "gh issue"],
  [/\bgh\s+api\b[^\n]*\s(-X|--method)\b/, "gh api with method"],
  [
    /\bcurl\b[^\n]*\s(-X|--request)\s*(POST|PUT|PATCH|DELETE)\b/,
    "curl write method",
  ],
  [/\bgit\s+push\b/, "git push"],
  [/\bgit\s+commit\b/, "git commit"],
  [/\brm\s+-[A-Za-z]*[rf]/, "rm -rf"],
  // `-i` anywhere in a sed invocation, not only immediately after `sed`.
  // `sed 's/a/b/' -i file` and `sed -e 's/a/b/' -i file` both edit in place and
  // both slipped past a pattern anchored to the first argument.
  [/\bsed\b[^\n|;&]*\s-[A-Za-z]*i\b/, "sed -i"],
  [/\bsed\b[^\n|;&]*\s--in-place(=\S*)?\b/, "sed --in-place"],
  // Long-form output flags on otherwise read-only commands write files just as a
  // redirection does, and carry no `>` for WRITE_REDIRECT to catch.
  [/\s--output(=|\s)/, "--output flag"],
  // BUG-6 root cause D — sed writes a file through its `w` flag with neither `-i`
  // nor a redirection: `s/a/b/w FILE` as a substitute flag and `w FILE` as a
  // command. DENY_PATTERNS named only the `-i` spellings, so both slipped past.
  [/\bsed\b[^\n|;&]*\bw\s+\S/, "sed w write"],
  // CR-7: `find` is read-only until it is given an action that is not.
  [
    /\bfind\b[^\n]*\s-(delete|exec|execdir|ok|okdir|fls|fprint|fprintf)\b/,
    "find write action",
  ],
  // Other allow-listed commands with a write mode.
  [/\btee\b/, "tee"],
];

/**
 * CR-1 — a write redirection makes ANY command mutating, including an
 * allow-listed one. `echo pwned > /tmp/x` classified runnable and wrote the file;
 * the temp working directory is no defence, because an absolute or `~`-relative
 * target simply ignores it.
 *
 * Matches `>`, `>>`, `&>`, `>|` and `n>` / `n>>` when they target a real path.
 *
 * Two things are NOT writes and must be exempt, or the rule refuses most of the
 * documented prose it exists to run: redirection to `/dev/null` / `/dev/stdout` /
 * `/dev/stderr`, which persists nothing, and file-descriptor duplication `>&1`,
 * `2>&1`, which redirects a stream onto another rather than onto a file. An
 * earlier draft matched `2>&1` and made `command -v zsh >/dev/null 2>&1` —
 * this repository's own documented zsh guard — unrunnable.
 *
 * BUG-6 root cause B — the pre-operator class used to exclude `\d` and `\w` as
 * well, which meant a redirection glued to the preceding word (`echo pwned>/tmp/x`,
 * `cat README.md>/tmp/x`, `echo pwned>>/tmp/x`) was never seen. Only `<`, `>` and
 * `&` need excluding: descriptor duplication is already handled by the `(?!&\d)`
 * lookahead, which is what keeps `2>&1` and `>&2` runnable.
 */
const WRITE_REDIRECT =
  /(?:^|[^<>&])(?:\d*>>?|&>|>\|)\s*(?!&\d|\s*\/dev\/(?:null|stderr|stdout)\b)\S/;

/**
 * Blank the CONTENTS of `(( … ))` and `[[ … ]]`, preserving length and newlines.
 *
 * Inside an arithmetic evaluation or a conditional expression, `>` is a COMPARISON
 * operator, never a redirection. Widening WRITE_REDIRECT's pre-context to catch
 * `echo pwned>/tmp/x` (BUG-6 root cause B) also made `if ((a>b)); then …` match,
 * turning a read-only arithmetic test into a refusal — an over-refusal introduced
 * by the fix for a fail-open. `[[ 1 > 2 ]]` was already refused for the same
 * reason before that change; one guard covers both.
 *
 * This is applied ONLY on the write-redirection path. `commandWords` still sees
 * the original text, so a command substitution inside a conditional — `[[ $(touch
 * /tmp/x) ]]` — is still scanned and still fails closed.
 */
function blankConditionalSpans(text) {
  const blank = (inner) => inner.replace(/[^\n]/g, " ");
  return text
    .replace(/\(\(([^)]*)\)\)/g, (_m, inner) => `((${blank(inner)}))`)
    .replace(/\[\[([^\]]*)\]\]/g, (_m, inner) => `[[${blank(inner)}]]`);
}

/** Template slots: `{n}`, `{task-id}`, `<path>`, `<PLACEHOLDER>`. */
const PLACEHOLDER_PATTERNS = [
  // `{name}` but never `${name}` — the negative lookbehind is what keeps shell
  // parameter expansion out of the placeholder bucket.
  /(?<!\$)\{[A-Za-z][\w .:|/-]*\}/,
  // `<name>` in argument position. `2>&1`, `<<EOF` and `a < b` do not match.
  /(?<![<>&\w])<[A-Za-z][\w -]*>/,
];

/** Shell variables that are always available and never need binding. */
const IMPLICIT_VARS = new Set([
  "?",
  "!",
  "$",
  "#",
  "@",
  "*",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "HOME",
  "IFS",
  "PATH",
  "PWD",
  "OLDPWD",
  "SHELL",
  "USER",
  "TMPDIR",
  "RANDOM",
  "LINENO",
  "SECONDS",
  "HOSTNAME",
  "UID",
  "EUID",
  "PPID",
  "BASH_SOURCE",
]);

/**
 * Remove a `#` comment from one line, respecting quoting.
 *
 * Walks the line tracking single- and double-quote state so a `#` inside a string
 * is data, not a comment. `${#var}` is preserved because a `#` only opens a
 * comment at the start of a word (start of line or after whitespace).
 */
function stripCommentQuoteAware(line) {
  let single = false;
  let double = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "\\" && double) {
      i++;
      continue;
    }
    if (c === "'" && !double) {
      single = !single;
      continue;
    }
    if (c === '"' && !single) {
      double = !double;
      continue;
    }
    if (
      c === "#" &&
      !single &&
      !double &&
      (i === 0 || /\s/.test(line[i - 1]))
    ) {
      return line.slice(0, i);
    }
  }
  return line;
}

/**
 * Drop comments and heredoc bodies. Quoted spans are KEPT — a placeholder is
 * very often written inside quotes (`--issue "{TRACKER_ISSUE}"`), so blanking
 * quotes before placeholder detection would classify a templated block as
 * runnable and then execute it.
 */
/**
 * Blank the CONTENTS of every quoted span on one line, preserving the quote
 * characters, the line's length and its newlines.
 *
 * BUG-6 root cause C — the two `.replace()` calls this replaces ran in sequence
 * and neither knew about the other's quote type. `'[^']*'` was applied first, so
 * in `echo "it's fine"; touch /tmp/x; echo "don't"` the two apostrophes — each
 * of them literal text inside a double-quoted string — paired with each other
 * and erased `; touch /tmp/x; echo "` from the scan while bash still executed it.
 * Walking the line once, tracking which quote is open, is the only way to get
 * this right: inside single quotes nothing escapes, inside double quotes a
 * backslash does.
 */
function blankQuotedSpans(text) {
  let out = "";
  let quote = null;
  // Where the currently-open quote started, so an unterminated one can be undone.
  let openedAt = -1;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote === null) {
      if (ch === "'" || ch === '"') {
        quote = ch;
        openedAt = i;
        out += ch;
      } else if (ch === "\\" && i + 1 < text.length) {
        // A backslash outside quotes escapes the next character, including a
        // quote — `\'` opens nothing.
        out += ch + text[i + 1];
        i += 1;
      } else {
        out += ch;
      }
    } else if (quote === '"' && ch === "\\" && i + 1 < text.length) {
      out += "  ";
      i += 1;
    } else if (ch === quote) {
      quote = null;
      openedAt = -1;
      out += ch;
    } else {
      out += ch === "\n" ? "\n" : " ";
    }
  }
  // An unterminated quote must blank NOTHING. `echo don't` followed by a
  // `touch /tmp/x` on the next line has one apostrophe and no closer; blanking
  // from it to the end of the block would hide the `touch` from the command scan
  // while bash still ran it — a fail-open route of exactly the kind this function
  // exists to close. Leaving the span intact keeps the scanner fail-closed: it
  // sees more text, never less. (The regex pair this replaced got this right by
  // accident, because `'[^']*'` simply did not match without a closer.)
  if (quote !== null) return out.slice(0, openedAt) + text.slice(openedAt);
  return out;
}

/**
 * Like `blankQuotedSpans`, but COLLAPSES each quoted span to its bare quote pair
 * instead of preserving its length.
 *
 * Both exist because they serve different consumers. The heredoc detector needs
 * offsets that line up with the raw line, so it uses the length-preserving form.
 * Command detection needs the OLD tokenisation: the two regexes this replaced
 * turned `"a b"` into `""`, one token. Blanking to spaces instead splits a
 * multi-line assignment `MSG="first\nsecond"` into a final segment whose only
 * surviving token is the closing quote — reported as an unreadable command
 * position and refused. Collapsing keeps the token count while still fixing the
 * mutual-awareness defect the regex pair had.
 */
function collapseQuotedSpans(text) {
  let out = "";
  let quote = null;
  let openedAt = -1;
  let outAtOpen = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote === null) {
      if (ch === "'" || ch === '"') {
        quote = ch;
        openedAt = i;
        outAtOpen = out.length;
        out += ch;
      } else if (ch === "\\" && i + 1 < text.length) {
        out += ch + text[i + 1];
        i += 1;
      } else {
        out += ch;
      }
    } else if (quote === '"' && ch === "\\" && i + 1 < text.length) {
      i += 1; // escaped char inside double quotes is content — dropped
    } else if (ch === quote) {
      quote = null;
      openedAt = -1;
      out += ch;
    }
    // else: content of a quoted span — dropped
  }
  // Same fail-closed rule as blankQuotedSpans: an unterminated quote hides nothing.
  if (quote !== null) return out.slice(0, outAtOpen) + text.slice(openedAt);
  return out;
}

function stripProse(code) {
  const out = [];
  const lines = code.split("\n");
  let heredocTerminator = null;

  for (const raw of lines) {
    if (heredocTerminator !== null) {
      if (raw.trim() === heredocTerminator) heredocTerminator = null;
      continue; // heredoc body is data
    }
    // A REAL heredoc: `<<` or `<<-`, never `<<<` (here-string) and never the
    // second `<` of one. `grep -q x <<<"DATA"` used to swallow every following
    // line as heredoc body, hiding a trailing `rm -rf` from both scans.
    // BUG-6 root cause C — run the detector over a quote-blanked copy of the
    // line. `echo "example: cat <<EOF"` is documentation ABOUT a heredoc, not a
    // heredoc; treating it as one set a terminator that never arrived, so every
    // following line was discarded as heredoc body and a trailing `touch /tmp/x`
    // was hidden from both scans while bash still ran it.
    // The opener must be matched against the RAW line: in `cat <<'EOF'` the quotes
    // around the terminator are heredoc SYNTAX, and blanking them first erases the
    // terminator name and loses the body-shielding that the quoted form exists
    // for. So match raw, then consult the blanked copy — same length, so offsets
    // line up — purely to ask whether the `<<` itself sat inside a quoted span.
    const scan = blankQuotedSpans(raw);
    let here = null;
    for (const m of raw.matchAll(
      /(?<!<)<<-?(?!<)\s*\\?(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/g,
    )) {
      if (scan[m.index] === raw[m.index]) {
        here = m; // real shell syntax, not text inside a string
        break;
      }
    }
    if (here) {
      heredocTerminator = here[2];
      // Keep the WHOLE opener line, not just the part before `<<`. Truncating it
      // threw away any redirection that followed — `cat <<EOF > /tmp/pwned` had
      // its `> /tmp/pwned` removed before the write-redirect check ever saw it,
      // and classified runnable.
      out.push(raw);
      continue;
    }
    // Drop `# comment` — but ONLY outside quoted spans. A line regex fired on a
    // `#` inside a string, deleting the rest of the line from both scans while
    // execution still used the original code: `echo "note # here"; rm -rf /tmp/x`
    // classified runnable and the `rm -rf` ran.
    let line = stripCommentQuoteAware(raw);
    out.push(line);
  }
  return out.join("\n");
}

/**
 * Everything `stripProse` removes, plus the contents of quoted spans. Used only
 * for command detection, where a quoted string is an argument and never an
 * invocation.
 */
function stripNonCode(code) {
  return collapseQuotedSpans(stripProse(code));
}

/**
 * Keywords after which the NEXT word is in command position.
 *
 * BUG-6 root cause A — `commandWords` used to emit the first token of a segment
 * and stop. When that token was a keyword the whole segment was thrown away, so
 * `if touch /tmp/x; then echo hi; fi` reported no command at all and classified
 * runnable. The segment splitter split on `do`/`then`/`else`, which is why those
 * three keywords were never the problem and `if`/`while`/`until` always were.
 *
 * The set below is what makes the distinction explicit rather than accidental.
 * `if`, `elif`, `while` and `until` are followed by a command list, so scanning
 * must continue past them. `for`, `select`, `case`, `function` and `in` are
 * followed by a NAME or a word list — continuing past those would report the loop
 * variable of `for f in a b` as a command and refuse a legitimate loop. `fi`,
 * `done` and `esac` terminate a construct and are followed by nothing on the same
 * segment.
 *
 * The original bug report listed only `if`, `while` and `until`, and stated that
 * `elif` had been probed and was correctly refused. It is not: `elif` swallowed
 * its segment exactly as `if` did, and so did `for`, `case`, `esac`, `done`, `fi`
 * and `function`. Extending the splitter with three names would have left the
 * rest open, which is why this scans the segment instead.
 */
const COMMAND_INTRODUCING_KEYWORDS = new Set([
  // `! cmd` negates cmd's exit status — cmd is still run. Leaving `!` out would
  // turn `! touch /tmp/x` from mutating into runnable now that keywords are
  // resolved before the command-name test that used to catch it.
  "!",
  "if",
  "elif",
  "while",
  "until",
  "then",
  "else",
  "do",
]);

/**
 * `git` flags that take a SEPARATE operand. The operand is not the subcommand,
 * and reading it as one is what let `git -C log push origin main` resolve to
 * `git:log` — an allow-listed read — and execute a push (BUG-6 #7).
 */
const GIT_FLAGS_WITH_OPERAND = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--exec-path",
  "--config-env",
  "--super-prefix",
]);

/**
 * The subcommand of one `git` invocation, skipping global flags and the operands
 * they consume. Returns null when the invocation names no subcommand at all.
 */
function gitSubcommand(tokensAfterGit) {
  for (let i = 0; i < tokensAfterGit.length; i += 1) {
    const tok = tokensAfterGit[i];
    if (tok === "") continue;
    if (GIT_FLAGS_WITH_OPERAND.has(tok)) {
      i += 1; // the operand belongs to the flag, never to command position
      continue;
    }
    if (tok.startsWith("-")) continue; // valueless flag, or --key=value
    // Return whatever sits in subcommand position, even if it is not a plain
    // lowercase word. An unreadable subcommand must reach the allow-list check as
    // itself and be refused, not be silently skipped in favour of a later token.
    return tok;
  }
  return null;
}

/** The leading word of every simple command in the block. */
export function commandWords(code) {
  const stripped = stripNonCode(code)
    // Backslash line-continuations join one command across several lines. Splitting
    // on the raw newline first makes the continuation's tail look like a fresh
    // command: `git log ... -- \` + `apps packages` reported `apps` as a command.
    .replace(/\\\n/g, " ")
    // Arithmetic expansion is arithmetic, not an invocation. It must go before the
    // `$(` rule below, or `$((N + 1))` becomes a segment whose first token is `N`.
    .replace(/\$\(\([^)]*\)\)/g, " ")
    // Command substitutions and subshells: turn the delimiters into segment
    // breaks so the INNER command is scanned as a command rather than being
    // swallowed by the enclosing assignment. Without this,
    // `P=$(git remote get-url origin)` skips `P=$(git` as an assignment and then
    // reads `remote` as the command.
    .replace(/\$\(/g, "\n")
    // CR-8: process substitution `<(…)` / `>(…)` keeps the inner command glued to
    // the outer segment's tail, and only the first token of a segment is examined
    // — so `cat <(touch /tmp/x)` saw only `cat`.
    .replace(/[<>]\(/g, "\n")
    .replace(/`/g, "\n");
  // NOTE: a bare `)` is deliberately NOT turned into a segment break. It used to
  // be, and that erased the one signal distinguishing a `case` arm pattern
  // (`*://*/pull/*)`) from an obfuscated command name (`/usr/bin/[t]ouch`) — both
  // are globs, and without the trailing `)` there is nothing to tell them apart.
  // The `$(`/`<(` rules above already put every substituted command at the START
  // of its own segment, so the closing paren only ever lands on a trailing
  // argument, where it is harmless.
  const words = [];
  // Split on anything that can begin a new simple command.
  // Deliberately NOT split on `{` or `(`: `echo {task-id}` would then yield
  // `task-id}` as a command word, and the fail-closed rule would report a
  // templated block as an unrecognised command. Grouping characters are stripped
  // as prefixes below instead.
  const segments = stripped.split(
    // `&` splits a background or AND-list, but `>&` / `<&` is descriptor
    // duplication — splitting there left the file descriptor (the `1` in `2>&1`)
    // sitting in command position, where the fail-closed rule then refused it.
    /(?:\n|;|\|\||&&|\||(?<![<>])&|\bdo\b|\bthen\b|\belse\b)/,
  );

  let inCase = false;
  for (const seg of segments) {
    const trimmed = seg.trim().replace(/^[({\s]+/, "");
    if (!trimmed) continue;
    if (/^case\b/.test(trimmed)) inCase = true;
    if (/^esac\b/.test(trimmed)) inCase = false;
    // Whether the NEXT token examined sits in command position. A segment starts
    // in command position; a keyword either keeps it there or ends the scan.
    let inCommandPosition = true;
    const toks = trimmed.split(/\s+/);
    for (let ti = 0; ti < toks.length; ti += 1) {
      let tok = toks[ti];
      // Leading `VAR=value` assignments and redirections precede the command.
      if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tok)) continue;
      if (/^[<>]/.test(tok) || /^\d+[<>]/.test(tok)) continue;
      if (tok === "") continue;
      // A `case` arm pattern is the ONE token in command position that is not an
      // invocation. It is recognisable only by its trailing `)`, which is why the
      // stripper above no longer erases it. The arm's BODY follows on the same
      // segment, so command position resumes after it rather than ending — that
      // is what stops `case x in a) touch /tmp/x;; esac` from hiding the `touch`
      // (BUG-6, the `case` member of root cause A's keyword family).
      if (inCase && /\)$/.test(tok)) {
        inCommandPosition = true;
        continue;
      }
      if (!inCommandPosition) continue;

      // Unquote the way a shell does before deciding what the command IS.
      // `who'am'i`, `to"u"ch` and `t\ouch` are all spellings of one binary, and a
      // scanner that reads them as unparseable-therefore-absent is a scanner an
      // attacker only has to add one quote to defeat. Verified: all three
      // executed under the previous version.
      let word = tok.replace(/\\(.)/g, "$1").replace(/['"]/g, "");

      // `((expr))` and `[[expr]]` written without spaces arrive as ONE token that
      // cannot be a command name. Spaced, they tokenise as the `((`/`[[` keywords
      // and are handled below; glued, fail-closed would refuse a read-only
      // arithmetic test. A token carrying `$(` or a backtick is NOT exempted —
      // `((a+$(touch /tmp/x)))` must still reach the fail-closed path.
      if (/^(?:\(\(|\[\[)/.test(tok) && !/[$`]/.test(tok)) {
        inCommandPosition = false;
        continue;
      }

      // Keywords are resolved BEFORE the command-name test, because several of
      // them (`[`, `[[`, `!`, `{`) cannot look like a command name and would
      // otherwise be reported as an unreadable command position. That was
      // harmless only while the scan stopped at a segment's first token; now that
      // it continues past `if`, the `[` of `if [ -n "$N" ]; then …` reaches this
      // point and must be read as the test builtin it is.
      if (SHELL_KEYWORDS.has(word)) {
        // A keyword is never an invocation, so it is never pushed. What matters
        // is whether a command can follow it in the SAME segment — see
        // COMMAND_INTRODUCING_KEYWORDS.
        inCommandPosition = COMMAND_INTRODUCING_KEYWORDS.has(word);
        continue;
      }

      if (!COMMAND_NAME.test(word)) {
        // Everything still unreadable in command position is UNSAFE, not absent.
        // A tilde path, a glob that expands to a binary (`/usr/bin/[t]ouch`), a
        // variable command name — the scanner cannot say what any of them runs,
        // and "cannot say" must never resolve to "safe".
        words.push("<unparseable>");
        break;
      }
      tok = word;
      if (tok === "git") {
        // Carry THIS invocation's subcommand. Resolving `git` against the first
        // `git …` in the whole block instead fails OPEN: a block opening with
        // `git rev-parse` would license a later `git checkout` in the same block.
        // Slice from AFTER THIS `git` token. Slicing from the segment's second
        // token was correct only while the scan always stopped at the segment's
        // first token; now that it continues past keywords and `case` arms, `git`
        // is frequently not token 0. `if git status` then resolved to `git:git`
        // and was refused, and `case log in log) git checkout -- . ;; esac`
        // resolved to the allow-listed `git:log` and RAN — a fail-open.
        const rest = gitSubcommand(toks.slice(ti + 1));
        words.push(rest ? `git:${rest}` : "git");
      } else {
        words.push(tok);
      }
      break; // the command word of this segment is found
    }
  }
  return words;
}

/** Variables the block reads but never assigns. */
export function unboundVariables(code, bindings) {
  const stripped = code
    .split("\n")
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");

  const assigned = new Set();
  for (const m of stripped.matchAll(/(?:^|\s|;)([A-Za-z_][A-Za-z0-9_]*)=/g))
    assigned.add(m[1]);
  for (const m of stripped.matchAll(/\bfor\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\b/g))
    assigned.add(m[1]);
  for (const m of stripped.matchAll(
    /\bread\s+(?:-\S+\s+)*([A-Za-z_][A-Za-z0-9_]*)/g,
  ))
    assigned.add(m[1]);

  const read = new Set();
  for (const m of stripped.matchAll(/\$\{?([A-Za-z_][A-Za-z0-9_]*)/g))
    read.add(m[1]);

  return [...read].filter(
    (v) => !assigned.has(v) && !IMPLICIT_VARS.has(v) && !(v in bindings),
  );
}

/**
 * Exactly one of: runnable | placeholder | mutating.
 * Order matters — `mutating` is decided before `placeholder`, so a block that is
 * both templated and dangerous is reported by its dangerous property.
 */
export function classifyBlock(code, bindings = {}) {
  // Scan prose-stripped code, not raw: a heredoc body or a comment that merely
  // MENTIONS `git push` is documentation. Scanning raw text would classify a doc
  // for its own examples and skip a block that is in fact safe to run.
  const prose = stripProse(code);

  for (const [re, name] of DENY_PATTERNS) {
    if (re.test(prose))
      return { klass: "mutating", reason: `deny-list: ${name}` };
  }

  if (hasOutputFlagWrite(prose)) {
    return { klass: "mutating", reason: "deny-list: -o output flag" };
  }

  // CR-1 — a write redirection makes any command mutating, allow-listed or not.
  if (WRITE_REDIRECT.test(blankConditionalSpans(stripNonCode(code)))) {
    return { klass: "mutating", reason: "write-redirection" };
  }

  // `command -v X` / `command -V X` is a pure lookup: it prints a path and runs
  // nothing. Bare `command X` runs X, so the exception is anchored to the flag and
  // nothing else. Without it the repository's own documented zsh guard
  // (`command -v zsh >/dev/null`) is unrunnable by the gate that recommends it.
  const codeForScan = stripNonCode(code).replace(
    /\bcommand\s+-[vV]\b/g,
    "true",
  );

  const unknown = commandWords(codeForScan).filter((w) => {
    if (COMMAND_RUNNERS.has(w)) return true; // CR-5/CR-6 — before the allow-list
    if (SHELL_KEYWORDS.has(w)) return false;
    if (SAFE_COMMANDS.has(w)) return false;
    if (w.startsWith("git:")) return !SAFE_GIT_SUBCOMMANDS.has(w.slice(4));
    return true;
  });

  if (unknown.length > 0) {
    return {
      klass: "mutating",
      reason: `unrecognised-command: ${[...new Set(unknown.map((w) => w.replace(":", " ")))].join(", ")} (fail-closed)`,
    };
  }

  // Same reasoning for template slots.
  for (const re of PLACEHOLDER_PATTERNS) {
    if (re.test(prose))
      return { klass: "placeholder", reason: "template slot" };
  }

  const unbound = unboundVariables(code, bindings);
  if (unbound.length > 0) {
    return {
      klass: "placeholder",
      reason: `unbound-variable: ${unbound.join(", ")}`,
    };
  }

  return { klass: "runnable", reason: null };
}

// ── Dual-shell execution ──────────────────────────────────────────────────────

let ZSH_AVAILABLE = null;

/** Memoised — this used to spawn a subprocess on every call, including once per
 *  `{ skip: !zshAvailable() }` predicate in the test suite. */
export function zshAvailable() {
  if (ZSH_AVAILABLE === null) {
    const r = spawnSync("command", ["-v", "zsh"], {
      shell: "/bin/bash",
      encoding: "utf8",
    });
    ZSH_AVAILABLE = r.status === 0;
  }
  return ZSH_AVAILABLE;
}

/**
 * Run one block under each shell and compare.
 *
 * stdout is the load-bearing comparison, NOT exit status. The defect this whole
 * mechanism exists for exits 1 under both shells and differs only in what it
 * printed — comparing status alone would have missed it.
 */
/**
 * Recursive listing of `dir` as `relative path -> mtimeMs:size`.
 *
 * The containment check below compares two of these. It is deliberately cheap and
 * deliberately NOT a substitute for classification — see `runBlock`.
 */
function snapshotTree(dir, skipDir = null) {
  const out = new Map();
  const walk = (d, prefix) => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      const abs = `${d}/${e.name}`;
      // Do not descend into the working copy. Writes there are expected, and a
      // large `--copy` would otherwise be walked twice per block — turning a
      // safety net into the run's dominant cost.
      if (rel === skipDir) continue;
      if (e.isDirectory()) {
        walk(abs, rel);
        continue;
      }
      try {
        const st = statSync(abs);
        out.set(rel, `${st.mtimeMs}:${st.size}`);
      } catch {
        /* raced */
      }
    }
  };
  walk(dir, "");
  return out;
}

export function runBlock(
  code,
  { shells, cwd, timeout = 10_000, bindings = {}, sandboxRoot = null } = {},
) {
  // CR-12 — a minimal environment, not the parent's. Spreading `process.env`
  // handed every snippet GITHUB_TOKEN and tracker credentials, contradicting this
  // file's own claim that the execution environment carries none. Inherited PWD
  // also disagreed with `cwd`, which can manufacture disagreement noise by itself.
  const env = {
    PATH: process.env.PATH ?? "",
    HOME: process.env.HOME ?? "",
    LANG: process.env.LANG ?? "C",
    TERM: "dumb",
    TMPDIR: process.env.TMPDIR ?? "/tmp",
    PWD: cwd ?? process.cwd(),
    ...bindings,
  };
  const runs = {};

  // Defence in depth. Classification is the first line and it has been wrong
  // before — thirteen ways, found in one review. This is the second line: watch a
  // canary directory beside the working copy and report any block that reaches
  // outside its sandbox, whatever the classifier concluded.
  // The sentinel engages only when the caller names the sandbox root explicitly.
  //
  // Deriving it as `${cwd}/..` was wrong and expensive: `runBlock` accepts any
  // cwd, so a bare temp directory made the sentinel walk the whole of /tmp twice
  // per block — it hung the test suite for two minutes before being killed. A
  // safety net that guesses its own boundary is not a safety net.
  const sentinelRoot = sandboxRoot;
  const workDirName = sentinelRoot && cwd ? cwd.split("/").pop() : null;
  const before = sentinelRoot ? snapshotTree(sentinelRoot, workDirName) : null;

  for (const shell of shells) {
    const r = spawnSync(shell, ["-c", code], {
      cwd,
      timeout,
      encoding: "utf8",
      env,
    });
    runs[shell] = {
      stdout: (r.stdout ?? "").replace(/\n+$/, ""),
      stderr: (r.stderr ?? "").replace(/\n+$/, ""),
      status: r.status,
      // Node sets `error.code = "ETIMEDOUT"` on a timeout, and that is sufficient.
      // Also testing `signal === "SIGTERM"` mislabelled any block that terminates
      // itself (`kill -TERM $$`) as a timeout, at high confidence.
      timedOut: r.error?.code === "ETIMEDOUT",
    };
  }

  const findings = [];

  // A failure that reproduces identically in every shell is not a portability
  // defect — it is a block that needs a context this gate did not supply, or a
  // snippet that is simply broken. The confidence stays `high` per the rule, but
  // saying so in the detail is what lets a reviewer triage it in one read
  // instead of re-running it by hand.
  const statuses = shells.map((sh) => runs[sh].status);
  const stdouts = shells.map((sh) => runs[sh].stdout);
  const consistent =
    shells.length > 1 &&
    statuses.every((x) => x === statuses[0]) &&
    stdouts.every((x) => x === stdouts[0]);

  for (const shell of shells) {
    const run = runs[shell];
    if (run.timedOut) {
      findings.push({
        kind: "execution-timeout",
        shell,
        confidence: "high",
        detail: `${shell} exceeded ${timeout}ms`,
      });
    } else if (run.status !== 0) {
      findings.push({
        kind: "execution-failure",
        shell,
        confidence: "high",
        detail:
          `${shell} exited ${run.status}` +
          (run.stderr ? `: ${run.stderr.split("\n")[0]}` : "") +
          (consistent
            ? " (identical in every shell — not a portability defect)"
            : ""),
      });
    }
  }

  if (before) {
    const after = snapshotTree(sentinelRoot, workDirName);
    const outside = [];
    for (const [k, v] of after) if (before.get(k) !== v) outside.push(k);
    for (const k of before.keys())
      if (!after.has(k)) outside.push(`${k} (removed)`);
    if (outside.length > 0) {
      findings.push({
        kind: "escaped-sandbox",
        confidence: "high",
        detail:
          `a block classified runnable wrote outside its working copy: ` +
          `${outside.slice(0, 5).join(", ")}${outside.length > 5 ? ` (+${outside.length - 5} more)` : ""}`,
      });
    }
  }

  if (shells.length > 1) {
    const [a, b] = shells;
    if (runs[a].stdout !== runs[b].stdout) {
      findings.push({
        kind: "shell-disagreement",
        confidence: "medium",
        detail:
          `${a} printed ${runs[a].stdout === "" ? 0 : runs[a].stdout.split("\n").length} line(s), ` +
          `${b} printed ${runs[b].stdout === "" ? 0 : runs[b].stdout.split("\n").length} line(s)`,
      });
    }
  }

  return { runs, findings };
}

// ── File-level orchestration ──────────────────────────────────────────────────

export function executeFile(filePath, opts = {}) {
  const {
    bindings = {},
    timeout = 10_000,
    copyFrom = null,
    allowZsh = true,
  } = opts;

  const markdown = readFileSync(filePath, "utf8");
  const blocks = extractBlocks(markdown);

  const useZsh = allowZsh && zshAvailable();
  const shells = useZsh ? ["bash", "zsh"] : ["bash"];

  // CR-11 — `cpSync` used to sit outside the try, so a bad `--copy` threw with the
  // temp directory already created and never removed. `main` swallowed it into
  // exit 2, so the leak was silent and repeated every run.
  //
  // The sandbox is a directory INSIDE the temp root, so the root can act as the
  // containment sentinel in `runBlock`.
  const tmpRoot = mkdtempSync(join(tmpdir(), "qa-snippets-"));
  const tmp = join(tmpRoot, "work");

  const results = [];
  const findings = [];

  try {
    mkdirSync(tmp, { recursive: true });
    if (copyFrom) cpSync(copyFrom, tmp, { recursive: true });
    for (const block of blocks) {
      const { klass, reason } = classifyBlock(block.code, bindings);
      if (klass !== "runnable") {
        results.push({ line: block.line, klass, reason, skipped: true });
        continue;
      }
      const { runs, findings: blockFindings } = runBlock(block.code, {
        shells,
        cwd: tmp,
        timeout,
        bindings,
        sandboxRoot: tmpRoot,
      });
      results.push({
        line: block.line,
        klass,
        reason: null,
        skipped: false,
        runs,
      });
      for (const f of blockFindings) findings.push({ ...f, line: block.line });
    }
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }

  const counts = { runnable: 0, placeholder: 0, mutating: 0 };
  for (const r of results) counts[r.klass]++;

  // A run where zero blocks executed is itself a finding — this is the rule's
  // own failure mode, and it is exactly the silent skip the step exists to stop.
  // zsh being absent never reduces the runnable count, so the guard cannot trip it.
  if (blocks.length > 0 && counts.runnable === 0) {
    // `medium`, deliberately. This is a statement about COVERAGE — the gate did
    // nothing here — not a defect in the work item, and `high` + `category: bug`
    // is what makes a finding gate-blocking. A skill whose snippets all read
    // caller variables would otherwise block its own PR for needing bindings the
    // run did not supply, which is the "noise trains reviewers to ignore it"
    // failure the rule warns about. It is still reported, which is what "a
    // finding, not a pass" requires.
    findings.push({
      kind: "zero-blocks-executed",
      confidence: "medium",
      detail:
        `${blocks.length} bash block(s) found, none classified runnable ` +
        `(${counts.placeholder} placeholder, ${counts.mutating} mutating)` +
        (counts.placeholder > 0
          ? " — supply the missing values with --bind to execute the placeholder blocks"
          : ""),
    });
  }

  return {
    file: filePath,
    shells,
    zshAvailable: useZsh,
    zshSkipReason:
      allowZsh && !useZsh ? "zsh-unavailable" : allowZsh ? null : "disabled",
    blocks: blocks.length,
    counts,
    results,
    findings,
  };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const USAGE =
  "Usage: qa-execute-snippets --file <path.md> [--bind NAME=VALUE]... " +
  "[--copy <dir>] [--timeout <ms>] [--no-zsh] [--json]";

export function main(argv = process.argv.slice(2)) {
  let file = null;
  let copyFrom = null;
  let timeout = 10_000;
  let allowZsh = true;
  let json = false;
  const bindings = {};

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--file":
        file = argv[++i];
        break;
      case "--copy":
        copyFrom = argv[++i];
        break;
      case "--timeout": {
        // Unvalidated, `--timeout abc` yielded NaN and `--timeout -1` a negative;
        // spawnSync applies NO timeout for either, so a typo silently disabled the
        // hang protection.
        const t = Number(argv[++i]);
        if (!Number.isFinite(t) || t <= 0)
          return {
            exitCode: 2,
            error: `bad --timeout: must be a positive number`,
          };
        timeout = t;
        break;
      }
      case "--no-zsh":
        allowZsh = false;
        break;
      case "--json":
        json = true;
        break;
      case "--bind": {
        const pair = argv[++i] ?? "";
        const eq = pair.indexOf("=");
        if (eq < 1)
          return {
            exitCode: 2,
            error: `bad --bind (want NAME=VALUE): ${pair}`,
          };
        bindings[pair.slice(0, eq)] = pair.slice(eq + 1);
        break;
      }
      case "-h":
      case "--help":
        return { exitCode: 0, usage: USAGE };
      default:
        return { exitCode: 2, error: `unknown argument: ${argv[i]}` };
    }
  }

  if (!file) return { exitCode: 2, error: `--file is required\n${USAGE}` };

  let report;
  try {
    report = executeFile(file, { bindings, timeout, copyFrom, allowZsh });
  } catch (e) {
    return { exitCode: 2, error: e.message };
  }

  return { exitCode: report.findings.length > 0 ? 1 : 0, report, json };
}

function render(report) {
  const lines = [`Snippet execution — ${report.file}`, ""];
  lines.push(
    `  ${report.blocks} bash block(s): ` +
      `${report.counts.runnable} runnable, ${report.counts.placeholder} placeholder, ` +
      `${report.counts.mutating} mutating`,
  );
  lines.push(
    `  shells: ${report.shells.join(", ")}${report.zshAvailable ? "" : "  (zsh-unavailable)"}`,
  );
  lines.push("");
  for (const r of report.results.filter((x) => x.skipped)) {
    lines.push(`  SKIP  line ${r.line}  ${r.klass} — ${r.reason}`);
  }
  if (report.findings.length === 0) {
    lines.push("", "  No findings.");
  } else {
    lines.push("");
    for (const f of report.findings) {
      lines.push(
        `  ${f.kind}  ${f.line ? `line ${f.line}  ` : ""}[${f.confidence}] ${f.detail}`,
      );
    }
  }
  return lines.join("\n");
}

// Resolve BOTH sides through realpath: `.agents/skills` and `.claude/skills` are
// symlinks to `../skills`, here and in every consumer install, so argv[1] arrives
// symlinked while import.meta.url is already real. Comparing them raw makes this
// guard false and main() never runs: exit 0, no output — indistinguishable from a
// clean run with nothing to report, which is precisely the silent-pass this engine
// exists to catch. Falls back to the plain comparison if realpath throws
// (deleted/unreadable path). See bug.4.snippet-engine-symlink-noop.
function isInvokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return (
      realpathSync(process.argv[1]) ===
      realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  }
}

if (isInvokedDirectly()) {
  const r = main();
  // `process.exitCode` + else-if, never `process.exit()`: stdio is ASYNCHRONOUS
  // on a pipe, and `process.exit()` tears the process down before the buffer
  // drains, truncating output at ~64KB. The --json report scales with the
  // number of snippets, so the QA gate — the one caller that always pipes —
  // is exactly what a truncating write breaks.
  // See bug.3.stdout-truncation-on-exit.
  process.exitCode = r.exitCode;
  if (r.error) {
    console.error(r.error);
  } else if (r.usage) {
    console.log(r.usage);
  } else {
    console.log(r.json ? JSON.stringify(r.report, null, 2) : render(r.report));
  }
}
