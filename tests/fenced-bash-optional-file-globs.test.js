"use strict";
/**
 * Optional-file glob ratchet — a fenced bash block that looks for a file that
 * may not exist must not do it with `ls <dir>/<glob> 2>/dev/null`.
 *
 * WHY THIS EXISTS (obs #144)
 * ---------------------------
 * bash and zsh disagree about a glob that matches nothing: bash passes it to
 * `ls`, which fails quietly under `2>/dev/null`; zsh's default NOMATCH aborts
 * the WHOLE command before `ls` runs, prints its own error, and leaves the
 * `$(…)` empty — and a `… | wc -l` never runs, so the count is empty, not 0.
 * The Claude Code Bash tool runs the user's shell, which on macOS is zsh, so the
 * blocks agents execute are zsh blocks. On task.125 two globs for two filename
 * shapes — one always absent — would have HALTed every bug run under zsh; the
 * fix is `find <dir> -maxdepth 1 -name "<pattern>"` with the pattern quoted,
 * which is identical in both shells. Rule: create-skill § "An optional file is
 * found with `find -name`, never a bare glob".
 *
 * A RATCHET, NOT AN ALLOW-LIST
 * ----------------------------
 * The corpus carried N such sites when this guard was written. They are pinned
 * below so the guard is green on install and RED ON ANY NEW SITE — and red when a
 * pinned site disappears, so the pin is deleted with the fix and the ratchet only
 * ever tightens. Rewriting the pinned sites is the follow-up obs #144 carries.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");

// `file :: normalised line` — the inventory at the time the ratchet was set.
const KNOWN = new Set([
  // Empty since task.137 swept the 29 sites obs #144 pinned (2026-09-21). A new
  // pin is the shape a pinned line took: "<file> :: <trimmed line>". Prefer the
  // fix to the pin.
]);

// an `ls` whose argument list carries an UNQUOTED glob star, with stderr silenced —
// the optional-file shape. A quoted pattern (`-name "x.*"`) does not match.
const SHAPE = /(^|[\s$(])ls\s[^|\n]*[^"'\s]\*[^|\n]*2>\/dev\/null/;

function scan() {
  const files = [
    ...fs
      .readdirSync(path.join(REPO_ROOT, "skills"))
      .map((s) => `skills/${s}/SKILL.md`)
      .filter((f) => fs.existsSync(path.join(REPO_ROOT, f))),
    ...fs
      .readdirSync(path.join(REPO_ROOT, "shared/resources"))
      .filter((f) => f.endsWith(".md"))
      .map((f) => `shared/resources/${f}`),
  ];
  const hits = new Set();
  for (const rel of files) {
    const text = fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
    for (const m of text.matchAll(/```(?:bash|sh)\n([\s\S]*?)```/g)) {
      for (const raw of m[1].split("\n")) {
        const line = raw.trim();
        if (/^#/.test(line)) continue;
        // an `ls` whose argument list carries an UNQUOTED glob star, with stderr silenced —
        // the optional-file shape. A quoted pattern (`-name "x.*"`) does not match.
        if (SHAPE.test(line)) {
          hits.add(`${rel} :: ${line.replace(/\s+/g, " ")}`);
        }
      }
    }
  }
  return hits;
}

test('no NEW ls-over-glob optional-file lookup in fenced bash — use find -maxdepth 1 -name "<pattern>" (obs #144)', () => {
  const hits = scan();
  const added = [...hits].filter((h) => !KNOWN.has(h));
  assert.deepEqual(
    added,
    [],
    `new optional-file glob site(s) — an unmatched glob aborts the command under zsh; use find -maxdepth 1 -name "<pattern>" (quoted):\n  ${added.join("\n  ")}`,
  );
});

test("the scan still recognises the shape it guards against (non-vacuity on the instrument, not the inventory)", () => {
  // With KNOWN empty a broken regex would report a clean tree. Feed the matcher
  // the exact line that opened obs #144 and one `find -name` rewrite.
  const bad =
    "PRIOR_GATES=$(ls \"$TASK_DIR\"/task.*.gate.*.yml 2>/dev/null | wc -l | tr -d ' ')";
  const good =
    'PRIOR_GATES=$(find "$TASK_DIR" -maxdepth 1 -name "task.*.gate.*.yml" 2>/dev/null | wc -l)';
  assert.ok(SHAPE.test(bad), "the matcher must flag the ls-over-glob shape");
  assert.ok(!SHAPE.test(good), "the matcher must not flag a quoted find -name");
});

test("the ratchet only tightens — a pinned site that is gone is deleted from KNOWN with its fix", () => {
  const hits = scan();
  const gone = [...KNOWN].filter((k) => !hits.has(k));
  assert.deepEqual(
    gone,
    [],
    `pinned site(s) no longer present — remove them from KNOWN so the ratchet cannot loosen back:\n  ${gone.join("\n  ")}`,
  );
});
