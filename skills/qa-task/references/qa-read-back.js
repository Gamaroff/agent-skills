// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/qa-read-back.js. Regenerate via `npm run bundle`.
"use strict";

/**
 * qa-read-back.js — read a QA cycle's claims back after the work item was edited
 * (task.149, obs #164).
 *
 * qa-task Step 12b and qa-story Review Completion item 3e run this once, after
 * the step that wrote the gate, the QA report, the bug reports and the Change
 * Log verdict row into the work-item document. A check that runs before a claim
 * is written cannot check it; this one runs after, and it DECIDES — the halt is
 * its exit status, not a reading of its output.
 *
 * Why a script and not a fenced block. The read-back lived as a fenced block in
 * both SKILL.md files for three QA cycles, and each cycle found a new gap in it
 * (TASK-149-BUG-2, -3, -5, -6, -7): an unbound input, a jq precedence error that
 * failed closed on every input, empty engine output read as clean under zsh, a
 * failed `git add` ignored, staging that swept work from outside the work item.
 * One definition, called from both skills with a path, and tested directly, is
 * the structural move; a fourth patch to two copies of prose was not.
 *
 * Contract:
 *   node qa-read-back.js --doc <work-item.md> [--json]
 *     exit 0  clean — the gate, the report and a Change Log row exist, every link
 *             in the document resolves against the index, `updated:` accounts
 *             for the newest row, and the document's verdict is this cycle's: the
 *             QA section's `**Gate Decision**` and the newest qa-task/qa-story
 *             Change Log row both name the gate's `gate:` token (task.192, obs #205)
 *     exit 1  HALT — one of those does not hold; each problem is printed with the
 *             remedy. Do not post the PR comment / QA summary over it.
 *     exit 2  could not look — the check as a whole could not run: bad arguments,
 *             a document that is not a readable regular file, a sibling engine
 *             that did not load, no repository, an index git cannot read, or an
 *             error nothing anticipated. Never a pass: nothing was checked.
 *
 * Exit 2 is about the RUN, not about one link (TASK-149-BUG-10). Once the check
 * runs, every link it cannot confirm — missing, ignored, outside-repo, and
 * unverifiable (git answered neither yes nor no for that one path) — is a HALT,
 * exit 1, with a remedy for that state. Both codes stop the QA comment; the split
 * tells the caller whether to fix a link or fix the environment. qa-task Step 12b
 * and qa-story item 3e state the same contract.
 *
 * Staging (TASK-149-BUG-7). The link check reads the INDEX, so the script stages
 * what this cycle wrote — the document, the cycle's gate and report — and then
 * every link target that is `untracked` AND a regular file under the work item's
 * own directory. Any other untracked target (a directory, a file elsewhere in the
 * repository) is left alone and reported, so unrelated uncommitted work never
 * rides into the QA commit; a human stages it deliberately. A `git add` that
 * fails is a halt: an index that was not updated would make every artifact read
 * as untracked.
 *
 * Lock retry (task.192, obs #216). An editor refreshing the index holds
 * .git/index.lock for a moment; `git add` then fails with an index.lock error
 * that clears within a second. That one failure is retried, three more times at
 * 200 / 400 / 800 ms, before it is reported; every other failure is reported on
 * the first attempt. A lock that outlasts one path's backoff is not waited for
 * again: later paths try once, so the whole run waits at most 1.4 s.
 * `stageAttempts` in the result records each path's count.
 * Beside, not on top of, gh-stage.js `withRetry`: that retries every error, and
 * requiring it would pull a tracker CLI into the qa-* bundles.
 *
 * bundle-dependency: shared/resources/qa-cycle.sh
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function load() {
  try {
    return {
      docLinks: require("./doc-links.js"),
      changeLog: require("./change-log.js"),
      qaResults: require("./qa-results.js"),
    };
  } catch (e) {
    return { error: e.message };
  }
}

function git(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

// Synchronous by design, like every other call in this script — the same guarded
// Atomics.wait gh-stage.js's sleepSync uses.
function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch (_) {}
}

// The waits before each `git add` attempt: the first is immediate, three retries follow.
const STAGE_WAITS = [0, 200, 400, 800];

// A Markdown table row's cells, outer pipes dropped, empty cells kept.
const cells = (row) =>
  row
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());

/**
 * The document's verdict against this cycle's gate token (task.192, obs #205).
 * A document whose links were updated and whose verdict line or row was not
 * still carries the previous cycle's verdict; every link check passes it.
 * Returns the problems, one per mismatch.
 */
function verdictProblems(engines, text, gateFile) {
  const base = path.basename(gateFile);
  const token = (fs
    .readFileSync(gateFile, "utf8")
    .match(/^gate:[ \t]*["']?([A-Za-z]+)/m) || [])[1];
  if (!token)
    return [
      `this cycle's gate ${base} has no readable gate: token — the verdict cannot be checked against it`,
    ];
  const want = token.toUpperCase();
  const problems = [];

  const { sections } = engines.qaResults.findQaResults(text);
  if (!sections.length)
    problems.push(
      "the document has no ## QA Testing Results section — the Step 12 edit did not land",
    );
  for (const sec of sections) {
    // Every decision line, not the first: a stale line after a current one is still stale
    // (task.192 QA-2). Tolerates a leading emoji or bold before the token; the token is the
    // first word.
    const lines = [
      ...text
        .slice(sec.start, sec.end)
        .matchAll(/^\*\*Gate Decision\*\*:[^A-Za-z\n]*([A-Za-z]+)/gm),
    ];
    if (!lines.length)
      problems.push(
        "the QA section has no **Gate Decision** line — the Step 12 edit did not land",
      );
    for (const m of lines)
      if (m[1].toUpperCase() !== want)
        problems.push(
          `**Gate Decision** is ${m[1]} but this cycle's gate ${base} says ${want} — the Step 12 edit did not land`,
        );
  }

  // The verdict row is the newest row QA wrote that records a verdict — not the newest row,
  // and not the newest qa-* row: a QA run may follow it with a `Status →` row of its own
  // (task.192 QA2-2).
  const rows = engines.changeLog.extractEntries(text);
  const author = (r) => cells(r).at(-1) || "";
  const at = rows.findLastIndex(
    (r) =>
      /^qa-(task|story)$/.test(author(r)) &&
      /^QA gate\b/.test(cells(r).at(-2) || ""),
  );
  if (at < 0)
    problems.push(
      "no qa-task/qa-story Change Log row naming a QA gate verdict — the verdict row did not land",
    );
  else if (!new RegExp(`\\bQA gate ${want}\\b`).test(rows[at])) {
    const c = cells(rows[at]);
    problems.push(
      `the newest QA Change Log row reads "${c.at(-2) || rows[at].trim()}" but this cycle's gate ${base} says ${want}`,
    );
  } else if (rows.slice(at + 1).some((r) => author(r) === "qa-fix"))
    // This cycle's row, not only this cycle's token. The read-back runs right after QA writes
    // its row, and every cycle after a fix writes one, so a qa-fix row after the newest verdict
    // row means this cycle wrote none; a repeated verdict hides that from the token check
    // (task.192 QA2-1).
    problems.push(
      `the newest QA gate row ("${cells(rows[at]).at(-2)}") comes before a qa-fix row — this cycle's gate ${base} has no Change Log row of its own`,
    );
  return problems;
}

/**
 * The QA cycle is the highest-numbered gate in the directory. ONE definition —
 * the bundled qa-cycle.sh every other QA block calls — so this script and the
 * PR-comment stage suffix can never name different rounds.
 */
function qaCycle(dir) {
  const r = spawnSync("bash", [path.join(__dirname, "qa-cycle.sh"), dir], {
    encoding: "utf8",
  });
  if (r.status === 0) return { cycle: r.stdout.trim() };
  if (r.status === 1) return { cycle: "" };
  return { error: `qa-cycle.sh not runnable (rc ${r.status})` };
}

/**
 * This cycle's gate or QA report — asked of qa-cycle.sh `--path`, the one
 * definition of "this cycle's file" (TASK-149-BUG-11). A second grammar here
 * drifted from the helper three times: leading zeros (BUG-9), the greedy segment
 * (CR6-2) and dotfiles (BUG-11). The helper answers with the same glob and sed
 * that counted the cycle, regular files only, and refuses an ambiguous cycle.
 * Returns { path } or { problem } (the helper's refusal, verbatim); throws when
 * the helper cannot run, which the caller reports as could-not-look.
 */
function artifact(dir, kind) {
  const r = spawnSync(
    "bash",
    [path.join(__dirname, "qa-cycle.sh"), dir, "--path", kind],
    { encoding: "utf8" },
  );
  if (r.status === 0) return { path: r.stdout.trim() };
  if (r.status === 1)
    return {
      problem: (r.stderr || "").replace(/^⚠️\s*qa-cycle:\s*/, "").trim(),
    };
  throw new Error(`qa-cycle.sh --path ${kind} not runnable (rc ${r.status})`);
}

// One remedy per link state, so the caller is told what to fix (TASK-149-BUG-10).
// `unverifiable` is not a missing artifact: git answered neither yes nor no for
// that path — most often a link that passes through a symlinked directory.
const REMEDY = {
  untracked: (d) =>
    `is untracked and outside ${d} (or not a regular file) — stage it deliberately if it belongs in this commit`,
  missing: () => "is missing — write the artifact or fix the link",
  ignored: () =>
    "is ignored — gitignored, so it can never be committed; move the artifact or fix the link",
  "outside-repo": () =>
    "is outside-repo — link to a path inside the repository",
  unverifiable: () =>
    "is unverifiable — git answered neither yes nor no for this path (a link through a symlinked directory?); it is not a missing artifact, so link to the real path",
  // task 231 — the file is there; the #fragment names no heading in it.
  "no-anchor": () =>
    "is no-anchor — the file exists but its #fragment names no heading or explicit anchor in it; fix the fragment to the heading's slug",
};

function readBack(docArg, opts = {}) {
  // TASK-149-BUG-8 — a run that could not complete is exit 2. An error the
  // body did not anticipate (an unreadable file, a throw from an engine) would
  // otherwise exit 1 with a stack trace and read as a HALT.
  try {
    return readBackUnguarded(docArg, opts);
  } catch (e) {
    return {
      problems: [],
      staged: [],
      links: [],
      exitCode: 2,
      reason: "could-not-look",
      error: e.message,
    };
  }
}

// opts.sleepMs replaces the backoff's sleep — a test seam, as in gh-stage.js withRetry.
function readBackUnguarded(docArg, { sleepMs = sleepSync } = {}) {
  const out = { problems: [], staged: [], links: [], stageAttempts: {} };
  const engines = load();
  if (engines.error)
    return {
      ...out,
      exitCode: 2,
      reason: "engine-unavailable",
      error: engines.error,
    };

  let doc;
  try {
    doc = fs.realpathSync(docArg);
  } catch (e) {
    return {
      ...out,
      exitCode: 2,
      reason: "usage",
      error: `--doc ${docArg}: ${e.message}`,
    };
  }
  // A directory passes realpath, and `git add` on it would stage everything under
  // it before the read failed — the sweep TASK-149-BUG-7 closed (TASK-149-BUG-8).
  if (!fs.statSync(doc).isFile())
    return {
      ...out,
      exitCode: 2,
      reason: "usage",
      error: `--doc ${docArg} is not a regular file`,
    };
  const dir = path.dirname(doc);
  const top = git(["rev-parse", "--show-toplevel"], dir);
  if (top.status !== 0)
    return {
      ...out,
      exitCode: 2,
      reason: "no-repository",
      error: `${doc} is not in a git repository`,
    };
  const root = fs.realpathSync(top.stdout.trim());
  const rel = (p) => path.relative(root, p).split(path.sep).join("/");

  // The claims this step reads back must exist before anything else is judged.
  const c = qaCycle(dir);
  if (c.error)
    return {
      ...out,
      exitCode: 2,
      reason: "qa-cycle-unavailable",
      error: c.error,
    };
  const g = c.cycle ? artifact(dir, "gate") : {};
  const q = c.cycle ? artifact(dir, "qa") : {};
  const gate = g.path || "";
  const report = q.path || "";
  if (!c.cycle)
    out.problems.push(
      `no numbered gate in ${rel(dir)} — the gate step did not write one`,
    );
  else if (!gate)
    out.problems.push(
      `cycle ${c.cycle} gate: ${g.problem} — rename or remove the stray file, then re-run`,
    );
  if (c.cycle && !report)
    out.problems.push(
      `cycle ${c.cycle} QA report: ${q.problem} — write it (or remove the stray file), then re-run`,
    );
  out.cycle = c.cycle || null;

  const failedStage = new Set();
  // A lock that outlasted one path's backoff is not a moment's refresh: later paths
  // try once, so a persistent lock costs one backoff (1.4 s), not one per path.
  let lockOutlasted = false;
  const stage = (abs) => {
    let r;
    let attempts = 0;
    let locked = false;
    for (const wait of lockOutlasted ? [0] : STAGE_WAITS) {
      if (wait) sleepMs(wait);
      attempts += 1;
      r = git(["add", "--", rel(abs)], root);
      locked = /index\.lock/.test(r.stderr);
      // Only a held lock is worth waiting out; any other failure will not clear.
      if (r.status === 0 || !locked) break;
    }
    out.stageAttempts[rel(abs)] = attempts;
    if (r.status !== 0 && locked) lockOutlasted = true;
    if (r.status !== 0) {
      failedStage.add(rel(abs));
      const tried = `after ${attempts} attempt${attempts > 1 ? "s" : ""}`;
      out.problems.push(
        `could not stage ${rel(abs)} (${r.stderr.trim() || `git exit ${r.status}`}) — ${locked ? "a held .git/index.lock? retry " : ""}(${tried})`,
      );
      return false;
    }
    out.staged.push(rel(abs));
    return true;
  };

  for (const f of [doc, gate, report]) if (f) stage(f);

  // Pass 1 — stage the untracked link targets that belong to this work item.
  // Both passes must have read the index. checkDocument falls back to the disk
  // when its git calls fail, and on the disk an untracked file reads as present —
  // a clean verdict that never looked at the index (TASK-149-BUG-8).
  const readLinks = () => {
    const l = engines.docLinks.checkDocument(doc, { root });
    if (!l.tracked)
      throw new Error(
        "doc-links could not read the index (git failed) — nothing was checked",
      );
    return l;
  };
  let links = readLinks();
  for (const b of links.broken) {
    if (b.state !== "untracked") continue;
    const abs = path.join(root, b.resolved);
    const inside = engines.docLinks.isWithin(dir, abs);
    if (inside && fs.lstatSync(abs).isFile()) stage(abs);
  }

  // Pass 2 — the decision. After pass 1, every broken link is one staging here
  // cannot or must not fix.
  links = readLinks();
  for (const b of links.broken) {
    out.links.push({ line: b.line, target: b.target, state: b.state });
    // Already reported as "could not stage" in pass 1 — one problem, one message.
    if (b.state === "untracked" && failedStage.has(b.resolved)) continue;
    out.problems.push(
      `${b.target} (line ${b.line}) ${REMEDY[b.state] ? REMEDY[b.state](rel(dir)) : `is ${b.state} — write the artifact or fix the link`}`,
    );
  }
  // task.158 — existence is not the claim. The document must link THIS cycle's
  // gate and report: a cycle-2 document still linking gate.1 / qa.1 resolves
  // every link and has a Change Log row, and read clean before this check.
  const linked = new Set(links.resolved);
  for (const [what, abs] of [
    ["gate", gate],
    ["QA report", report],
  ]) {
    if (abs && !linked.has(rel(abs)))
      out.problems.push(
        `the document does not link this cycle's ${what} ${path.basename(abs)} — the Step 12 edit did not land (or it still links a previous cycle's)`,
      );
  }
  if (links.unterminatedFence)
    out.problems.push(
      `a fence opened at line ${links.unterminatedFence} never closes — links after it were not checked`,
    );

  const text = fs.readFileSync(doc, "utf8");
  if (gate) out.problems.push(...verdictProblems(engines, text, gate));

  const coherence = engines.changeLog.checkUpdatedCoherence(text);
  out.changeLog = coherence;
  if (coherence.reason === "no-log")
    out.problems.push("no Change Log row — the verdict row did not land");
  else if (coherence.reason === "stale-updated")
    out.problems.push(
      `the newest Change Log row (${coherence.newest}) is dated after updated: ${coherence.updated} — apply bumpUpdated(content, "${coherence.newest}")`,
    );

  const exitCode = out.problems.length ? 1 : 0;
  return {
    ...out,
    exitCode,
    reason: exitCode ? "halt" : "clean",
    doc: rel(doc),
    gate: gate && rel(gate),
    report: report && rel(report),
  };
}

function main(argv) {
  const json = argv.includes("--json");
  let doc = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--json") continue;
    if (
      argv[i] === "--doc" &&
      argv[i + 1] !== undefined &&
      !argv[i + 1].startsWith("--")
    ) {
      doc = argv[(i += 1)];
      continue;
    }
    return report(
      {
        exitCode: 2,
        reason: "usage",
        error: `unknown or incomplete argument ${argv[i]}`,
      },
      json,
    );
  }
  if (!doc || /[{}]/.test(doc))
    return report(
      {
        exitCode: 2,
        reason: "usage",
        error: doc
          ? `--doc ${doc} is an unsubstituted placeholder`
          : "--doc is required",
      },
      json,
    );
  return report(readBack(doc), json);
}

function report(r, json) {
  if (json) {
    process.stdout.write(JSON.stringify(r, null, 2) + "\n");
    return r.exitCode;
  }
  if (r.exitCode === 2) {
    process.stderr.write(
      `qa-read-back: could not look — ${r.error}\nusage: qa-read-back.js --doc <work-item.md> [--json]\n`,
    );
    return 2;
  }
  for (const s of r.staged) process.stdout.write(`  staged: ${s}\n`);
  for (const p of r.problems) process.stdout.write(`✖ ${p}\n`);
  process.stdout.write(
    r.exitCode
      ? `HALT qa-read-back: ${r.problems.length} problem(s) in ${r.doc} — do not post the QA comment over this\n`
      : `ok qa-read-back: ${r.doc} — gate, report and Change Log row present; every link resolves against the index; the verdict is this cycle's\n`,
  );
  return r.exitCode;
}

module.exports = { readBack, main };

// process.exitCode, never a hard exit: exiting after a stdout write truncates
// the write when the caller pipes it (bug.3).
if (require.main === module) process.exitCode = main(process.argv.slice(2));
