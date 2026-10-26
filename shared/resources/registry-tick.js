#!/usr/bin/env node
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
 *   node registry-tick.js --annotate --file <document.md> --pr <n> [--issue <ref>]
 *                         [--registry <path>] [--dry-run] [--json]
 *
 * ## Two modes, one owner of the row
 *
 * The default mode is the Status tick above. `--annotate` is the SECOND,
 * additive write the row receives, after the merge: it appends `PR #<n> merged`
 * to the row's last cell (the registry's de-facto notes cell — `Depends on` in
 * the documented task-registry header, which rows have carried `… · PR #M
 * merged` in since task 100) and, when `--issue` is given, fills the `Issue`
 * cell if it still reads as empty (`—`, `none`, `n/a`, `tbd` …). It never touches Status — `finalise` owns that,
 * and a post-merge writer that also wrote Status would be the second Status
 * writer task.103 was written to remove (observation #46). task.113 put the
 * annotate write HERE rather than in `develop-next` Step 4's prose because a
 * prose sed admits no test but a grep, and because two files each holding a
 * "which cell is which" mapping drift in the worst direction — the tick
 * matching a row the annotate cannot find.
 *
 * `--issue` never overwrites a filled cell: a human may have linked a
 * different issue by hand, and the row is theirs. The payload says `kept`.
 *
 * Reasons (all exit 0):
 *   ticked             the row was rewritten to `accepted`
 *   already            the row already read `accepted` — idempotent no-op
 *                      (annotate: the notes cell already names this PR and the
 *                      Issue cell needs nothing)
 *   annotated          (annotate) the notes and/or Issue cell were written
 *   no-cell            (annotate) the row has no cell to write — fewer than the
 *                      documented columns, so the notes cell would be a data cell
 *   not-a-task         the document is not a task (a story/epic/bug run) — no registry applies.
 *                      For annotate this is also the bug-registry answer: that
 *                      registry has neither an Issue nor a notes cell.
 *   not-accepted       (tick) the document's own status is not `accepted`, so there is nothing to mirror;
 *                      (annotate) the ROW does not read `accepted` — annotating it would plant a
 *                      phantom dependency, since the notes cell is parsed for `task.N` references
 *   no-registry        the registry file does not exist in this project
 *   no-row             the registry has no row for this task id
 *   row-malformed      the registry HAS a row for this task id, but the shared
 *                      parser rejected its shape; `parserReason` and `line` say
 *                      why and where. Never reported as `no-row` (bug 19): that
 *                      sends the operator looking for a row that is there.
 *   ambiguous-row      (tick) the row's status cell could not be identified unambiguously
 *   engine-unavailable the shared registry parser could not be located
 * Exit 2: usage error (including `--annotate` without `--pr`).
 *
 * ## The status-icon cell — `registry.task.statusIcons` (opt-in)
 *
 * Some consumer registries carry a presentational icon beside Status, and gate
 * on the two agreeing. The tick once wrote `accepted` and left `⚠️`, and the
 * consumer's CI went red after a correct acceptance. The icon set is the
 * consumer's, so it comes from `skills-config.yaml`, never from here:
 *
 *   registry:
 *     task:
 *       statusIcons:     # status token → icon; absent = no icon handling at all
 *         accepted: "✅"
 *       iconColumn: ""   # header text; "" = the empty header cell beside Status
 *
 * When configured, the tick (and the `already` path, which can otherwise never
 * heal a stale icon) adds an `icon` field:
 *   written    the icon cell was rewritten in the same one-line write as Status
 *   repaired   (`already`) Status was right, the stale icon was rewritten
 *   unchanged  the icon cell already reads the mapped icon
 *   unmapped   the map has no icon for the status — the cell is left alone
 *   no-column  no header cell matches — Status is ticked, the icon is not
 *   ambiguous  more than one header cell matches — nothing is guessed
 * Every outcome exits 0. Without the key the payload carries no `icon` field
 * and the registry bytes are exactly what they were before the key existed.
 *
 * ## `--bug-status` — the general-bug registry row (task 219)
 *
 *   node registry-tick.js --bug-status --file <bug.md> [--registry <path>] [--dry-run] [--json]
 *
 * A general bug's status lives twice: in the bug file's frontmatter and in the
 * Status cell of its row in `docs/bugs/bug-registry.md`. develop-bug and qa-fix
 * call this after every write of the file's `status:`, so the row follows the
 * file through the whole lifecycle, reopens included. Before it, four prose
 * steps each edited the row by hand and `/qa-fix` — the fifth writer — did not,
 * leaving the row at `⚠️ Reopened` while the file read `ready-for-qa`.
 *
 * It is an explicit flag, not auto-detection, because `finalise --bug` calls
 * the default mode unconditionally and relies on `not-a-task` for a bug: a
 * default mode that began writing bug rows would write the row before
 * develop-bug Step 7 decides to close it.
 *
 * The VOCABULARY is read from the registry, never assumed. Two exist: the
 * lifecycle token (`closed`, this repository) and the emoji label (`✅ Closed`,
 * some consumers). When most of the OTHER rows read a label, the label is
 * written; otherwise the token. `BUG_STATUS_LABELS` below is the one definition
 * of the labels, exported for the drift test rather than restated there.
 *
 * It writes the Status cell and nothing else — not Last Updated, not the
 * next-number line.
 *
 * Reasons (all exit 0):
 *   mirrored               the Status cell was rewritten to the file's status
 *   already                the cell already reads the file's status, in the
 *                          registry's vocabulary
 *   dry-run                `--dry-run`: what `mirrored` would have written
 *   not-a-general-bug      the file is not `bug.{N}.…` — a task or story bug,
 *                          or not a bug at all. No registry row exists for it
 *   not-a-lifecycle-status the file's `status:` is outside the bug lifecycle
 *   no-registry, no-row, row-malformed, ambiguous-row, engine-unavailable
 *                          as for the tick
 * Exit 2: usage error, including `--bug-status` with `--annotate`.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { parseYamlSubset } = require("./yaml-subset.js");

const DEFAULT_REGISTRY = "docs/tasks/task-registry.md";
const DEFAULT_BUG_REGISTRY = "docs/bugs/bug-registry.md";

/**
 * The emoji vocabulary, keyed by lifecycle token. A consumer registry writes
 * these where this repository writes the bare token. One definition: the CLI
 * writes from it and the drift test normalises through it.
 */
const BUG_STATUS_LABELS = Object.freeze({
  new: "🆕 New",
  "in-progress": "🔧 In Progress",
  "ready-for-qa": "🔍 Ready for QA",
  reopened: "⚠️ Reopened",
  closed: "✅ Closed",
});

const LABEL_TO_TOKEN = new Map(
  Object.entries(BUG_STATUS_LABELS).map(([token, label]) => [
    label.toLowerCase(),
    token,
  ]),
);

/** True when `cell` is one of the five labels, compared case-insensitively. */
function isBugStatusLabel(cell) {
  return LABEL_TO_TOKEN.has(
    String(cell || "")
      .trim()
      .toLowerCase(),
  );
}

/**
 * A registry Status cell in either vocabulary → its lifecycle token, or null
 * when it is neither a label nor a token. `parseRegistry` lowercases the cell,
 * so the comparison is case-insensitive.
 */
function normaliseBugRegistryStatus(cell) {
  const v = String(cell || "")
    .trim()
    .toLowerCase();
  if (!v) return null;
  if (LABEL_TO_TOKEN.has(v)) return LABEL_TO_TOKEN.get(v);
  return Object.prototype.hasOwnProperty.call(BUG_STATUS_LABELS, v) ? v : null;
}

function usage(msg) {
  process.stderr.write(
    `registry-tick: ${msg}\n\nUsage:\n  node registry-tick.js --file <document.md> [--registry <path>] [--dry-run] [--json]\n  node registry-tick.js --annotate --file <document.md> --pr <n> [--issue <ref>] [--registry <path>] [--dry-run] [--json]\n  node registry-tick.js --bug-status --file <bug.md> [--registry <path>] [--dry-run] [--json]\n`,
  );
  process.exitCode = 2;
}

function parseArgs(argv) {
  const out = {
    file: null,
    registry: null,
    dryRun: false,
    json: false,
    annotate: false,
    bugStatus: false,
    pr: null,
    issue: null,
  };
  // A value-taking flag whose next token is missing or is itself a flag has no
  // value. Without this, `--issue --json` would take `--json` as the issue
  // reference AND drop the JSON output — two silent errors from one — and
  // `--registry --json` the same for the path. One helper, all four flags.
  const takeValue = (flag, i) => {
    const v = argv[i + 1];
    if (v === undefined || /^--/.test(v)) {
      throw new Error(`${flag} requires a value`);
    }
    return v;
  };
  try {
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i];
      if (a === "--file") out.file = takeValue(a, i++);
      else if (a === "--registry") out.registry = takeValue(a, i++);
      else if (a === "--annotate") out.annotate = true;
      else if (a === "--bug-status") out.bugStatus = true;
      else if (a === "--pr") out.pr = takeValue(a, i++);
      else if (a === "--issue") out.issue = takeValue(a, i++);
      else if (a === "--dry-run") out.dryRun = true;
      else if (a === "--json") out.json = true;
      else if (a === "--help" || a === "-h") out.help = true;
      else return { error: `unknown argument ${JSON.stringify(a)}` };
    }
  } catch (e) {
    return { error: e.message };
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
  // One payload shape per mode: every annotate-mode outcome carries
  // `annotated`, every tick-mode outcome carries `ticked` — including the early
  // exits shared by both modes, which would otherwise report the other mode's
  // key and leave a `--json` consumer reading `undefined`.
  if (opts.bugStatus) {
    if (payload.mirrored === undefined) payload.mirrored = false;
    delete payload.ticked;
  } else if (opts.annotate) {
    if (payload.annotated === undefined) payload.annotated = false;
    delete payload.ticked;
  } else if (payload.ticked === undefined) {
    payload.ticked = false;
  }
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
  if (opts.bugStatus) {
    // Two different writes to two different registries; one call cannot be both.
    if (opts.annotate) {
      return usage("--bug-status and --annotate select different writes");
    }
    if (opts.pr !== null || opts.issue !== null) {
      return usage("--pr and --issue are only meaningful with --annotate");
    }
    return bugStatus(opts);
  }
  if (opts.annotate) {
    // The PR number is the one fact the annotate write exists to record; an
    // annotate call without it has nothing to write and is a caller bug, not a
    // registry state — so it is the usage family, not an exit-0 reason.
    if (!opts.pr || !/^\d+$/.test(String(opts.pr).replace(/^#/, ""))) {
      return usage("--annotate requires --pr <n> (a pull request number)");
    }
    opts.pr = String(opts.pr).replace(/^#/, "");
    // `--issue` is written into a markdown table cell verbatim, so the two
    // characters that break a table are refused here, once, rather than
    // trusted to every caller. (A MISSING value is already a parseArgs error;
    // this is the empty/whitespace case, which would blank the cell and still
    // report `written`.)
    if (opts.issue !== null) {
      const v = String(opts.issue);
      if (v.trim() === "") return usage("--issue requires a value");
      if (/[|\r\n]/.test(v)) {
        return usage(
          '--issue must not contain "|", CR or LF — it is written into a table cell',
        );
      }
      opts.issue = v;
    }
  } else if (opts.pr !== null || opts.issue !== null) {
    return usage("--pr and --issue are only meaningful with --annotate");
  }

  const base = path.basename(opts.file);
  // A task BUG — `task.67.bug.3.name.md` — carries the task's stem and, in its
  // header-block shape, no `type:` to contradict it, so the id match below read
  // it as task 67 and answered `not-accepted` (the bug's own status) where
  // `finalise --bug` had been promised `not-a-task` (TASK-125-BUG-4). The
  // `.bug.<N>.` segment is what a task document never has; it decides before
  // the stem does.
  const isBugStem = /(^|\.)bug\.\d+\./.test(base);
  const idMatch = isBugStem ? null : base.match(/^task\.(\d+)\./);
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
  // The annotate write records a MERGE, which is a fact about the PR rather
  // than about the document's status — and it runs after `finalise` has set
  // `accepted` anyway. Gating it on the status would make a manual
  // re-annotation of an older row impossible for no protective gain.
  if (!opts.annotate && docStatus !== "accepted") {
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
  const { parseRegistry, DOC_COLUMN_NAMES } = await import(
    pathToFileURL(selector).href
  );

  const registryText = fs.readFileSync(registryRel, "utf8");
  const { rows, malformed } = parseRegistry(registryText, "task", registryRel);
  const row = rows.find((r) => r.n === taskId);
  if (!row) {
    // The parser keeps what it rejected. A row it refused is not a missing
    // row, and saying so points the operator at the wrong fix (bug 19: five
    // finalise runs in one consumer answered `no-row` for rows that existed).
    const rejected = (malformed || []).find((m) => m.n === taskId);
    if (rejected) {
      return emit(opts, {
        reason: "row-malformed",
        message: `registry ${registryRel} line ${rejected.line} is task ${taskId}'s row, but the parser rejected it: ${rejected.reason}`,
        taskId,
        line: rejected.line,
        parserReason: rejected.reason,
        ticked: false,
        exitCode: 0,
      });
    }
    return emit(opts, {
      reason: "no-row",
      message: `registry ${registryRel} has no row for task ${taskId}`,
      taskId,
      ticked: false,
      exitCode: 0,
    });
  }

  if (opts.annotate) {
    // The notes cell is the `Depends on` cell the selector's dependency parser
    // reads, and `PR #381 merged` parses as a dependency on task 381. On an
    // accepted row that is inert — eligibility skips the row before its
    // dependencies are evaluated — but on any other row it would inject a
    // phantom dependency that can block the row's selection. So the ROW must
    // already read `accepted`, which by Step 4 it does: `finalise` ticked it.
    // The DOCUMENT's status is deliberately not consulted (see above).
    if (row.registryStatus !== "accepted") {
      return emit(opts, {
        reason: "not-accepted",
        message: `task ${taskId} row (line ${row.line}) reads \`${row.registryStatus}\` — annotate only an accepted row, or the note becomes a phantom dependency`,
        taskId,
        line: row.line,
        annotated: false,
        exitCode: 0,
      });
    }
    return annotate(opts, {
      registryRel,
      registryText,
      row,
      taskId,
      docColumnNames: DOC_COLUMN_NAMES || [],
    });
  }

  const icons = loadStatusIcons();

  if (row.registryStatus === "accepted") {
    // A row the tick already wrote can still carry a stale icon — the exact
    // state this column's handling was added to stop. Without a repair here,
    // `already` could never heal it: every re-run would leave the icon alone.
    let icon;
    if (icons) {
      const repair = rewriteStatusCell(registryText, row, null, {
        ...icons,
        status: "accepted",
      });
      icon = repair.ok ? repair.icon : { outcome: "ambiguous" };
      if (icon.outcome === "written") {
        icon = { ...icon, outcome: "repaired" };
        if (!opts.dryRun) fs.writeFileSync(registryRel, repair.text, "utf8");
      }
    }
    const repaired = icon && icon.outcome === "repaired";
    return emit(opts, {
      reason: repaired && opts.dryRun ? "dry-run" : "already",
      message:
        `task ${taskId} row (line ${row.line}) already reads \`accepted\`` +
        iconMessage(icon) +
        (repaired && opts.dryRun ? " (dry run — not written)" : ""),
      taskId,
      line: row.line,
      ...(icon ? { icon: icon.outcome } : {}),
      ticked: false,
      exitCode: 0,
    });
  }

  const rewrite = rewriteStatusCell(
    registryText,
    row,
    "accepted",
    icons && { ...icons, status: "accepted" },
  );
  if (!rewrite.ok) {
    return emit(opts, {
      reason: "ambiguous-row",
      message:
        `line ${row.line} has ${rewrite.hits} cells reading \`${row.registryStatus}\` — ` +
        `cannot tell which is the Status column. Tick it by hand.`,
      taskId,
      line: row.line,
      ticked: false,
      exitCode: 0,
    });
  }

  if (!opts.dryRun) {
    fs.writeFileSync(registryRel, rewrite.text, "utf8");
  }

  return emit(opts, {
    reason: opts.dryRun ? "dry-run" : "ticked",
    message: `task ${taskId} row (line ${row.line}): \`${row.registryStatus}\` → \`accepted\`${iconMessage(rewrite.icon)}${opts.dryRun ? " (dry run — not written)" : ""}`,
    taskId,
    line: row.line,
    from: row.registryStatus,
    to: "accepted",
    ...(rewrite.icon ? { icon: rewrite.icon.outcome } : {}),
    ticked: !opts.dryRun,
    exitCode: 0,
  });
}

/**
 * Rewrite the Status cell of `row` in `registryText` to `value`, and return the
 * whole new text — `{ok: true, text}` — or `{ok: false, hits}` when the cell
 * cannot be identified. The one implementation of the row rewrite: the tick and
 * `--bug-status` both call it.
 *
 * The status cell is found by matching the value the parser reported rather
 * than by a column index, so this never needs its own copy of the header
 * mapping. When more than one cell carries that value the column is genuinely
 * ambiguous — refuse rather than guess, because guessing here corrupts the
 * registry, and a wrong row is worse than a stale one.
 *
 * Split KEEPING the separators, so every byte this call does not deliberately
 * change survives untouched. The obvious form — `split(/\r?\n/)` then
 * `join("\n")` — silently rewrites a CRLF registry as LF: every line changes,
 * turning a one-cell tick into a whole-file diff, and invisible in a rendered
 * diff view. Guessing the file's ending instead (`includes("\r\n") ? … : …`)
 * fixes the common case and gets a MIXED-ending file exactly backwards,
 * converting its LF lines to CRLF. Keeping the separators removes the question
 * rather than answering it: only one line is ever rewritten, so nothing else
 * can be reflowed by accident. `parts[i * 2]` is line `i`; `parts[i * 2 + 1]` is
 * the separator that followed it.
 *
 * The cell keeps its total WIDTH where the new value fits (`setCell`), so a
 * column-aligned table keeps its alignment and the diff stays one visible
 * change rather than a whole reflowed row.
 *
 * `icons` (from `loadStatusIcons`, plus the target `status`) also rewrites the
 * row's status-icon cell, in the same line and the same write; the result then
 * carries `icon: {outcome, from, to}`. A `value` of null leaves the Status cell
 * as it is — the `already` path, which repairs only the icon.
 */
function rewriteStatusCell(registryText, row, value, icons = null) {
  const parts = registryText.split(/(\r?\n)/);
  const idx = (row.line - 1) * 2;
  const cells = parts[idx].split("|");
  const hits = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].trim().toLowerCase() === row.registryStatus) hits.push(i);
  }
  if (hits.length !== 1) return { ok: false, hits: hits.length };
  if (value !== null) setCell(cells, hits[0], value);
  const icon = icons
    ? setIconCell(parts, row.line, cells, hits[0], icons)
    : undefined;
  parts[idx] = cells.join("|");
  return { ok: true, text: parts.join(""), icon };
}

/**
 * `registry.task.statusIcons` from `skills-config.yaml` in the cwd — the same
 * place the registry path resolves from — as `{map, column}`, or null when the
 * key is absent. Null means no icon handling at all: not a default icon set,
 * because the vocabulary is the consumer's and this skill has none of its own.
 *
 * An icon that is empty, or holds a pipe or a line break, is dropped — the
 * first would blank the cell, the others would break the table — so its
 * status reads as `unmapped` and the cell is left alone.
 */
function loadStatusIcons(root = process.cwd()) {
  let cfg;
  try {
    cfg = parseYamlSubset(
      fs.readFileSync(path.join(root, "skills-config.yaml"), "utf8"),
    );
  } catch (_) {
    return null;
  }
  const task = cfg && cfg.registry && cfg.registry.task;
  const raw = task && task.statusIcons;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const map = {};
  for (const [status, icon] of Object.entries(raw)) {
    const v = typeof icon === "string" ? icon.trim() : "";
    if (v && !/[|\r\n]/.test(v)) map[status.toLowerCase()] = v;
  }
  const column = typeof task.iconColumn === "string" ? task.iconColumn : "";
  return { map, column: column.trim().toLowerCase() };
}

/**
 * Write the icon for `status` into the row's icon cell, found by the HEADER,
 * never by an index: the cell whose header reads `column`, or — when `column`
 * is "" — the header cell beside Status whose text is empty. No such cell, or
 * more than one, is reported and nothing is written; guessing would put an
 * emoji into a data cell. Returns `{outcome, from?, to?}` with outcome one of
 * `written`, `unchanged`, `unmapped`, `no-column`, `ambiguous`.
 */
function setIconCell(
  parts,
  rowLine,
  cells,
  statusIdx,
  { map, column, status },
) {
  const to = map[status];
  if (!to) return { outcome: "unmapped" };
  const header = findHeader(parts, rowLine);
  if (!header || header.length !== cells.length)
    return { outcome: "no-column" };
  // `| a | b |` splits to ["", " a ", " b ", ""]: the outer elements are not
  // columns, and they are empty, so they must never be read as the unnamed one.
  // Nor is Status itself: `iconColumn: Status` would overwrite the tick.
  const first = header[0].trim() === "" ? 1 : 0;
  const last =
    header[header.length - 1].trim() === ""
      ? header.length - 2
      : header.length - 1;
  const candidates = (
    column === "" ? [statusIdx - 1, statusIdx + 1] : header.map((_, i) => i)
  ).filter(
    (i) =>
      i >= first &&
      i <= last &&
      i !== statusIdx &&
      header[i].trim().toLowerCase() === column,
  );
  if (candidates.length === 0) return { outcome: "no-column" };
  if (candidates.length > 1) return { outcome: "ambiguous" };
  const from = cells[candidates[0]].trim();
  if (from === to) return { outcome: "unchanged", from, to };
  setCell(cells, candidates[0], to);
  return { outcome: "written", from, to };
}

/** The message suffix for an icon outcome; "" when icons are not configured. */
function iconMessage(icon) {
  if (!icon) return "";
  if (icon.outcome === "written" || icon.outcome === "repaired") {
    return `; icon \`${icon.from || "(empty)"}\` → \`${icon.to}\``;
  }
  return `; icon ${icon.outcome}`;
}

/**
 * The `--bug-status` write: mirror a general bug file's `status:` into its
 * registry row, in the registry's own vocabulary. See the header.
 */
async function bugStatus(opts) {
  const base = path.basename(opts.file);
  // A GENERAL bug's basename starts with `bug.{N}.`; a task or story bug
  // (`task.67.bug.3.…`) carries its parent's stem first and has no registry
  // row — its parent's Bug Reports list is its index. The guard lives in the
  // writer, so a caller never has to branch on the bug's mode.
  const general = base.match(/^bug\.(\d+)\./);
  const docText = fs.readFileSync(opts.file, "utf8");
  const docType = (frontmatterField(docText, "type") || "").toLowerCase();
  if (!general || (docType && docType !== "bug")) {
    return emit(opts, {
      reason: "not-a-general-bug",
      message: `${base} is not a general bug (bug.{N}.…, type=${docType || "unset"}) — no bug-registry row applies`,
      exitCode: 0,
    });
  }
  const bugId = Number(general[1]);

  const registryRel = opts.registry || DEFAULT_BUG_REGISTRY;
  if (!fs.existsSync(registryRel)) {
    return emit(opts, {
      reason: "no-registry",
      message: `no registry at ${registryRel} — this project does not keep one`,
      bugId,
      exitCode: 0,
    });
  }

  const selector = locateSelector(path.dirname(path.resolve(registryRel)));
  if (!selector) {
    return emit(opts, {
      reason: "engine-unavailable",
      message:
        "could not locate skills/develop-next/scripts/select-next.mjs — the registry parser is imported, never reimplemented, so the row is not written. Edit its Status cell by hand.",
      bugId,
      exitCode: 0,
    });
  }

  const { pathToFileURL } = require("url");
  const { parseRegistry, BUG_LIFECYCLE_STATUSES } = await import(
    pathToFileURL(selector).href
  );

  // `frontmatterField` already drops a trailing `# comment`, which every bug
  // file carries on this line (`status: closed # bug lifecycle: …`).
  const status = (frontmatterField(docText, "status") || "").toLowerCase();
  if (!BUG_LIFECYCLE_STATUSES.has(status)) {
    return emit(opts, {
      reason: "not-a-lifecycle-status",
      message: `bug ${bugId} reads \`${status || "(no status)"}\` — outside the bug lifecycle (${[...BUG_LIFECYCLE_STATUSES].join(", ")}). Fix the file's status`,
      bugId,
      status: status || null,
      exitCode: 0,
    });
  }

  const registryText = fs.readFileSync(registryRel, "utf8");
  const { rows, malformed } = parseRegistry(registryText, "bug", registryRel);
  const row = rows.find((r) => r.n === bugId);
  if (!row) {
    const rejected = (malformed || []).find((m) => m.n === bugId);
    if (rejected) {
      return emit(opts, {
        reason: "row-malformed",
        message: `registry ${registryRel} line ${rejected.line} is bug ${bugId}'s row, but the parser rejected it: ${rejected.reason}`,
        bugId,
        line: rejected.line,
        parserReason: rejected.reason,
        exitCode: 0,
      });
    }
    return emit(opts, {
      reason: "no-row",
      message: `registry ${registryRel} has no row for bug ${bugId}`,
      bugId,
      exitCode: 0,
    });
  }

  // The vocabulary comes from the OTHER rows: the target row is the one that
  // may be stale or hand-written in the wrong form, so it gets no vote. A
  // strict majority of labels is needed for a label; a tie or an empty
  // registry writes the token.
  const others = rows.filter((r) => r.n !== bugId);
  const labelled = others.filter((r) => isBugStatusLabel(r.registryStatus));
  const vocabulary =
    others.length > 0 && labelled.length * 2 > others.length
      ? "label"
      : "token";
  const to = vocabulary === "label" ? BUG_STATUS_LABELS[status] : status;

  const current = normaliseBugRegistryStatus(row.registryStatus);
  const inVocabulary =
    (vocabulary === "label") === isBugStatusLabel(row.registryStatus);
  if (current === status && inVocabulary) {
    return emit(opts, {
      reason: "already",
      message: `bug ${bugId} row (line ${row.line}) already reads \`${to}\``,
      bugId,
      line: row.line,
      status,
      vocabulary,
      exitCode: 0,
    });
  }

  const rewrite = rewriteStatusCell(registryText, row, to);
  if (!rewrite.ok) {
    return emit(opts, {
      reason: "ambiguous-row",
      message:
        `line ${row.line} has ${rewrite.hits} cells reading \`${row.registryStatus}\` — ` +
        `cannot tell which is the Status column. Edit it by hand.`,
      bugId,
      line: row.line,
      exitCode: 0,
    });
  }
  if (!opts.dryRun) fs.writeFileSync(registryRel, rewrite.text, "utf8");

  return emit(opts, {
    reason: opts.dryRun ? "dry-run" : "mirrored",
    message: `bug ${bugId} row (line ${row.line}): \`${row.registryStatus}\` → \`${to}\`${opts.dryRun ? " (dry run — not written)" : ""}`,
    bugId,
    line: row.line,
    from: row.registryStatus,
    to,
    status,
    vocabulary,
    mirrored: !opts.dryRun,
    exitCode: 0,
  });
}

/**
 * A cell that says "nothing here yet". The spellings mirror the selector's
 * `DEP_EMPTY_RE` (select-next.mjs), which reads the same `Depends on` cell:
 * the two readers must agree on what empty means, so that a cell the selector
 * treats as empty is REPLACED here rather than appended to — `none · PR #n
 * merged` would no longer be empty to the selector, which would then parse
 * `#n` as a dependency reference.
 */
const EMPTY_CELL_RE = /^(?:[—–-]|none|n\/a|na|tbd)?$/i;
function isEmptyCell(cell) {
  return EMPTY_CELL_RE.test(String(cell).trim());
}

/**
 * Rewrite one cell of `cells` in place, keeping the leading whitespace and —
 * where the new value fits — the cell's total width. The one implementation of
 * the width rule: the tick path and the annotate path both call it.
 * A cell that grows keeps one trailing space so the pipe stays separated.
 * Width is DISPLAY width (`displayWidth`), not `.length`: `⚠️` is two UTF-16
 * code units and `✅` one, but both show two columns wide, so a `.length` pad
 * shifted the pipe by a column on every icon swap.
 */
function setCell(cells, i, value) {
  const cell = cells[i];
  const lead = cell.match(/^\s*/)[0];
  const trailLen = cell.match(/\s*$/)[0].length;
  const core = `${lead}${value}`;
  const pad =
    trailLen === 0 ? 0 : Math.max(1, displayWidth(cell) - displayWidth(core));
  cells[i] = core + " ".repeat(pad);
}

/**
 * The columns `s` occupies in a monospace view: 2 for an emoji-presentation
 * grapheme cluster (an `Emoji_Presentation` code point, or an
 * `Extended_Pictographic` one followed by VS16), 1 for any other cluster.
 * Joiners and marks belong to their cluster, so they add nothing. ASCII is one
 * column per character, exactly `.length`. East Asian Wide/Fullwidth is not
 * counted as 2: V8's regex has no `East_Asian_Width` property.
 */
const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const WIDE_CLUSTER_RE = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u;
function displayWidth(s) {
  let width = 0;
  for (const { segment } of GRAPHEMES.segment(s)) {
    width += WIDE_CLUSTER_RE.test(segment) ? 2 : 1;
  }
  return width;
}

/**
 * Header cells that name a DATA column. A table whose LAST header cell is one
 * of these has no notes cell, and the annotate write must refuse rather than
 * append prose to a date or a priority. `depends on` is deliberately absent:
 * it is the documented last column of the task registry and the cell every
 * accepted row since task 100 has used as free text.
 */
const DATA_COLUMN_NAMES = new Set([
  "#",
  "no",
  "num",
  "number",
  "id",
  "title",
  "name",
  "status",
  "category",
  "type",
  "kind",
  "priority",
  "severity",
  "created",
  "filed",
  "date",
  "updated",
  "issue",
  "area",
  "owner",
  "assignee",
]);

/**
 * Locate the header of the table that CONTAINS `rowLine`: walk up from the row
 * over table lines only, and take the line above the first separator met.
 *
 * Two bounds, both from QA on task.113: the walk stops at the first line that
 * is not a table row, so an earlier, unrelated table (a `| Key | Meaning |`
 * legend above the registry) can never supply the header; and the separator
 * must itself be a table row (`|---|`), so a bare `---` horizontal rule or a
 * frontmatter fence is not mistaken for one. The selector keeps its own
 * separator regex for parsing whole files; this one answers a narrower
 * question — "is this the separator of the row's own table?" — and is bounded
 * by the table rather than by the file, which is why it is not the same regex.
 * Returns the header cells, or null when the row's table has no header.
 */
function findHeader(parts, rowLine) {
  for (let li = rowLine - 2; li >= 0; li--) {
    const line = parts[li * 2] || "";
    if (!/^\s*\|/.test(line)) return null; // left the table without a separator
    // Any GFM delimiter row the selector accepts: hyphens with optional
    // colons, any count (`| - |`, `|:--|`, `|---|`).
    if (/^\s*\|\s*:?-+:?\s*\|/.test(line)) {
      const above = parts[(li - 1) * 2] || "";
      return /^\s*\|/.test(above) ? above.split("|") : null;
    }
  }
  return null;
}

/**
 * The `--annotate` write. Column resolution is deliberately narrow, and both
 * cells are resolved from the row's OWN table header:
 *
 *   - the NOTES cell is the row's last cell — but only when the header names
 *     that column as something other than a data column. The documented
 *     task-registry header ends in `Depends on`, and every accepted row since
 *     task 100 has used it as the free-text cell (`task.104 · PR #381. …`).
 *     A registry whose last column is `Created` or `Area` answers `no-cell`
 *     and is left alone: the earlier numeric guard (`< 5 cells`) was
 *     unreachable — the parser already drops such rows — and let a six-column
 *     consumer registry have its Created cell rewritten.
 *   - the ISSUE cell is found by header NAME (`Issue`, case-insensitive). There
 *     is no positional fallback: a wrong Issue cell is a corrupted link, and
 *     nothing about a position says "this holds a tracker link".
 *
 * The header is read here, not added to the selector's `COLUMN_ALIASES`,
 * because the selector reads the registry to SELECT and has no use for an
 * Issue column; adding one there would be a selector change the task rules out.
 */
function annotate(
  opts,
  { registryRel, registryText, row, taskId, docColumnNames },
) {
  const parts = registryText.split(/(\r?\n)/);
  const idx = (row.line - 1) * 2;
  const original = parts[idx];
  const cells = original.split("|");
  // `| a | b |` splits to ["", " a ", " b ", ""]; the trailing "" is the
  // closing pipe. A row without a closing pipe has no such element.
  const closed = cells.length > 0 && cells[cells.length - 1].trim() === "";
  const last = closed ? cells.length - 2 : cells.length - 1;

  const header = findHeader(parts, row.line);
  const headerClosed = header && header[header.length - 1].trim() === "";
  const headerLast = header
    ? headerClosed
      ? header.length - 2
      : header.length - 1
    : -1;
  const lastName = header ? header[headerLast].trim().toLowerCase() : null;
  if (
    !header ||
    last < 1 ||
    headerLast !== last ||
    DATA_COLUMN_NAMES.has(lastName) ||
    // The document-path column is the parser's, and it names it: a note
    // appended there would be read back as part of the path (bug 19).
    docColumnNames.includes(lastName)
  ) {
    return emit(opts, {
      reason: "no-cell",
      message: !header
        ? `task ${taskId} row (line ${row.line}) has no table header above it — cannot tell which cell is the notes cell`
        : headerLast !== last
          ? `task ${taskId} row (line ${row.line}) has ${last} cells but its header has ${headerLast} — cannot align the notes cell`
          : `task ${taskId} row (line ${row.line}): last column is \`${header[headerLast].trim()}\`, a data column — no notes cell to annotate`,
      taskId,
      line: row.line,
      lastColumn: lastName,
      annotated: false,
      exitCode: 0,
    });
  }
  const issueCol = header.findIndex((c) => c.trim().toLowerCase() === "issue");

  const prText = `PR #${opts.pr} merged`;
  const notesHas = new RegExp(`PR #${opts.pr}\\b`).test(cells[last]);
  let notes = "unchanged";
  if (!notesHas) {
    const existing = cells[last].trim();
    setCell(
      cells,
      last,
      isEmptyCell(existing) ? prText : `${existing} · ${prText}`,
    );
    notes = "written";
  }

  let issue = "not-requested";
  if (opts.issue !== null) {
    if (issueCol === -1 || issueCol > last) issue = "no-column";
    else if (!isEmptyCell(cells[issueCol])) issue = "kept";
    else {
      setCell(cells, issueCol, opts.issue);
      issue = "written";
    }
  }

  const wrote = notes === "written" || issue === "written";
  if (!wrote) {
    return emit(opts, {
      reason: "already",
      message:
        `task ${taskId} row (line ${row.line}) already names PR #${opts.pr}` +
        (issue === "kept"
          ? "; Issue cell already filled"
          : issue === "no-column"
            ? "; registry has no Issue column"
            : ""),
      taskId,
      line: row.line,
      notes,
      issue,
      annotated: false,
      exitCode: 0,
    });
  }

  parts[idx] = cells.join("|");
  if (!opts.dryRun) {
    fs.writeFileSync(registryRel, parts.join(""), "utf8");
  }
  return emit(opts, {
    reason: opts.dryRun ? "dry-run" : "annotated",
    message: `task ${taskId} row (line ${row.line}): notes ${notes}, issue ${issue}${opts.dryRun ? " (dry run — not written)" : ""}`,
    taskId,
    line: row.line,
    notes,
    issue,
    annotated: !opts.dryRun,
    exitCode: 0,
  });
}

// Run only as a CLI. The drift test requires this file for the label map, and
// requiring it must neither print nor write. `require.main === module` compares
// module objects, so it holds however the file is reached — a symlinked
// `.agents/skills` path included (bug 16 was the ESM argv-path guard).
if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(
      `registry-tick: ${err && err.stack ? err.stack : err}\n`,
    );
    process.exitCode = 2;
  });
}

module.exports = { BUG_STATUS_LABELS, normaliseBugRegistryStatus };
