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
function readBoard({ exec, owner, repo, issue, statusField, onWarn }) {
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
  const errs =
    doc && Array.isArray(doc.errors) && doc.errors.length
      ? doc.errors.map((e) => e && e.message).join("; ")
      : "";
  const nodes =
    (doc &&
      doc.data &&
      doc.data.repository &&
      doc.data.repository.issue &&
      doc.data.repository.issue.projectItems &&
      doc.data.repository.issue.projectItems.nodes) ||
    [];
  const items = nodes.map((n) => normalizeItem(n, statusField)).filter(Boolean);

  // GraphQL answers partially: a response may carry `errors` for one board the
  // token cannot see AND usable nodes for the rest. Throwing on any error at all
  // would turn a perfectly movable card into `board-unreadable`.
  //
  // So: throw only when nothing usable came back — that is the real failure (bad
  // scope, rate limit, unknown repo), and it must not be reported as the benign
  // `not-on-board` skip. Otherwise warn and proceed with what resolved.
  //
  // Deliberately unlike setOption, where all-or-nothing IS correct: a mutation
  // either applied or it did not, and there is no partial state to salvage.
  if (errs && !items.length) throw new Error(errs);
  if (errs && onWarn) onWarn(errs);
  return items;
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

  const yml = projectYml || {};
  const candidates = items.map((i) => `${i.projectTitle} (#${i.projectNumber})`);
  const match = (hint) => {
    const h = String(hint).trim();
    return items.find(
      (i) => i.projectNumber === h || tw.eqName(i.projectTitle, h),
    );
  };

  // Precedence, most specific first. Only tiers that are actually SET are
  // considered — but the first one that IS set is authoritative.
  //
  // A tier may hold SEVERAL hints that all describe the SAME board. project.yml
  // is exactly that: `project_board_number` and `project_board_name` are two
  // spellings of one board, so they belong to one tier. Failing closed between
  // them would make the name unreachable whenever the number is set — which is
  // the normal config — and a stale number would then refuse a move the name
  // resolves perfectly well.
  const tiers = [
    { hints: [[board, "--board"]] },
    { hints: [[configured, "github.projectBoard"]] },
    {
      hints: [
        [yml.boardNumber, "project.yml project_board_number"],
        [yml.boardName, "project.yml project_board_name"],
      ],
    },
  ];

  for (const tier of tiers) {
    const set = tier.hints.filter(([hint]) => !!hint);
    if (!set.length) continue; // wholly absent — fall through to the next tier
    for (const [hint, rule] of set) {
      const hit = match(hint);
      if (hit) return { item: hit, rule };
    }
    // SET BUT UNMATCHED — fail closed, without consulting a lower tier.
    //
    // Falling through here is what made a mistyped `--board 999` land on
    // whatever project.yml happened to name: a status change on a board the
    // operator explicitly did not ask for, which is precisely the outcome the
    // never-fan-out rule exists to prevent. `hint absent` and `hint present but
    // wrong` are different questions and must not share an answer.
    return {
      item: null,
      reason: "ambiguous-board",
      unmatchedHint: set.map(([h]) => String(h).trim()).join(" / "),
      unmatchedRule: set.map(([, r]) => r).join(" / "),
      candidates,
    };
  }

  return { item: null, reason: "ambiguous-board", candidates };
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
  // The errors check lives INSIDE the retried closure on purpose. A GraphQL
  // error envelope is a *successful* process exit — `gh` returns 0 and prints
  // the errors — so checking it outside meant withRetry never saw a failure and
  // exactly one mutation was ever issued. Board mutations fail transiently at
  // least as often as the `gh issue` calls the shell helper already wraps, so
  // this is the one path that most needed the retry and was not getting it.
  withRetry(
    () => {
      const raw = exec([
        "api",
        "graphql",
        "-f",
        `query=${MUTATION(item.projectId, item.itemId, item.statusFieldId, optionId)}`,
      ]);
      let doc = null;
      try {
        doc = JSON.parse(raw);
      } catch (_) {}
      if (doc && Array.isArray(doc.errors) && doc.errors.length) {
        throw new Error(doc.errors.map((e) => e && e.message).join("; "));
      }
      return raw;
    },
    { sleepMs },
  );
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

function run({
  argv = process.argv,
  execImpl = null,
  repoRoot = undefined,
  // Injectable so tests exercise the retry and propagation paths without paying
  // their real wall-clock cost. Production always uses the real sleep.
  sleepImpl = sleepSync,
} = {}) {
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

  // Surfaced when a board read returns errors for SOME board but usable nodes
  // for others — a warning, because the card we care about may still be movable.
  const onWarn = (m) =>
    output.warn(`⚠️  board read reported errors (continuing with what resolved): ${m}`);

  // --probe-board reads a board; every other mode moves one card on it.
  // Hoisted out of the non-probe branch: EVERY path that reaches the network
  // interpolates --issue straight into the GraphQL document, and --probe-board
  // is no exception. Validating it only on the move path left the probe able to
  // inject arbitrary text into the query.
  if (args.issue && !/^\d+$/.test(String(args.issue).trim())) {
    output.err(`Error: --issue must be a number, got "${args.issue}"`);
    return { exitCode: 2 };
  }

  if (!args.probeBoard) {
    if (!args.issue || !args.stage) {
      output.err("Error: --issue and --stage are both required");
      output.err(USAGE);
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
  // Kept SEPARATE from args.board. Folding `--board` into this made the second
  // precedence tier in selectBoard dead whenever --board was given, and hid the
  // fail-closed behaviour behind a duplicate value.
  const configuredBoard = resolveConfiguredBoard(root);

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
      onWarn,
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

  let addBoardNum = boardHintNumber(args.board, configuredBoard, projectYml);

  let items;
  try {
    items =
      args.addToBoard && !args.dryRun && addBoardNum
        ? ensureOnBoard({
            exec,
            owner,
            repo,
            issue: args.issue,
            statusField,
            boardNum: addBoardNum,
            sleepMs: sleepImpl,
          })
        : readBoard({ exec, owner, repo, issue: args.issue, statusField, onWarn });

    // A TITLE-valued hint cannot become a number until some board has been read
    // — `item-add` takes a number, and the title→number map only exists in the
    // read response. So when the first pass could not resolve one, retry the
    // resolution against what we just read and add then. Without this second
    // pass the documented `--add-to-board --board "<title>"` could never add,
    // because the only call site ran before any read.
    if (args.addToBoard && !args.dryRun && !addBoardNum) {
      addBoardNum = boardHintNumber(
        args.board,
        configuredBoard,
        projectYml,
        items,
      );
      if (addBoardNum) {
        items = ensureOnBoard({
          exec,
          owner,
          repo,
          issue: args.issue,
          statusField,
          boardNum: addBoardNum,
          sleepMs: sleepImpl,
        });
      } else {
        output.warn(
          "⚠️  --add-to-board given but no board number could be resolved — skipping the add. " +
            "Pass --board <number>, or set github.projectBoard / project.yml's project_board_number.",
        );
      }
    }
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
      `🔎 would add issue #${args.issue} to board ${addBoardNum || "(unresolved)"} (skipped: --dry-run)`,
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
    setOption({ exec, item, optionId: r.match.id, sleepMs: sleepImpl });
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
  // Re-read to confirm the option that actually landed.
  //
  // The re-read is CONFIRMATION, not the source of truth. It is issued with no
  // propagation delay — unlike ensureOnBoard, which deliberately sleeps for the
  // same API — so a stale read returns the PREVIOUS status. Believing it would
  // make a successful move report the old column, which is the exact inverse of
  // the silent-no-op detection this exists for. So: trust it only when it agrees
  // with what we asked for; otherwise keep the requested name and say the
  // confirmation did not come back.
  let landed = r.match.name;
  let verified = false;
  let observed = null;
  try {
    const after = readBoard({ exec, owner, repo, issue: args.issue, statusField });
    const same = after.find((i) => i.itemId === item.itemId);
    if (same) observed = same.current || "";
    if (observed && tw.eqName(observed, r.match.name)) {
      landed = observed;
      verified = true;
    }
  } catch (_) {}

  // `observed` is reported even when it disagrees. Dropping it would make a
  // genuine silent no-op — the mutation returned no error but the board did not
  // change — indistinguishable from a read that simply had not caught up, and
  // telling those apart is the only reason to re-read at all.
  output.info(
    verified
      ? `✅ ${label} → "${landed}".`
      : `⚠️  ${label} → "${landed}" requested, but the verify read still shows ` +
          `"${observed || "(unset)"}" — either propagation lag or the change did not stick.`,
  );
  return emit(
    {
      transitioned: true,
      reason: "transitioned",
      from: item.current,
      to: landed,
      verified,
      observed,
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

/**
 * The board NUMBER to hand `gh project item-add`, or "" when it cannot be known.
 *
 * `item-add` takes a number, but a board hint may legitimately be a TITLE — both
 * `--board 12` and `--board "Team Sprint"` are accepted by selectBoard. Silently
 * substituting `project.yml`'s number for an unresolvable title used to add the
 * issue to one board while the status was written to another. A hint that is set
 * but not resolvable to a number therefore yields "" — no add — rather than a
 * different board.
 *
 * `items` (optional) lets a title resolve to its own number when the board has
 * already been read.
 */
function boardHintNumber(board, configured, projectYml, items) {
  const yml = projectYml || {};
  const resolve = (hint) => {
    if (!hint) return null; // absent — try the next source
    const h = String(hint).trim();
    if (/^\d+$/.test(h)) return h;
    const hit = (items || []).find((i) => tw.eqName(i.projectTitle, h));
    // Set but unresolvable: "" (no add), never a fallback to another board.
    return hit && hit.projectNumber ? hit.projectNumber : "";
  };
  for (const hint of [board, configured, yml.boardNumber, yml.boardName]) {
    const r = resolve(hint);
    if (r !== null) return r;
  }
  return "";
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
  onWarn,
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
    items = readBoard({ exec, owner, repo, issue, statusField, onWarn });
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
  if (args.writeLadder)
    ladderWritten = writeLadder({
      root,
      optionNames,
      output,
      dryRun: args.dryRun,
    });

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
function writeLadder({ root, optionNames, output, dryRun = false }) {
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
  // --dry-run is a no-write contract for the whole CLI, not just for the board.
  // A filesystem write is still a write, and a caller checking "did --dry-run
  // touch anything" would have been wrong about this one.
  if (dryRun) {
    output.info(
      `🔎 would write ${tw.DEFAULT_WORKFLOW_PATH} with ${optionNames.length} rungs ` +
        `(skipped: --dry-run):\n${body.replace(/^/gm, "   ")}`,
    );
    return { written: false, reason: "dry-run", path: target, statuses: optionNames };
  }
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
  boardHintNumber,
  normalizeItem,
  readBoard,
  ensureOnBoard,
  writeLadder,
  withRetry,
  makeOutput,
  USAGE,
};
