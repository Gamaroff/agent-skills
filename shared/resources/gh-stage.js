#!/usr/bin/env node
/**
 * gh-stage — set the GitHub Projects v2 Status field a pipeline MOMENT implies.
 *
 * The Jira twin walks a ladder because a Jira workflow can refuse a move. A
 * Projects v2 single-select cannot: every option is settable from every other.
 * So there is no transition graph, no "not reachable from here", and no walking.
 *
 * The consequence is that the backward-move guard is the ONLY thing stopping a
 * resumed run from dragging a card out of Done. On Jira the workflow is a second
 * brake; here there is none. The guard is therefore mandatory, not advisory.
 *
 * A skip here also means something different. On Jira "no transition from here"
 * is frequently correct. On GitHub `no-option` can only mean the Status field
 * has no such option at all — always a configuration error. Say so loudly.
 *
 * Usage:
 *   gh-stage.js --issue 123 --stage in-review [--json] [--dry-run]
 *               [--strict] [--allow-regress] [--add-to-board]
 *               [--board <number|name>] [--field <name>]
 *   gh-stage.js --probe-board [--write-ladder]   (read-only)
 *
 * Exit codes (transcribed from jira-stage.js:21-27 so this is a drop-in
 * replacement for the `|| echo "⚠️ …"` subshells the step files use today):
 *   0  transitioned, already there, stage-disabled, no-option, not-on-board,
 *      ambiguous-board, no-credentials, would-regress, dry-run — and any
 *      unhandled throw
 *   1  a skip, but only under --strict
 *   2  usage error (unknown moment, missing --issue)
 *
 * Zero non-transition exit codes matter: pipeline steps run inside shells, and
 * a non-zero exit on "this board has no review column" would kill the run.
 *
 * This module depends on tracker-workflow.js and NOTHING else in shared/. In
 * particular it must never require jira-sync.js: that file is ~4,100 lines of
 * Jira machinery, and a GitHub-only consumer bundling it would pay for a tracker
 * they do not use. `makeOutput` and `loadDotEnv` are therefore reimplemented
 * below rather than imported — see the comments on each.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync, execSync } = require("child_process");

const tw = require("./tracker-workflow.js");
const { parseYamlSubset } = require("./yaml-subset.js");

const GIT_EXEC_OPTS = {
  encoding: "utf-8",
  stdio: ["ignore", "pipe", "ignore"],
};

const DEFAULT_STATUS_FIELD = "Status";

// ---------------------------------------------------------------------------
// Output mode
// ---------------------------------------------------------------------------
// A verbatim reimplementation of jira-sync.js:79-96. Copied rather than imported
// for the dependency reason in the header. The semantics are load-bearing and
// easy to get subtly wrong:
//   log/info  suppressed by EITHER --json or --quiet
//   warn      suppressed only by --json, so it survives --quiet
//   err       always writes
//   emit      writes UNCONDITIONALLY, not gated on --json — that is what makes
//             --probe-board machine-readable on its own.
function makeOutput({ json = false, quiet = false } = {}) {
  return {
    log: (...a) => {
      if (!json && !quiet) console.log(...a);
    },
    info: (...a) => {
      if (!json && !quiet) console.log(...a);
    },
    warn: (...a) => {
      if (!json) console.warn(...a);
    },
    err: (...a) => console.error(...a),
    emit: (payload) =>
      process.stdout.write(JSON.stringify(payload, null, 2) + "\n"),
    isJson: json,
    isQuiet: quiet,
  };
}

// ---------------------------------------------------------------------------
// .env loading
// ---------------------------------------------------------------------------
// Also a local copy (jira-sync.js:~40-74). `gh` carries its own auth, so this is
// only here for the config keys below — but a consumer who sets
// GH_PROJECT_STATUS_FIELD in .env rather than the shell should still be heard.
// Never overwrites an already-set key, and swallows everything.
function loadDotEnv(repoRoot) {
  try {
    const root = repoRoot || repoRootOf();
    if (!root) return;
    const envPath = path.join(root, ".env");
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 1) continue;
      const key = t.slice(0, eq).trim();
      const val = t
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch (_) {}
}

function repoRootOf(repoRoot) {
  if (repoRoot) return repoRoot;
  try {
    return execSync("git rev-parse --show-toplevel", GIT_EXEC_OPTS).trim();
  } catch (_) {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Config resolution
// ---------------------------------------------------------------------------
// Mirrors set-github-project-estimate.sh:29-61's env → skills-config.yaml →
// default order, but reads the YAML with parseYamlSubset instead of shelling to
// python-or-awk. Same precedence, one implementation, no interpreter guessing.
function readYamlFile(root, rel) {
  try {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) return null;
    return parseYamlSubset(fs.readFileSync(p, "utf-8"));
  } catch (_) {
    return null;
  }
}

function resolveStatusFieldName(root) {
  if (process.env.GH_PROJECT_STATUS_FIELD)
    return process.env.GH_PROJECT_STATUS_FIELD;
  const cfg = readYamlFile(root, "skills-config.yaml");
  const v = cfg && cfg.github && cfg.github.projectStatusField;
  return (v && String(v).trim()) || DEFAULT_STATUS_FIELD;
}

/** `{ owner, repo, board }` from project.yml, any of which may be empty. */
function readProjectYml(root) {
  const doc = readYamlFile(root, "project.yml");
  const gh = (doc && doc.github) || {};
  return {
    owner: gh.owner ? String(gh.owner).trim() : "",
    repo: gh.repo ? String(gh.repo).trim() : "",
    boardNumber:
      gh.project_board_number !== undefined && gh.project_board_number !== null
        ? String(gh.project_board_number).trim()
        : "",
    boardName: gh.project_board_name
      ? String(gh.project_board_name).trim()
      : "",
  };
}

function resolveConfiguredBoard(root) {
  const cfg = readYamlFile(root, "skills-config.yaml");
  const v = cfg && cfg.github && cfg.github.projectBoard;
  return v !== undefined && v !== null && String(v).trim()
    ? String(v).trim()
    : "";
}

// ---------------------------------------------------------------------------
// Option matching — the pure core
// ---------------------------------------------------------------------------
/**
 * Pick the board option a moment's candidates name.
 *
 * Deliberately dumber than jira-sync.js's resolveTransition:
 *   1 already · 2 exact case-insensitive match per candidate in order · 3 stop.
 *
 * No prefix matching — that is what makes "In Review" match "In Review
 * (blocked)". No fuzzy matching. No status-category analogue, because a
 * single-select has no categories. `eqName` (tracker-workflow.js) supplies the
 * one matching discipline: emoji-stripped, case-insensitive, trimmed.
 *
 * `candidates` is `resolveMoment(...).targets` — PLURAL, in preference order.
 * Reducing it to targets[0] makes alternative spellings of a column unreachable,
 * which is the regression the plural return exists to prevent.
 */
function resolveOption(options, candidates, current) {
  const opts = options || [];
  const cands = candidates || [];
  if (current && cands.some((c) => tw.eqName(c, current)))
    return { match: null, reason: "already" };
  for (const c of cands) {
    const hit = opts.find((o) => tw.eqName(o.name, c));
    if (hit) return { match: hit, rule: `option="${c}"` };
  }
  return { match: null, reason: "no-option" };
}

/**
 * Which OTHER moments the board's existing options already serve.
 *
 * The GitHub analogue of jira-stage.js:127 describeAlternatives, and the single
 * highest-value thing to bring across: it turns "nothing moved" into a one-line
 * diagnosis. The asymmetry is in the framing, not the mechanism — on Jira a
 * missing hop is often correct, so the hint reads as information; here it is
 * always a misconfiguration, so the hint reads as "you probably meant this".
 */
function describeAlternatives(options, moment, workflow, issueType) {
  const hints = [];
  const seen = new Set();
  for (const other of tw.MOMENTS) {
    if (other === moment) continue;
    const spec = tw.resolveMoment(other, workflow, { issueType });
    if (!spec) continue;
    for (const target of spec.targets || []) {
      const hit = (options || []).find((o) => tw.eqName(o.name, target));
      if (hit && !seen.has(hit.name)) {
        seen.add(hit.name);
        hints.push(
          `"${hit.name}" is present and is the target for moment ${other}`,
        );
        break;
      }
    }
  }
  return hints;
}

// ---------------------------------------------------------------------------
// gh transport
// ---------------------------------------------------------------------------
// Auth stays in `gh`, matching every other GitHub call in this repo. There is no
// second transport and no MCP fallback: `gh` is either authenticated or it is
// not, so `no-credentials` here is a dead end, not a handoff. Do not add a
// fallback protocol document for this — none can exist.
function makeExec(execImpl) {
  if (execImpl) return execImpl;
  return (args, opts) =>
    execFileSync("gh", args, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      ...(opts || {}),
    });
}

function ghAvailable(exec) {
  try {
    exec(["auth", "status"]);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Retry a `gh` call three times, sleeping 1s then 2s.
 *
 * The shell helper `tracker_call_with_retry` (resolve-platform.sh:69-80) wraps
 * `gh issue` calls but no board mutation, and board mutations fail transiently
 * at least as often. It is shell-only and cannot wrap a JS call, so the 3×
 * backoff is reimplemented here with the same shape — including the detail that
 * the last attempt does not sleep before returning.
 */
function withRetry(fn, { attempts = 3, sleepMs = sleepSync } = {}) {
  let lastErr;
  const delays = [1000, 2000];
  for (let i = 0; i < attempts; i++) {
    try {
      return fn();
    } catch (e) {
      lastErr = e;
      if (i < delays.length) sleepMs(delays[i]);
    }
  }
  throw lastErr;
}

// Synchronous by design: every other call in this CLI is execFileSync, and an
// async sleep here would be the only await in the file.
function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch (_) {}
}

const BOARD_QUERY = (owner, repo, issue, statusField) => `
{
  repository(owner: "${owner}", name: "${repo}") {
    issue(number: ${issue}) {
      projectItems(first: 10) {
        nodes {
          id
          fieldValueByName(name: "${statusField}") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          project {
            id
            title
            number
            fields(first: 50) {
              nodes {
                ... on ProjectV2SingleSelectField { id name options { id name } }
              }
            }
          }
        }
      }
    }
  }
}`;

/**
 * The single board read: item id, project id/title/number, the Status field id,
 * all its option ids/names in board order, AND the current value.
 *
 * That last one is the real addition — steps 0, 4 and 7 do not fetch the current
 * value today, which is why none of them can implement a guard. Option order
 * matters too: `options` comes back in board order, and a Projects board's
 * option order IS its workflow order, which is what --write-ladder reads.
 */
function readBoard({ exec, owner, repo, issue, statusField }) {
  const raw = exec([
    "api",
    "graphql",
    "-f",
    `query=${BOARD_QUERY(owner, repo, issue, statusField)}`,
  ]);
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (e) {
    throw new Error(`could not parse gh api response: ${e.message}`);
  }
  const nodes =
    (doc &&
      doc.data &&
      doc.data.repository &&
      doc.data.repository.issue &&
      doc.data.repository.issue.projectItems &&
      doc.data.repository.issue.projectItems.nodes) ||
    [];
  return nodes.map((n) => normalizeItem(n, statusField)).filter(Boolean);
}

function normalizeItem(node, statusField) {
  if (!node || !node.id) return null;
  const project = node.project || {};
  const fields = ((project.fields && project.fields.nodes) || []).filter(
    (f) => f && f.name,
  );
  // `fields(first: 50)` returns every field type; the inline fragment leaves
  // non-single-select ones as `{}`, which the filter above drops. A board with
  // no Status field at all lands here as `statusFieldId: null` — a skip, not a
  // crash.
  const statusFieldNode = fields.find((f) => tw.eqName(f.name, statusField));
  return {
    itemId: node.id,
    current: (node.fieldValueByName && node.fieldValueByName.name) || "",
    projectId: project.id || "",
    projectTitle: project.title || "",
    projectNumber:
      project.number !== undefined && project.number !== null
        ? String(project.number)
        : "",
    statusFieldId: statusFieldNode ? statusFieldNode.id : null,
    // Board order is preserved — --write-ladder depends on it.
    options: statusFieldNode ? (statusFieldNode.options || []).slice() : [],
  };
}

/**
 * Choose which board to act on.
 *
 * set-github-project-*.sh fan out to EVERY board the issue is on. That is fine
 * for an estimate and wrong for a status: a status change is a claim about where
 * the work is, visible to whoever reads that board. So: never fan out.
 *
 *   1 exactly one board            → use it
 *   2 --board                      → that one
 *   3 github.projectBoard          → that one
 *   4 project.yml number / name    → that one
 *   5 otherwise                    → skip, "ambiguous-board", naming them
 */
function selectBoard(items, { board, configured, projectYml }) {
  if (items.length === 0) return { item: null, reason: "not-on-board" };
  if (items.length === 1) return { item: items[0], rule: "only-board" };

  const tryHint = (hint, rule) => {
    if (!hint) return null;
    const h = String(hint).trim();
    const hit = items.find(
      (i) => i.projectNumber === h || tw.eqName(i.projectTitle, h),
    );
    return hit ? { item: hit, rule } : null;
  };

  return (
    tryHint(board, "--board") ||
    tryHint(configured, "github.projectBoard") ||
    tryHint(projectYml.boardNumber, "project.yml project_board_number") ||
    tryHint(projectYml.boardName, "project.yml project_board_name") || {
      item: null,
      reason: "ambiguous-board",
      candidates: items.map((i) => `${i.projectTitle} (#${i.projectNumber})`),
    }
  );
}

/**
 * Add the issue to the board, then wait for the Projects API to catch up.
 *
 * Ported from develop-pipeline-step-0-resolve-and-prepare.md:373-441 rather than
 * reinvented: item-add, sleep 3, read, and if the read comes back empty sleep 5
 * and read exactly once more. That delay is real Projects API propagation
 * behaviour, not scaffolding — the step file has carried it for as long as the
 * block has existed. The step file re-inlines the whole query for its retry;
 * here it is one function called twice.
 */
function ensureOnBoard({
  exec,
  owner,
  repo,
  issue,
  statusField,
  boardNum,
  sleepMs = sleepSync,
}) {
  try {
    withRetry(
      () =>
        exec([
          "project",
          "item-add",
          String(boardNum),
          "--owner",
          owner,
          "--url",
          `https://github.com/${owner}/${repo}/issues/${issue}`,
        ]),
      { sleepMs },
    );
  } catch (_) {
    // item-add is idempotent and commonly "fails" because the item is already
    // present. The read below is the actual test of whether it worked.
  }
  sleepMs(3000);
  let items = readBoard({ exec, owner, repo, issue, statusField });
  if (items.length === 0) {
    sleepMs(5000);
    items = readBoard({ exec, owner, repo, issue, statusField });
  }
  return items;
}

const MUTATION = (projectId, itemId, fieldId, optionId) => `
mutation {
  updateProjectV2ItemFieldValue(input: {
    projectId: "${projectId}"
    itemId: "${itemId}"
    fieldId: "${fieldId}"
    value: { singleSelectOptionId: "${optionId}" }
  }) { projectV2Item { id } }
}`;

function setOption({ exec, item, optionId, sleepMs = sleepSync }) {
  const raw = withRetry(
    () =>
      exec([
        "api",
        "graphql",
        "-f",
        `query=${MUTATION(item.projectId, item.itemId, item.statusFieldId, optionId)}`,
      ]),
    { sleepMs },
  );
  let doc = null;
  try {
    doc = JSON.parse(raw);
  } catch (_) {}
  if (doc && Array.isArray(doc.errors) && doc.errors.length) {
    throw new Error(doc.errors.map((e) => e && e.message).join("; "));
  }
  return true;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    issue: "",
    stage: "",
    json: false,
    quiet: false,
    dryRun: false,
    strict: false,
    allowRegress: false,
    addToBoard: false,
    probeBoard: false,
    writeLadder: false,
    board: "",
    field: "",
    issueType: "",
    help: false,
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--issue":
      case "-i":
        opts.issue = args[++i];
        break;
      case "--stage":
      case "-s":
        opts.stage = args[++i];
        break;
      case "--board":
        opts.board = args[++i];
        break;
      case "--field":
        opts.field = args[++i];
        break;
      case "--issue-type":
        opts.issueType = args[++i];
        break;
      case "--probe-board":
        opts.probeBoard = true;
        break;
      case "--write-ladder":
        opts.writeLadder = true;
        break;
      case "--add-to-board":
        opts.addToBoard = true;
        break;
      case "--json":
        opts.json = true;
        break;
      case "--quiet":
        opts.quiet = true;
        break;
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--strict":
        opts.strict = true;
        break;
      case "--allow-regress":
        opts.allowRegress = true;
        break;
      case "--help":
      case "-h":
        opts.help = true;
        break;
      default:
        if (args[i].startsWith("-"))
          throw new Error(`Unknown option: ${args[i]}`);
    }
  }
  return opts;
}

const USAGE = `Usage: gh-stage --issue <N> --stage <${tw.MOMENTS.join("|")}>
              [--json] [--quiet] [--dry-run] [--strict] [--allow-regress]
              [--add-to-board] [--board <number|name>] [--field <name>]
       gh-stage --probe-board [--write-ladder] [--board <number|name>]
              (read-only; --write-ladder writes tracker-workflow.yaml only when absent)`;

function run({ argv = process.argv, execImpl = null, repoRoot = undefined } = {}) {
  const root = repoRootOf(repoRoot);
  loadDotEnv(root);

  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    console.error(USAGE);
    return { exitCode: 2 };
  }

  const output = makeOutput({ json: args.json, quiet: args.quiet });

  if (args.help) {
    output.log(USAGE);
    return { exitCode: 0 };
  }

  const emit = (payload, exitCode) => {
    if (args.json) output.emit({ ...payload, stage: args.stage, exitCode });
    return { exitCode, ...payload };
  };

  // --probe-board reads a board; every other mode moves one card on it.
  if (!args.probeBoard) {
    if (!args.issue || !args.stage) {
      output.err("Error: --issue and --stage are both required");
      output.err(USAGE);
      return { exitCode: 2 };
    }
    if (!/^\d+$/.test(String(args.issue).trim())) {
      output.err(`Error: --issue must be a number, got "${args.issue}"`);
      return { exitCode: 2 };
    }
    if (!tw.MOMENTS.includes(String(args.stage).toLowerCase())) {
      output.err(
        `Error: unknown moment "${args.stage}". Known: ${tw.MOMENTS.join(", ")}`,
      );
      return { exitCode: 2 };
    }
    args.stage = String(args.stage).toLowerCase();
  }

  const workflow = tw.loadWorkflow(repoRoot ? { repoRoot } : {});
  const statusField = args.field || resolveStatusFieldName(root);
  const projectYml = readProjectYml(root);
  const configuredBoard = args.board || resolveConfiguredBoard(root);

  const exec = makeExec(execImpl);

  // `gh` missing or unauthenticated is a dead end, not a handoff — there is no
  // second transport. One warning, exit 0, and the message must not imply a
  // fallback exists.
  if (!ghAvailable(exec)) {
    output.info(
      "ℹ️  gh is unavailable or not authenticated — no board change attempted.",
    );
    return emit({ transitioned: false, reason: "no-credentials" }, 0);
  }

  const owner = projectYml.owner || repoContext(exec, "owner");
  const repo = projectYml.repo || repoContext(exec, "name");
  if (!owner || !repo) {
    output.warn("⚠️  Could not resolve repo context — skipping board update.");
    return emit({ transitioned: false, reason: "no-repo-context" }, 0);
  }

  if (args.probeBoard)
    return probeBoard({
      exec,
      owner,
      repo,
      statusField,
      workflow,
      args,
      output,
      emit,
      root,
      projectYml,
      configuredBoard,
    });

  // Omission from `pipeline:` is the only way to switch a moment off, so a null
  // here is deliberate disablement — never a reason to fall back to a default.
  const moment = tw.resolveMoment(args.stage, workflow, {
    issueType: args.issueType,
  });
  if (!moment) {
    output.info(
      `⏭️  Moment ${args.stage} is not declared in the workflow — nothing to do.`,
    );
    return emit({ transitioned: false, reason: "stage-disabled" }, 0);
  }

  let items;
  try {
    items =
      args.addToBoard && !args.dryRun
        ? ensureOnBoard({
            exec,
            owner,
            repo,
            issue: args.issue,
            statusField,
            boardNum: boardHintNumber(configuredBoard, projectYml),
          })
        : readBoard({ exec, owner, repo, issue: args.issue, statusField });
  } catch (e) {
    output.warn(`⚠️  Could not read the board: ${e.message}`);
    return emit({ transitioned: false, reason: "board-unreadable" }, 0);
  }

  // --dry-run must not run item-add. This is the one place a naive port of
  // jira-stage.js is unsafe: the Jira dry-run is GET-only because that whole
  // flow is GET-then-POST, but step-0's GitHub block runs `gh project item-add`
  // BEFORE its read query. Announce the intent instead of performing it.
  if (args.dryRun && args.addToBoard) {
    output.info(
      `🔎 would add issue #${args.issue} to board ${
        boardHintNumber(configuredBoard, projectYml) || "(unresolved)"
      } (skipped: --dry-run)`,
    );
  }

  const picked = selectBoard(items, {
    board: args.board,
    configured: configuredBoard,
    projectYml,
  });

  if (!picked.item) {
    if (picked.reason === "ambiguous-board") {
      output.warn(
        `⚠️  issue #${args.issue} is on ${items.length} boards and none was selected — ` +
          `pass --board, or set github.projectBoard. Candidates: ${picked.candidates.join(", ")}`,
      );
      return emit(
        {
          transitioned: false,
          reason: "ambiguous-board",
          candidates: picked.candidates,
        },
        args.strict ? 1 : 0,
      );
    }
    output.warn(
      `⚠️  issue #${args.issue} is not on any project board — nothing to move.`,
    );
    return emit(
      { transitioned: false, reason: "not-on-board" },
      args.strict ? 1 : 0,
    );
  }

  const item = picked.item;
  const label = `#${args.issue} [board "${item.projectTitle}"]`;

  if (!item.statusFieldId) {
    output.warn(
      `⚠️  board "${item.projectTitle}" has no "${statusField}" single-select field — skipping.`,
    );
    return emit(
      { transitioned: false, reason: "no-status-field", board: item.projectTitle },
      args.strict ? 1 : 0,
    );
  }

  const r = resolveOption(item.options, moment.targets, item.current);

  if (r.reason === "already") {
    output.info(`✅ ${label} is already "${item.current}".`);
    return emit(
      { transitioned: false, reason: "already", from: item.current },
      0,
    );
  }

  if (!r.match) {
    const offered = item.options.map((o) => o.name).join(", ") || "(none)";
    // Deliberately NOT the Jira wording. On Jira "no transition from here" is
    // frequently correct; here it can only mean the field has no such option at
    // all, which is always a configuration error.
    output.warn(
      `⚠️  no option matching [${moment.targets.join(", ")}] on board ` +
        `"${item.projectTitle}" — board offers: ${offered}`,
    );
    for (const h of describeAlternatives(
      item.options,
      args.stage,
      workflow,
      args.issueType,
    ))
      output.warn(`   ↪ ${h}`);
    return emit(
      {
        transitioned: false,
        reason: "no-option",
        targets: moment.targets,
        offered: item.options.map((o) => o.name),
      },
      args.strict ? 1 : 0,
    );
  }

  // The guard. Ranks come from the ladder — which is exactly why the ladder
  // matters on a tracker with no transition graph: without a declared order
  // rankOf returns null for every bespoke column and the guard is inert.
  // Unranked either side → no opinion, allow (same semantics as the Jira
  // monotonicity guard at jira-sync.js:2933-2957).
  const curRank = tw.rankOf(item.current, workflow, { issueType: args.issueType });
  const tgtRank = tw.rankOf(r.match.name, workflow, { issueType: args.issueType });
  if (!args.allowRegress && curRank != null && tgtRank != null && curRank > tgtRank) {
    output.info(
      `⏭️  ${label} is already at "${item.current}" (rank ${curRank}), past ` +
        `"${r.match.name}" (rank ${tgtRank}) — not moving it backwards.`,
    );
    return emit(
      {
        transitioned: false,
        reason: "would-regress",
        from: item.current,
        to: r.match.name,
        currentRank: curRank,
        targetRank: tgtRank,
      },
      0,
    );
  }

  if (args.dryRun) {
    output.info(
      `🔎 ${label} @ "${item.current || "(unset)"}" — moment ${args.stage}: ` +
        `would set "${r.match.name}" (via ${r.rule})`,
    );
    return emit(
      {
        transitioned: false,
        reason: "dry-run",
        would: r.match.name,
        from: item.current,
        board: item.projectTitle,
      },
      0,
    );
  }

  try {
    setOption({ exec, item, optionId: r.match.id });
  } catch (e) {
    output.warn(`⚠️  Could not set ${statusField} on ${label}: ${e.message}`);
    return emit(
      { transitioned: false, reason: "mutation-failed", detail: e.message },
      args.strict ? 1 : 0,
    );
  }

  // Re-read and report the option that actually landed, rather than the one we
  // asked for. A silent no-op mutation is otherwise indistinguishable from a
  // successful one.
  let landed = r.match.name;
  try {
    const after = readBoard({ exec, owner, repo, issue: args.issue, statusField });
    const same = after.find((i) => i.itemId === item.itemId);
    if (same && same.current) landed = same.current;
  } catch (_) {}

  output.info(`✅ ${label} → "${landed}".`);
  return emit(
    {
      transitioned: true,
      reason: "transitioned",
      from: item.current,
      to: landed,
      board: item.projectTitle,
      rule: r.rule,
    },
    0,
  );
}

function repoContext(exec, field) {
  try {
    return String(
      exec(["repo", "view", "--json", field, "-q", `.${field}${field === "owner" ? ".login" : ""}`]),
    ).trim();
  } catch (_) {
    return "";
  }
}

function boardHintNumber(configured, projectYml) {
  if (configured && /^\d+$/.test(String(configured).trim()))
    return String(configured).trim();
  return projectYml.boardNumber || "";
}

// ---------------------------------------------------------------------------
// --probe-board
// ---------------------------------------------------------------------------
/**
 * Read-only board enumeration, mirroring probeWorkflow's three-verdict shape
 * (`disabled` / `→ "X"` / `skip (no-option)`) so the two outputs read side by
 * side.
 *
 * The ergonomic win over Jira lives here: a Projects board's option order IS its
 * workflow order, so --write-ladder can simply read it. Jira needs statusRank
 * hand-authored because a workflow graph has no inherent order; a single-select
 * field is a list, and the team already put it in the order work flows.
 */
function probeBoard({
  exec,
  owner,
  repo,
  statusField,
  workflow,
  args,
  output,
  emit,
  root,
  projectYml,
  configuredBoard,
}) {
  // Probing needs an issue only as a handle to reach the board through. Any
  // issue on the board answers the question "what are this board's columns?".
  const issue = args.issue || "";
  if (!issue) {
    output.err(
      "Error: --probe-board needs --issue <N> (any issue already on the board)",
    );
    return { exitCode: 2 };
  }

  let items;
  try {
    items = readBoard({ exec, owner, repo, issue, statusField });
  } catch (e) {
    output.warn(`⚠️  Could not read the board: ${e.message}`);
    return emit({ reason: "board-unreadable" }, 0);
  }

  const picked = selectBoard(items, {
    board: args.board,
    configured: configuredBoard,
    projectYml,
  });
  if (!picked.item) {
    output.warn(
      picked.reason === "ambiguous-board"
        ? `⚠️  issue #${issue} is on several boards — pass --board. Candidates: ${picked.candidates.join(", ")}`
        : `⚠️  issue #${issue} is not on any project board.`,
    );
    return emit({ reason: picked.reason, candidates: picked.candidates }, 0);
  }

  const item = picked.item;
  const optionNames = item.options.map((o) => o.name);

  output.info(`Board "${item.projectTitle}" (#${item.projectNumber})`);
  output.info(
    `${statusField} options, in board order: ${optionNames.join(" → ") || "(none)"}`,
  );
  output.info("");

  const moments = {};
  for (const m of tw.MOMENTS) {
    const spec = tw.resolveMoment(m, workflow, { issueType: args.issueType });
    if (!spec) {
      moments[m] = { verdict: "disabled" };
      output.info(`  ${m.padEnd(18)} disabled`);
      continue;
    }
    const r = resolveOption(item.options, spec.targets, "");
    if (r.match) {
      moments[m] = { verdict: "resolved", option: r.match.name };
      output.info(`  ${m.padEnd(18)} → "${r.match.name}"`);
    } else {
      moments[m] = { verdict: "no-option", targets: spec.targets };
      output.info(
        `  ${m.padEnd(18)} skip (no-option) — wanted [${spec.targets.join(", ")}]`,
      );
    }
  }

  let ladderWritten = null;
  if (args.writeLadder) ladderWritten = writeLadder({ root, optionNames, output });

  const payload = {
    reason: "probe",
    board: item.projectTitle,
    boardNumber: item.projectNumber,
    statusField,
    options: optionNames,
    moments,
    ladderWritten,
  };
  if (args.json) output.emit({ ...payload, exitCode: 0 });
  return { exitCode: 0, ...payload };
}

/**
 * Write a `statuses:` ladder derived from the board's own option order.
 *
 * Preserve an existing ladder verbatim; never overwrite silently. This mirrors
 * buildWorkflowRecord's preserve-hand-authored-intent discipline
 * (jira-sync.js:3744, whose `...(existing.X ? { X: existing.X } : {})` spreads at
 * :3771-3781 do the same job) — a hand-authored ladder encodes intent a board
 * read cannot recover.
 */
function writeLadder({ root, optionNames, output }) {
  const target = path.join(root, tw.DEFAULT_WORKFLOW_PATH);
  if (fs.existsSync(target)) {
    output.warn(
      `⚠️  ${tw.DEFAULT_WORKFLOW_PATH} already exists — leaving it untouched. ` +
        "Delete it first if you want the board's order written fresh.",
    );
    return { written: false, reason: "exists", path: target };
  }
  if (!optionNames.length) {
    output.warn("⚠️  board offered no options — nothing to write.");
    return { written: false, reason: "no-options", path: target };
  }
  const body =
    "# Generated by `gh-stage --probe-board --write-ladder`.\n" +
    "# A Projects board's option order IS its workflow order, so this ladder is\n" +
    "# the board's own Status options, read in board order. Edit freely — this\n" +
    "# file is never overwritten once it exists.\n" +
    "statuses:\n" +
    optionNames.map((n) => `  - ${JSON.stringify(n)}`).join("\n") +
    "\n";
  try {
    fs.writeFileSync(target, body);
    // Drop tracker-workflow.js's parse cache. This run already called
    // loadWorkflow() — before the file existed — so the built-in default is
    // memoised under this exact path. Without the clear, anything that probes,
    // writes and then reads (this process, or a caller chaining --write-ladder
    // into a real move) sees the pre-write ladder forever, which is the cache's
    // own documented failure mode at tracker-workflow.js:392-393.
    tw.clearWorkflowCache();
    output.info(`✅ wrote ${tw.DEFAULT_WORKFLOW_PATH} with ${optionNames.length} rungs.`);
    return { written: true, path: target, statuses: optionNames };
  } catch (e) {
    output.warn(`⚠️  Could not write ${tw.DEFAULT_WORKFLOW_PATH}: ${e.message}`);
    return { written: false, reason: "write-failed", path: target };
  }
}

if (require.main === module) {
  try {
    const r = run();
    process.exit(r.exitCode || 0);
  } catch (e) {
    // Even an unexpected throw must not kill a pipeline step.
    console.error(`⚠️  gh-stage failed: ${e && e.message}`);
    process.exit(0);
  }
}

module.exports = {
  run,
  parseArgs,
  resolveOption,
  describeAlternatives,
  selectBoard,
  normalizeItem,
  readBoard,
  ensureOnBoard,
  writeLadder,
  withRetry,
  makeOutput,
  USAGE,
};
