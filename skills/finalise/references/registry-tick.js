#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/registry-tick.js. Regenerate via `npm run bundle`.
/**
 * registry-tick — set a task's row in `docs/tasks/task-registry.md` to `accepted`.
 *
 * task.103 gave the registry tick an owner. `finalise` is that owner: it is the
 * single moment that already writes the DOCUMENT's `status: accepted` and
 * `completed_date`, so folding the row write into the same step is what makes
 * the two unable to disagree by construction. A check alone can only report a
 * disagreement after it exists.
 *
 * Peer of `tracker-comment.js` and `observation-log.js`, and it follows their
 * contract: `--json` prints a `reason`, and the whole success family exits 0.
 *
 * ## Non-blocking by design
 *
 * Every outcome except a usage error exits 0, including `no-row` and
 * `engine-unavailable`. This is deliberate: acceptance has already happened by
 * the time this runs, and a registry row is a human-readable index — refusing to
 * finalise a genuinely-complete task because its index line could not be found
 * would trade a cosmetic defect for a blocked pipeline. The loud backstop is
 * `evals/shared/tests/task-registry-drift.test.mjs`, which fails CI when a row
 * and its document disagree, so a silent no-op here is caught there rather than
 * being lost. **Read `reason` and log it** — that is what makes the difference
 * between a no-op that was noticed and one that was not.
 *
 * ## Why a CLI and not a paragraph in SKILL.md
 *
 * The task's own testing strategy requires proving two behaviours: that a
 * lite-mode run still ticks, and that a STORY run does not attempt a task
 * registry write. Both are assertions about what the code does. Written as
 * prose in `finalise/SKILL.md`, the only available test would grep the prose —
 * which proves the sentence exists, not that the behaviour holds.
 *
 * Usage:
 *   node registry-tick.js --file <document.md> [--registry <path>] [--dry-run] [--json]
 *
 * Reasons (all exit 0):
 *   ticked             the row was rewritten to `accepted`
 *   already            the row already read `accepted` — idempotent no-op
 *   not-a-task         the document is not a task (a story/epic/bug run) — no registry applies
 *   not-accepted       the document's own status is not `accepted`, so there is nothing to mirror
 *   no-registry        the registry file does not exist in this project
 *   no-row             the registry has no row for this task id
 *   ambiguous-row      the row's status cell could not be identified unambiguously
 *   engine-unavailable the shared registry parser could not be located
 * Exit 2: usage error.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_REGISTRY = "docs/tasks/task-registry.md";

function usage(msg) {
  process.stderr.write(
    `registry-tick: ${msg}\n\nUsage:\n  node registry-tick.js --file <document.md> [--registry <path>] [--dry-run] [--json]\n`,
  );
  process.exitCode = 2;
}

function parseArgs(argv) {
  const out = { file: null, registry: null, dryRun: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") out.file = argv[++i];
    else if (a === "--registry") out.registry = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--json") out.json = true;
    else if (a === "--help" || a === "-h") out.help = true;
    else return { error: `unknown argument ${JSON.stringify(a)}` };
  }
  return out;
}

/** Frontmatter `status:` — the same shape `parseFrontmatterStatus` reads. */
function frontmatterField(text, field) {
  const m = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const re = new RegExp(`^${field}\\s*:(.*)$`, "m");
  const line = m[1].match(re);
  if (!line) return null;
  let v = line[1].trim();
  v = v.replace(/\s+#.*$/, "").trim();
  v = v.replace(/^['"]|['"]$/g, "").trim();
  return v || null;
}

/**
 * Walk up from `start` looking for the repo root, then for the develop-next
 * selector that owns the registry table parser.
 *
 * The parser is IMPORTED, never reimplemented. A second copy of "what a registry
 * row looks like" would be free to drift from the one the drift check and the
 * roadmap selector both use — and it would drift in the worst direction, because
 * a private parser that matched nothing would tick nothing and report success.
 */
function locateSelector(start) {
  const candidates = [
    path.join("skills", "develop-next", "scripts", "select-next.mjs"),
    path.join(
      ".agents",
      "skills",
      "develop-next",
      "scripts",
      "select-next.mjs",
    ),
    path.join(
      ".claude",
      "skills",
      "develop-next",
      "scripts",
      "select-next.mjs",
    ),
  ];
  let dir = path.resolve(start);
  for (;;) {
    for (const rel of candidates) {
      const p = path.join(dir, rel);
      if (fs.existsSync(p)) return p;
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  // Bundled beside this file (a packaged skill), as a last resort.
  const sibling = path.join(__dirname, "select-next.mjs");
  return fs.existsSync(sibling) ? sibling : null;
}

function emit(opts, payload) {
  if (opts.json) process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  else process.stdout.write(`${payload.reason}: ${payload.message}\n`);
  process.exitCode = payload.exitCode;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.error) return usage(opts.error);
  if (opts.help) return usage("help");
  if (!opts.file) return usage("--file is required");
  if (!fs.existsSync(opts.file)) return usage(`--file not found: ${opts.file}`);

  const base = path.basename(opts.file);
  const idMatch = base.match(/^task\.(\d+)\./);
  const docText = fs.readFileSync(opts.file, "utf8");
  const docType = (frontmatterField(docText, "type") || "").toLowerCase();

  // The story-run guard, and the asymmetry between its two signals is deliberate.
  //
  // The filename's `task.{N}.` stem is REQUIRED — it carries the id the registry
  // row is keyed on, so without it there is nothing to look up. OKF's `type` may
  // only CONTRADICT that stem, never be missing: a document predating the `type`
  // field is still a task, and refusing to tick it would punish the oldest
  // documents in the corpus for a convention added after they were written. So
  // an absent `type` passes and a `type: story` does not.
  //
  // A story, epic or bug run reaching this call is a no-op, not an error —
  // `finalise` is shared across document kinds and calls this unconditionally,
  // which is precisely why the refusal lives here rather than in a prose
  // condition the caller has to remember.
  if (!idMatch || (docType && docType !== "task")) {
    return emit(opts, {
      reason: "not-a-task",
      message: `${base} is not a task document (type=${docType || "unset"}) — no task registry applies`,
      ticked: false,
      exitCode: 0,
    });
  }
  const taskId = Number(idMatch[1]);

  const docStatus = (frontmatterField(docText, "status") || "").toLowerCase();
  if (docStatus !== "accepted") {
    return emit(opts, {
      reason: "not-accepted",
      message: `task ${taskId} reads \`${docStatus || "(no status)"}\` — the row mirrors \`accepted\` and nothing else`,
      taskId,
      ticked: false,
      exitCode: 0,
    });
  }

  const registryRel = opts.registry || DEFAULT_REGISTRY;
  if (!fs.existsSync(registryRel)) {
    return emit(opts, {
      reason: "no-registry",
      message: `no registry at ${registryRel} — this project does not keep one`,
      taskId,
      ticked: false,
      exitCode: 0,
    });
  }

  const selector = locateSelector(path.dirname(path.resolve(registryRel)));
  if (!selector) {
    return emit(opts, {
      reason: "engine-unavailable",
      message:
        "could not locate skills/develop-next/scripts/select-next.mjs — the registry parser is imported, never reimplemented, so the tick is skipped. The drift check will report the untouched row.",
      taskId,
      ticked: false,
      exitCode: 0,
    });
  }

  const { pathToFileURL } = require("url");
  const { parseRegistry } = await import(pathToFileURL(selector).href);

  const registryText = fs.readFileSync(registryRel, "utf8");
  const { rows } = parseRegistry(registryText, "task", registryRel);
  const row = rows.find((r) => r.n === taskId);
  if (!row) {
    return emit(opts, {
      reason: "no-row",
      message: `registry ${registryRel} has no row for task ${taskId}`,
      taskId,
      ticked: false,
      exitCode: 0,
    });
  }

  if (row.registryStatus === "accepted") {
    return emit(opts, {
      reason: "already",
      message: `task ${taskId} row (line ${row.line}) already reads \`accepted\``,
      taskId,
      line: row.line,
      ticked: false,
      exitCode: 0,
    });
  }

  // Rewrite the one cell, in the one line the parser identified. The status
  // cell is found by matching the value the parser reported rather than by a
  // column index, so this never needs its own copy of the header mapping. When
  // more than one cell carries that value the column is genuinely ambiguous —
  // refuse rather than guess, because guessing here corrupts the registry, and a
  // wrong row is worse than a stale one.
  // Preserve the file's own line endings. `split(/\r?\n/).join("\n")` silently
  // rewrites a CRLF registry as LF — every line changes, which is the same
  // whole-file diff the width preservation below exists to avoid, in the other
  // dimension. Found by probing the rewrite path rather than by reading it.
  const eol = registryText.includes("\r\n") ? "\r\n" : "\n";
  const lines = registryText.split(/\r?\n/);
  const idx = row.line - 1;
  const original = lines[idx];
  const cells = original.split("|");
  const hits = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].trim().toLowerCase() === row.registryStatus) hits.push(i);
  }
  if (hits.length !== 1) {
    return emit(opts, {
      reason: "ambiguous-row",
      message:
        `line ${row.line} has ${hits.length} cells reading \`${row.registryStatus}\` — ` +
        `cannot tell which is the Status column. Tick it by hand.`,
      taskId,
      line: row.line,
      ticked: false,
      exitCode: 0,
    });
  }

  // Preserve the cell's total WIDTH, not merely its padding, so a column-aligned
  // table keeps its alignment and the diff stays one visible change rather than a
  // whole reflowed row. The length delta is absorbed by the TRAILING padding —
  // the leading run is kept verbatim because it is what separates the value from
  // the pipe.
  //
  // Two boundaries, both deliberate:
  //   - a cell with no trailing whitespace at all (`|planned|`) gets none back,
  //     rather than acquiring a space it never had;
  //   - a cell too narrow to hold `accepted` keeps one separating space and the
  //     row widens. Alignment is worth preserving, never worth corrupting a value
  //     to achieve.
  const cell = cells[hits[0]];
  const lead = cell.match(/^\s*/)[0];
  const trailLen = cell.match(/\s*$/)[0].length;
  const core = `${lead}accepted`;
  const pad = trailLen === 0 ? 0 : Math.max(1, cell.length - core.length);
  cells[hits[0]] = core + " ".repeat(pad);
  lines[idx] = cells.join("|");

  if (!opts.dryRun) {
    fs.writeFileSync(registryRel, lines.join(eol), "utf8");
  }

  return emit(opts, {
    reason: opts.dryRun ? "dry-run" : "ticked",
    message: `task ${taskId} row (line ${row.line}): \`${row.registryStatus}\` → \`accepted\`${opts.dryRun ? " (dry run — not written)" : ""}`,
    taskId,
    line: row.line,
    from: row.registryStatus,
    to: "accepted",
    ticked: !opts.dryRun,
    exitCode: 0,
  });
}

main().catch((err) => {
  process.stderr.write(
    `registry-tick: ${err && err.stack ? err.stack : err}\n`,
  );
  process.exitCode = 2;
});
