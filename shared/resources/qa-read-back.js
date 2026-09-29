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
 *             in the document resolves against the index, and `updated:` accounts
 *             for the newest row
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
    };
  } catch (e) {
    return { error: e.message };
  }
}

function git(args, cwd) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
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

/**
 * True when `child` is `parent` or beneath it. `..name` is a child, not an
 * escape: only `..` itself or a `../` prefix leaves (CR6-4) — the same test
 * qa-execute-snippets.mjs isWithin() applies.
 */
function isWithin(parent, child) {
  const rel = path.relative(parent, child);
  return !(
    rel === ".." ||
    rel.startsWith(`..${path.sep}`) ||
    path.isAbsolute(rel)
  );
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
};

function readBack(docArg) {
  // TASK-149-BUG-8 — a run that could not complete is exit 2. An error the
  // body did not anticipate (an unreadable file, a throw from an engine) would
  // otherwise exit 1 with a stack trace and read as a HALT.
  try {
    return readBackUnguarded(docArg);
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

function readBackUnguarded(docArg) {
  const out = { problems: [], staged: [], links: [] };
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
  const stage = (abs) => {
    const r = git(["add", "--", rel(abs)], root);
    if (r.status !== 0) {
      failedStage.add(rel(abs));
      out.problems.push(
        `could not stage ${rel(abs)} (${r.stderr.trim() || `git exit ${r.status}`}) — a held .git/index.lock? retry`,
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
    const inside = isWithin(dir, abs);
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
  if (links.unterminatedFence)
    out.problems.push(
      `a fence opened at line ${links.unterminatedFence} never closes — links after it were not checked`,
    );

  const coherence = engines.changeLog.checkUpdatedCoherence(
    fs.readFileSync(doc, "utf8"),
  );
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
      : `ok qa-read-back: ${r.doc} — gate, report and Change Log row present; every link resolves against the index\n`,
  );
  return r.exitCode;
}

module.exports = { readBack, main };

// process.exitCode, never a hard exit: exiting after a stdout write truncates
// the write when the caller pipes it (bug.3).
if (require.main === module) process.exitCode = main(process.argv.slice(2));
