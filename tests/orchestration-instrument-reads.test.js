"use strict";
/**
 * Instrument-read guard — shipped orchestration prose reads a step's status and the
 * time from the instrument, never from the line that wraps it or from memory.
 *
 * task.299 (obs #164). On task.295 a background command written `cmd; echo exit=$?`
 * reported the exit code of the whole compound, so a notification said "exit 0" for
 * a run whose real step had failed; separately, `updated:` values typed into gate
 * files drifted from the real time. This test fails on a new shape of either.
 *
 * CLAIM, stated as a bounded set (obs #13). It catches exactly:
 *   (a) STATUS — an `echo` after `;`, `&&` or `||` whose arguments read `$?` or `${?}`
 *       (quoted or not, any name or none, followed or not by `; true` or a comment), and
 *       which does NOT redirect the echo (`>`, `>>`, `2>&1`): the echo's own exit status is
 *       what a background notification reports, so the value reaches the reader only as
 *       prose.
 *   (b) TIME — a time-of-day placeholder (`{… HH:MM …}`, `{timestamp}`, `{ISO-8601}`,
 *       `<ISO-8601>`, `HH:MMZ`) in a file that never names `date -u`, the instrument.
 * It knowingly does NOT see: a date-only placeholder (`{today}`, `{YYYY-MM-DD}`: the date
 * is in the session context); a time placeholder in a file that names `date -u` for a
 * different placeholder (file-level pairing, not line-level); a status wrapped in a form
 * other than `echo` (`printf`, `tee`); an echo on a line of its own, away from the command;
 * an echo whose output is redirected to stderr (`2>&1`), which counts as redirected; and any
 * file outside the population below, including a new source not yet tracked by git.
 *
 * POPULATION is derived, never listed: tracked `shared/resources/*.md` and
 * `skills/*\/SKILL.md`. The bundled copies under `skills/*\/references/` are excluded —
 * they are generated from `shared/resources/` and counted once with their source.
 *
 * Run: node --test tests/orchestration-instrument-reads.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");

// ── The two shapes ────────────────────────────────────────────────────────

// (a) an `echo` after `;`, `&&` or `||` whose arguments read `$?` (or `${?}`), with no `>` redirect
// among them. The arguments run to the next `;`, `&` or `|`, so a trailing `; true` or a trailing
// comment does not hide the echo, and the name before `=` is irrelevant.
const ECHO_AFTER_OPERATOR = /(?:;|&&|\|\|)\s*echo\s+([^;&|\n]*)/gi;
function wrappedStatus(line) {
  for (const m of line.matchAll(ECHO_AFTER_OPERATOR)) {
    if (/\$\{?\?\}?/.test(m[1]) && !m[1].includes(">")) return true;
  }
  return false;
}
// (b) a time-of-day placeholder.
const TIME_PLACEHOLDER =
  /\{[^}\n]*(?:HH:MM|HH:mm|ISO-8601|timestamp)[^}\n]*\}|<ISO-8601>|HH:MMZ/;
const INSTRUMENT = /date -u/;

/** Findings for one file's text: [{ line, rule, text }]. Pure, so fixtures can drive it. */
function scan(text) {
  const out = [];
  const lines = text.split("\n");
  lines.forEach((l, i) => {
    if (wrappedStatus(l))
      out.push({ line: i + 1, rule: "status", text: l.trim() });
  });
  if (!INSTRUMENT.test(text)) {
    lines.forEach((l, i) => {
      if (TIME_PLACEHOLDER.test(l))
        out.push({ line: i + 1, rule: "time", text: l.trim() });
    });
  }
  return out;
}

// ── Population ────────────────────────────────────────────────────────────

function population() {
  const files = execFileSync("git", ["ls-files", "-z"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
  return files.filter(
    (f) =>
      (/^shared\/resources\/[^/]+\.md$/.test(f) ||
        /^skills\/[^/]+\/SKILL\.md$/.test(f)) &&
      fs.existsSync(path.join(ROOT, f)),
  );
}

// Entries: "path:rule" → reason. Each is a place the shape is legitimate, with the witness.
const ALLOW = {};

// ── Fixtures: what the scan flags and what it passes ──────────────────────

test("fixtures — the scan flags each wrapped-status shape and passes the corrected forms", () => {
  const flagged = [
    "cmd; echo exit=$?",
    'run it; echo "rc=$?"',
    'run it; echo "status=$?"',
    "npm test; echo $?",
    '`cmd; echo "exit_code=$?"`',
    'cmd; echo "$?"', // quoted bare
    'cmd; echo "exit $?"', // space, not `=`
    'cmd; echo "EXIT=$?".', // a character after the closing quote
    'cmd; echo "rc=$?"; true', // a following command
    'cmd; echo "rc=$?" # note', // a trailing comment
    'cmd; echo "rc=${?}"', // braced
    'cmd && echo "rc=$?"', // && wrapper
    'cmd || echo "rc=$?"', // || wrapper
    'cmd; echo "done=$?"', // a name outside exit/rc/status/code
  ];
  for (const l of flagged) {
    assert.ok(
      scan(l).some((f) => f.rule === "status"),
      `must flag: ${l}`,
    );
  }
  const passed = [
    'cmd > "$LOG" 2>&1; echo "TEST_EXIT=$?" >> "$LOG"', // the status goes to a file
    "cmd > out.log 2>&1; echo $? > status.txt",
    "TEST_EXIT=$?",
    'echo "rc=$rc"',
    'cmd && echo "rc=$?" >> "$LOG"', // && form with the status redirected
    'cmd || echo "rc=$?" > status.txt',
    "cmd; echo done", // an echo that reads no status
  ];
  for (const l of passed) {
    assert.deepEqual(
      scan(l).filter((f) => f.rule === "status"),
      [],
      `must pass: ${l}`,
    );
  }
});

test("fixtures — the scan flags a time placeholder with no instrument and passes it with one", () => {
  const bare = "**Started**: {YYYY-MM-DD HH:MM}\n";
  assert.ok(
    scan(bare).some((f) => f.rule === "time"),
    "a bare time placeholder is flagged",
  );
  for (const p of [
    "{timestamp}",
    "<ISO-8601>",
    "{ISO-8601}",
    "dispatched HH:MMZ",
  ]) {
    assert.ok(
      scan(`x ${p}`).some((f) => f.rule === "time"),
      `must flag: ${p}`,
    );
  }
  const paired = bare + "Take it from `date -u '+%Y-%m-%d %H:%M'`.\n";
  assert.deepEqual(scan(paired), [], "a file that names the instrument passes");
  assert.deepEqual(
    scan("updated: {today}\n"),
    [],
    "a date-only placeholder is a named unseen shape",
  );
});

// ── The population ────────────────────────────────────────────────────────

test("population — every shipped source is clean or allowlisted with a reason", () => {
  const files = population();
  const hits = [];
  for (const f of files) {
    for (const h of scan(fs.readFileSync(path.join(ROOT, f), "utf8"))) {
      if (ALLOW[`${f}:${h.rule}`]) continue;
      hits.push(`${f}:${h.line} [${h.rule}] ${h.text}`);
    }
  }
  assert.deepEqual(hits, [], `new instrument-read hit(s):\n${hits.join("\n")}`);
});

test("non-vacuity — the population is large and the scan sees the shapes it exists for", () => {
  const files = population();
  assert.ok(files.length >= 100, `population floor: ${files.length} files`);
  // The scan must find the time placeholders in the report template: strip its instrument
  // sentence and it must go red. A broken scan cannot read as clean.
  const tpl = fs.readFileSync(
    path.join(ROOT, "shared/resources/implementation-report-template.md"),
    "utf8",
  );
  assert.deepEqual(scan(tpl), [], "the template as shipped is clean");
  assert.ok(
    scan(tpl.replace(/date -u/g, "date")).some((f) => f.rule === "time"),
    "with the instrument removed the template must be flagged",
  );
  // The corrected background form is shipped: the step-3 doc keeps its log-carried status.
  const s3 = fs.readFileSync(
    path.join(ROOT, "shared/resources/develop-pipeline-step-3-develop-loop.md"),
    "utf8",
  );
  assert.match(s3, /echo "TEST_EXIT=\$\?" >> "\$TEST_LOG"/);
  assert.deepEqual(
    scan(s3).filter((f) => f.rule === "status"),
    [],
  );
  // The same for the status rule: strip the redirect that makes the shipped form correct and the
  // scan must flag it, so a broken status matcher cannot read the population as clean.
  assert.ok(
    scan(s3.replace(/ >> "\$TEST_LOG"/g, "")).some((f) => f.rule === "status"),
    "with the redirect removed the step-3 doc must be flagged",
  );
  for (const k of Object.keys(ALLOW))
    assert.ok(ALLOW[k].length > 10, `${k} needs a real reason`);
});
