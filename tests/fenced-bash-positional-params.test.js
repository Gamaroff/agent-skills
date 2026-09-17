"use strict";
/**
 * Fenced-bash positional-parameter guard — a runnable block in an INVOKED
 * `SKILL.md` must not carry a shell positional-parameter token (`$0`–`$9`).
 *
 * WHY THIS EXISTS
 * ---------------
 * The harness substitutes `$0`–`$9` in a `SKILL.md`'s body when the skill is
 * invoked with arguments — inside fenced code as readily as in prose. The
 * delivered copy is therefore not the file on disk, and every other check in
 * this repository reads the file on disk. Observation #23 saw
 * `match($0, /^[[:space:]]*​/)` reach an agent as
 * `match(docs/tasks/task.82…/task.82….md, /^[[:space:]]*​/)` — eight
 * substitutions in one awk program, silent failure, every gate green.
 *
 * WHAT PHASE 0 OF task.119 ESTABLISHED (empirically, 2026-09-17, Claude Code
 * 2.1.274, three throwaway skills invoked with 1–3 arguments)
 * ----------------------------------------------------------------------------
 *   (a) SCOPE. Only the invoked `SKILL.md` is rendered. A sibling reference
 *       loaded with the Read tool (`references/probe.md` carrying `$0 $1 $2`)
 *       arrived verbatim. So the scope below is `skills/*​/SKILL.md` ONLY —
 *       not `shared/resources/*.md` and never the generated
 *       `skills/*​/references/` copies, which are Read-loaded and safe.
 *   (b) INDEXING. Substitution is ZERO-indexed from the argument list:
 *       `$0` → first argument, `$1` → second. A token past the argument count
 *       is left literal (`/skill one` renders `$0 $1` as `one $1`). This is why
 *       `awk '{print $2}'` sites — the bulk of the corpus — never bit: almost
 *       every skill is invoked with one argument, so only `$0` is ever touched.
 *       The hazard is real on any skill that can take two or more.
 *   (c) ESCAPE. A backslash escape survives rendering: `\$0` arrives as `$0`
 *       (backslash consumed, token untouched). BUT the on-disk form is then not
 *       runnable where the token sits in awk program text — `awk '{print \$2}'`
 *       is a syntax error in BSD awk and zsh alike — so an escape is
 *       delivery-safe and disk-unsafe. It is tolerated by the regex's
 *       lookbehind, and the authoring rule (create-skill § Runnable prose)
 *       reserves it for bash double-quoted strings, where `\$` is ordinary
 *       shell syntax.
 *   (d) SAFE FORMS. Braced and parenthesised forms are NOT substituted and ARE
 *       runnable from disk: `${1}` in bash (`echo "${0} ${1}"` arrived intact),
 *       `$(2)` in awk (`{print $(2)}` prints field 2 — verified against
 *       `{print $2}` on the same input). `${BASH_SOURCE[0]}` also survives.
 *       These are the preferred rewrites, in that order of preference; the
 *       implicit awk forms (a bare `/re/` tests `$0`, `length` with no argument
 *       is its length) are better still where they fit.
 *
 * AUTHORING-TIME HIT COUNT (recorded here, not in the task document, because a
 * number in prose decays): the first run of this scan over 485 fenced
 * bash/sh/shell blocks in 128 `SKILL.md` files found 22 hits in 12 files —
 * 19 × `awk '{print $2}'`, one `PR_NUMBER=$1; …=$4` script header, one
 * `$(dirname "$0")`, one `$20` in a comment. All 22 were rewritten to a safe
 * form in task.119; the allowlist below is therefore empty at authoring time
 * and every entry added later must carry a reason.
 *
 * SHAPE. Same allowlist-with-reason and non-vacuity discipline as
 * tests/mutation-call-site-coverage.test.js: an allowlist entry names
 * file + line + reason, a stale entry (file gone, or line no longer carrying a
 * token) fails, and the scan must cover at least MIN_BLOCKS blocks — a scan
 * that found nothing because it read nothing is the one clean answer nobody
 * questions.
 *
 * Deterministic and fast — runs every push via `npm test` (tests/*.test.js).
 * Run: node --test tests/fenced-bash-positional-params.test.js
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const REPO_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(REPO_ROOT, "skills");

/** Info strings that mark a block an agent is expected to copy and run. */
const RUNNABLE_LANGS = new Set(["bash", "sh", "shell"]);

/**
 * A positional-parameter token, unescaped. The lookbehind tolerates `\$N`
 * because Phase 0 (c) showed the escape survives rendering; see the header
 * for why it is tolerated rather than recommended.
 */
const POSITIONAL_RE = /(?<!\\)\$[0-9]/g;

/**
 * Non-vacuity floor. 485 blocks at authoring time; a scan that covers fewer
 * than this has lost its inputs (a moved skills directory, a fence parser
 * that stopped matching) and must not report a clean zero.
 */
const MIN_BLOCKS = 50;

/**
 * Sites where a positional token is genuinely unavoidable. Each entry names
 * the file (repo-relative), the 1-based line, and a reason a reviewer can
 * check. Empty at authoring time — every hit had a token-free equivalent.
 *
 * @type {Array<{file: string, line: number, reason: string}>}
 */
const ALLOWLIST = [];

/**
 * Extract fenced blocks with a runnable info string from a Markdown file.
 * Returns one entry per LINE inside such a block, with its 1-based line
 * number, so a hit can be reported at the line rather than the block.
 *
 * NESTING. This is deliberately NOT a CommonMark parser. Skills embed
 * templates — a ```markdown or ````markdown block whose body carries its own
 * ```mermaid / ```bash fences — and the harness renders the whole file, so a
 * token inside a nested ```bash is substituted exactly as one at the top level
 * would be. A CommonMark reader closes the outer template at the first bare
 * fence, inverts fence state for the rest of the file, and never sees the real
 * top-level ```bash that follows (QA cycle 1 of task.119, CR-1: mermaid-architect
 * 1 → 0 blocks scanned, create-epics-from-shards 2 → 0, create-parallel-stories
 * 13 → 9, qa-story 16 → 15). So fences are tracked as a STACK: a fence line
 * with an info string pushes; a bare fence line pops the top entry when its
 * marker char matches and its length is at least the top's. A line is scanned
 * when the top of the stack is a runnable fence, wherever it sits.
 */
function runnableLines(markdown) {
  const out = [];
  const lines = markdown.split("\n");
  const stack = []; // [{ marker, lang }] — innermost last
  let blocks = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^\s*(`{3,}|~{3,})\s*([\w+.-]*)/);
    const top = stack[stack.length - 1];
    const inRunnable = Boolean(top && RUNNABLE_LANGS.has(top.lang));
    // An info-string fence opens a nested block — unless we are already inside a
    // RUNNABLE block, where a fence-shaped line is shell content (a heredoc
    // writing a Markdown file, say) and must be scanned rather than pushed
    // (QA cycle 2, CR-5). Only a bare closer ends a runnable block.
    if (m && m[2] !== "" && !inRunnable) {
      const lang = m[2].toLowerCase();
      stack.push({ marker: m[1], lang });
      if (RUNNABLE_LANGS.has(lang)) blocks++;
      continue;
    }
    if (
      m &&
      m[2] === "" &&
      top &&
      m[1][0] === top.marker[0] &&
      m[1].length >= top.marker.length
    ) {
      stack.pop();
      continue;
    }
    if (inRunnable) out.push({ line: i + 1, text: line });
  }
  return { lines: out, blocks };
}

function skillFiles() {
  return fs
    .readdirSync(SKILLS_DIR)
    .filter((d) => fs.existsSync(path.join(SKILLS_DIR, d, "SKILL.md")))
    .map((d) => path.join("skills", d, "SKILL.md"))
    .sort();
}

function scan() {
  const hits = [];
  let blocks = 0;
  for (const rel of skillFiles()) {
    const md = fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
    const r = runnableLines(md);
    blocks += r.blocks;
    for (const { line, text } of r.lines) {
      const tokens = text.match(POSITIONAL_RE);
      if (tokens) hits.push({ file: rel, line, tokens, text: text.trim() });
    }
  }
  return { hits, blocks };
}

const isAllowed = (hit) =>
  ALLOWLIST.some((a) => a.file === hit.file && a.line === hit.line);

test("§1 the scan covers a non-vacuous number of runnable blocks", () => {
  const { blocks } = scan();
  assert.ok(
    blocks >= MIN_BLOCKS,
    `Scanned only ${blocks} fenced bash/sh/shell blocks (floor ${MIN_BLOCKS}) — ` +
      `the scan has lost its inputs; a clean zero from here would be vacuous.`,
  );
});

test("§2 no runnable SKILL.md block carries an unescaped $0–$9 token", () => {
  const { hits } = scan();
  const offenders = hits.filter((h) => !isAllowed(h));
  const lines = offenders.map(
    (h) =>
      `  ${h.file}:${h.line}  ${h.tokens.join(" ")}  ${h.text.slice(0, 100)}`,
  );
  assert.deepEqual(
    offenders,
    [],
    `Positional-parameter tokens in fenced bash — the harness substitutes these ` +
      `when the skill is invoked with arguments, so the delivered block is not the ` +
      `one on disk. Rewrite with a token-free form (bash: \${N}; awk: $(N), a bare ` +
      `/re/, length with no argument) or allowlist the line WITH A REASON. ` +
      `See create-skill § Runnable prose.\n${lines.join("\n")}`,
  );
});

test("§3 every allowlist entry still names a live hit and states a reason", () => {
  const { hits } = scan();
  const stale = [];
  for (const a of ALLOWLIST) {
    if (!fs.existsSync(path.join(REPO_ROOT, a.file))) {
      stale.push(
        `${a.file}:${a.line} — allowlisted but the file no longer exists`,
      );
      continue;
    }
    if (!hits.some((h) => h.file === a.file && h.line === a.line)) {
      stale.push(
        `${a.file}:${a.line} — allowlisted but that line carries no token any more`,
      );
    }
    if (!a.reason || a.reason.trim().split(/\s+/).length < 5) {
      stale.push(
        `${a.file}:${a.line} — an allowlist entry must state WHY, in a sentence a reviewer can check`,
      );
    }
  }
  assert.deepEqual(stale, [], `Stale allowlist entries:\n${stale.join("\n")}`);
});

test("§4 the fence parser sees tokens (self-check against a fixture string)", () => {
  // The guard's own instrument, exercised in-process: a hit inside a bash
  // fence, no hit in prose, no hit in a non-runnable fence, an escaped token
  // tolerated, and the braced/paren forms not flagged.
  const md = [
    "prose with $1 is fine",
    "```bash",
    'echo "$0 ${1} $(2)"',
    'echo "cost \\$5"',
    "```",
    "```js",
    "const x = `$1`;",
    "```",
    "~~~sh",
    "awk '{print $2}'",
    "~~~",
    // A template block embedding a nested fence (the CR-1 shape): the nested
    // ```bash is scanned, the bare ``` pops it and the outer template survives
    // the pop, and the REAL top-level ```bash after the template is scanned too.
    "```markdown",
    "# Template",
    "```mermaid",
    "graph TD",
    "```",
    "```bash",
    'echo "nested $3"',
    "```",
    "```",
    "```bash",
    'echo "after-template $4"',
    "```",
    // A four-backtick template whose three-backtick content fence must not
    // close it, and whose nested runnable fence is still scanned.
    "````markdown",
    "```bash",
    'echo "four-in-three $5"',
    "```",
    "````",
    "```bash",
    'echo "final $6"',
    "```",
    // A runnable block whose heredoc writes a Markdown file: the fence-shaped
    // lines inside it are shell content, so the token between them is scanned
    // and the block is closed only by its own (longer) bare closer.
    "````bash",
    "cat > out.md <<'EOF'",
    "```yaml",
    "name: $7",
    "```",
    "EOF",
    "````",
  ].join("\n");
  const r = runnableLines(md);
  assert.equal(r.blocks, 7);
  const flagged = r.lines
    .map((l) => ({ line: l.line, tokens: l.text.match(POSITIONAL_RE) }))
    .filter((l) => l.tokens);
  assert.deepEqual(flagged, [
    { line: 3, tokens: ["$0"] },
    { line: 10, tokens: ["$2"] },
    { line: 18, tokens: ["$3"] },
    { line: 22, tokens: ["$4"] },
    { line: 26, tokens: ["$5"] },
    { line: 30, tokens: ["$6"] },
    { line: 35, tokens: ["$7"] },
  ]);
});

test("§5 every runnable opener's content is scanned in the live tree (no fence-state loss)", () => {
  // Line-level, not count-level: for every line that opens a runnable fence,
  // the line after it — when it is not itself a fence line — must be among the
  // lines the reader scanned. A count of pushes cannot see fence-state loss
  // (QA cycle 2, CR-4: an earlier §5 compared opener counts, which the stack
  // reader matched by construction even with its pop rule removed); a missing
  // content line can.
  const OPENER = /^\s*(?:`{3,}|~{3,})\s*(?:bash|sh|shell)\b/i;
  const FENCE = /^\s*(?:`{3,}|~{3,})/;
  const misses = [];
  let openers = 0;
  for (const rel of skillFiles()) {
    const md = fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
    const src = md.split("\n");
    const scanned = new Set(runnableLines(md).lines.map((l) => l.line));
    for (let i = 0; i < src.length - 1; i++) {
      if (!OPENER.test(src[i])) continue;
      openers++;
      if (FENCE.test(src[i + 1])) continue; // an empty block, or a nested fence
      if (!scanned.has(i + 2))
        misses.push(
          `${rel}:${i + 2} — content after the opener at line ${i + 1} was not scanned`,
        );
    }
  }
  assert.ok(
    openers >= MIN_BLOCKS,
    `Only ${openers} runnable openers found (floor ${MIN_BLOCKS})`,
  );
  assert.deepEqual(misses, [], `Fence-state loss:\n${misses.join("\n")}`);
});

module.exports = { runnableLines, scan, POSITIONAL_RE, ALLOWLIST, MIN_BLOCKS };
