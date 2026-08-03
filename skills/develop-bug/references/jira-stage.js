#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/jira-stage.js. Regenerate via `npm run bundle`.
/**
 * jira-stage — move a Jira issue to the status a develop-pipeline STAGE implies.
 *
 * The develop pipelines used to carry the transition protocol as prose, with
 * the candidate list written out as a literal in each step file, and an LLM
 * executing the matching loop against MCP tools. That had two costs: the rules
 * lived in two places (here and jira-transition-protocol.md) and had to be kept
 * in step by discipline, and the matching itself was model-driven — a shipped
 * bug had it pick "To Do" as a plausible fallback and silently revert an issue.
 *
 * This is the deterministic half. The prose protocol survives as the fallback
 * for consumers who have the Atlassian MCP connector but no API token; that is
 * why "no credentials" is a normal exit-0 outcome rather than an error.
 *
 * Usage:
 *   jira-stage.js --issue RAPP-123 --stage in-review [--json] [--dry-run]
 *                 [--strict] [--allow-regress] [--worklog 1m]
 *
 * Exit codes:
 *   0  transitioned, already there, disabled, no matching transition, or no
 *      credentials — every outcome the pipeline should shrug at
 *   1  a skip, but only under --strict
 *   2  usage error (unknown stage, missing --issue)
 *
 * Zero non-transition exit codes matter: pipeline steps run inside shells, and
 * a non-zero exit on "this board has no review column" would kill the run.
 */

const lib = require("./jira-sync.js");

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
    worklog: "",
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
      case "--worklog":
        opts.worklog = args[++i];
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

const USAGE = `Usage: jira-stage --issue <KEY> --stage <${lib.STAGE_NAMES.join("|")}>
              [--json] [--quiet] [--dry-run] [--strict] [--allow-regress] [--worklog <1m>]`;

// A skip is only actionable if the operator can see what the board DID offer.
// Flagging transitions that lead somewhere a LATER stage wants is the useful
// part: stages are evaluated from wherever the issue currently sits, so one
// missed hop silently disables every stage after it. Naming the hop that was
// missed turns a silent ladder failure into a one-line diagnosis.
function describeAlternatives(transitions, stage, record, issueType) {
  const later = lib.STAGE_NAMES.slice(lib.STAGE_NAMES.indexOf(stage) + 1);
  const hints = [];
  for (const t of transitions || []) {
    const to = (t.to && t.to.name) || "";
    if (!to) continue;
    for (const other of later) {
      const spec = lib.resolveStage({ stage: other, issueType, record });
      if (!spec.known || !spec.enabled) continue;
      if (spec.candidates.some((c) => c.toLowerCase() === to.toLowerCase())) {
        hints.push(
          `"${to}" is reachable and is a candidate for stage ${other}`,
        );
        break;
      }
    }
  }
  return hints;
}

async function run({
  argv = process.argv,
  fetchImpl = typeof fetch !== "undefined" ? fetch : null,
} = {}) {
  lib.loadDotEnv();

  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    console.error(USAGE);
    return { exitCode: 2 };
  }

  const output = lib.makeOutput({ json: args.json, quiet: args.quiet });

  if (args.help) {
    output.log(USAGE);
    return { exitCode: 0 };
  }

  const emit = (payload, exitCode) => {
    if (args.json) output.emit({ ...payload, stage: args.stage, exitCode });
    return { exitCode, ...payload };
  };

  if (!args.issue || !args.stage) {
    output.err("Error: --issue and --stage are both required");
    output.err(USAGE);
    return { exitCode: 2 };
  }
  if (!lib.STAGE_NAMES.includes(args.stage.toLowerCase())) {
    output.err(
      `Error: unknown stage "${args.stage}". Known: ${lib.STAGE_NAMES.join(", ")}`,
    );
    return { exitCode: 2 };
  }
  args.stage = args.stage.toLowerCase();

  // Absent credentials is a documented, non-failing outcome: the caller falls
  // back to the MCP protocol. Anything else here would make the CLI a
  // regression for every consumer using the Atlassian connector.
  const auth = lib.getAuth();
  if (!auth.ok) {
    output.info(
      `ℹ️  JIRA_* env not set (${auth.missing.join(", ")}) — no transition attempted.`,
    );
    return emit({ transitioned: false, reason: "no-credentials" }, 0);
  }

  const http = lib.makeHttp({ fetchImpl });
  const record = lib.loadWorkflowRecord();

  let issue;
  try {
    issue = await lib.fetchIssue({
      http,
      baseUrl: auth.baseUrl,
      email: auth.email,
      token: auth.token,
      issueKey: args.issue,
      fields: "status,issuetype",
    });
  } catch (e) {
    output.warn(`⚠️  Could not read ${args.issue}: ${e.message}`);
    return emit({ transitioned: false, reason: "issue-unreadable" }, 0);
  }

  const currentStatus = (issue && issue.status) || "";
  const issueType = (issue && issue.issueType) || "";

  const spec = lib.resolveStage({ stage: args.stage, issueType, record });
  if (!spec.enabled) {
    output.info(
      `⏭️  Stage ${args.stage} is not enabled${issueType ? ` for ${issueType}` : ""}` +
        `${spec.reason ? ` (${spec.reason})` : ""} — nothing to do.`,
    );
    return emit(
      { transitioned: false, reason: "stage-disabled", issueType },
      0,
    );
  }

  if (args.dryRun) {
    // Strictly GET-only, so the whole ladder can be re-verified against a live
    // board without moving anything.
    let transitions = [];
    try {
      transitions = await lib.getTransitions({
        http,
        baseUrl: auth.baseUrl,
        email: auth.email,
        token: auth.token,
        issueKey: args.issue,
      });
    } catch (_) {}
    const r = lib.resolveTransition({
      transitions,
      candidates: spec.candidates,
      currentStatus,
      terminal: spec.terminal,
    });
    const to = r.match ? (r.match.to && r.match.to.name) || r.match.name : null;
    output.info(
      `🔎 ${args.issue} [${issueType}] @ "${currentStatus}" — stage ${args.stage}: ` +
        (r.match
          ? `would move to "${to}" (via ${r.rule})`
          : `skip (${r.reason})`),
    );
    if (!r.match)
      for (const h of describeAlternatives(
        transitions,
        args.stage,
        record,
        issueType,
      ))
        output.info(`   ↪ ${h}`);
    return emit(
      {
        transitioned: false,
        reason: "dry-run",
        would: to,
        from: currentStatus,
      },
      0,
    );
  }

  const res = await lib.transitionToStatus({
    http,
    baseUrl: auth.baseUrl,
    email: auth.email,
    token: auth.token,
    issueKey: args.issue,
    targetStatus: spec.candidates,
    currentStatus,
    localStatus: spec.terminal ? "accepted" : args.stage,
    doneResolution: lib.loadDoneResolution(),
    cancelledResolution: lib.loadCancelledResolution(),
    worklogTimeSpent: args.worklog || lib.loadWorklogTimeSpent(),
    configHint: "stage",
    minRank: spec.rank,
    workflowRecord: record,
    allowRegress: args.allowRegress,
    output,
  });

  if (res.transitioned) {
    return emit({ ...res, issueType }, 0);
  }

  if (res.reason === "already") {
    output.info(`✅ ${args.issue} is already "${currentStatus}".`);
    return emit({ ...res, issueType }, 0);
  }

  // Everything else is a skip. Surface why, then let the pipeline continue.
  if (res.reason === "no-transition") {
    let transitions = [];
    try {
      transitions = await lib.getTransitions({
        http,
        baseUrl: auth.baseUrl,
        email: auth.email,
        token: auth.token,
        issueKey: args.issue,
      });
    } catch (_) {}
    for (const h of describeAlternatives(
      transitions,
      args.stage,
      record,
      issueType,
    ))
      output.warn(`   ↪ ${h}`);
  }

  return emit({ ...res, issueType }, args.strict ? 1 : 0);
}

if (require.main === module) {
  run()
    .then((r) => process.exit(r.exitCode || 0))
    .catch((e) => {
      // Even an unexpected throw must not kill a pipeline step.
      console.error(`⚠️  jira-stage failed: ${e && e.message}`);
      process.exit(0);
    });
}

module.exports = { run, parseArgs, describeAlternatives, USAGE };
