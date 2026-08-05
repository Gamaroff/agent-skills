#!/usr/bin/env node
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
 *   jira-stage.js --stage done --print-plan [--from "In Progress"]
 *
 * Exit codes:
 *   0  transitioned, walked, parked mid-ladder (walk-incomplete), already there,
 *      disabled, no matching transition, a printed plan, or no credentials —
 *      every outcome the pipeline should shrug at
 *   1  a skip, but only under --strict. A parked walk counts as a skip: the card
 *      did not reach the status the moment asked for.
 *   2  usage error (unknown stage, missing --issue)
 *
 * Zero non-transition exit codes matter: pipeline steps run inside shells, and
 * a non-zero exit on "this board has no review column" would kill the run.
 *
 * The target comes from the consumer's tracker-workflow.yaml ladder when one
 * resolves, falling back to the JSON workflow record. When the target is not
 * directly reachable, the intermediate rungs the ladder declares are walked in
 * order, re-reading the available transitions after every hop — they are
 * position-dependent, which is the whole reason walking cannot be planned once
 * up front.
 *
 * --print-plan is credential-free and network-free: it resolves the hops and
 * prints them, which is what the MCP fallback protocol reads. --dry-run does
 * touch the network but can only verify the FIRST hop; later hops depend on
 * transitions that do not exist until the earlier ones fire, so it reports them
 * as unverified rather than claiming a destination it cannot observe.
 */

const lib = require("./jira-sync.js");
const tw = require("./tracker-workflow.js");

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
    printPlan: false,
    // Where the card is. `planMove` needs a starting point, and --print-plan
    // cannot fetch one — without this flag every printed plan is a single rung
    // and the MCP fallback's "more than one hop → hand it to a human" rule can
    // never fire, because the condition it branches on is unreachable.
    from: "",
    issueType: "",
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
      case "--from":
        opts.from = args[++i];
        break;
      case "--issue-type":
        opts.issueType = args[++i];
        break;
      case "--print-plan":
        opts.printPlan = true;
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
              [--json] [--quiet] [--dry-run] [--strict] [--allow-regress] [--worklog <1m>]
       jira-stage --stage <${lib.STAGE_NAMES.join("|")}> --print-plan
              [--from <status>] [--issue-type <type>]   (no credentials, no network)`;

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

// Resolve where a moment wants the card, most specific source winning:
//   tracker-workflow.yaml ladder > JSON workflow record > built-in defaults
//
// The ladder path returns the same shape `resolveStage` does, so everything
// downstream is source-agnostic. Two fields deserve care:
//
//   candidates — `moment.targets`, PLURAL. There is no `target` field on the
//     result and reducing it to targets[0] makes alternative spellings of a
//     column unreachable, which is the regression task.37's plural return exists
//     to prevent.
//
//   terminal — the CONJUNCTION of two independent conditions. `done` is the only
//     moment DEFAULT_STAGE_MAP marks terminal, and position comes from the
//     ladder. A board that points `done` at a gate column has the name but not
//     the position, and the done-category fallback must stay shut for it: a
//     confident wrong transition into the board's real Done is not recoverable,
//     whereas a skip is.
function resolveMomentSpec({ stage, issueType, record, workflow }) {
  // Only an authored `pipeline:` outranks the JSON record.
  //
  // The discriminator is `pipelineAuthored`, NOT the mere existence of a file.
  // `loadWorkflow` never fails, and there are three separate ways to end up
  // holding a workflow whose `pipeline` is the BUILT-IN default: no file at all
  // (source "default"), a file that is empty or not a mapping (source "file",
  // built-in pipeline, plus a warning), and the documented `statuses:`-only shape
  // where an author declares their ladder and leaves the moments inherited.
  //
  // Keying on `source === "file"` treats the last two as authored, which is wrong
  // in both directions at once: for a moment the built-in default declares, the
  // built-in target would outrank the record's `enabled: false` and fire the
  // board's real Done; and for a moment it does NOT declare (in-qa,
  // ready-for-merge, blocked) `resolveMoment` returns null, which the branch
  // below reads as deliberate disablement — silently switching off a stage the
  // consumer explicitly opted into. A broken YAML would do the same thing.
  //
  // `tracker-workflow.js` answers this via `pipelineAuthoredFor`, at the same
  // granularity `resolveMoment` itself resolves at: per moment AND per issue
  // type. Anything coarser disagrees with it somewhere. The file-level flag
  // alone ignores an overlay-authored target, firing a built-in `done` instead
  // of the column the author named. A type-level answer lets an overlay that
  // names ONE moment — the documented `in-qa: ~` disable is exactly that —
  // claim authorship of all eight, so the seven it never mentions outrank the
  // record and `done` fires despite an explicit `enabled: false`.
  //
  // Consequence, deliberate: a `statuses:`-only file resolves its targets from
  // the record and does NOT walk. That is the conservative reading — its moment
  // targets are built-in-derived, so they belong below the record — and it keeps
  // the compatibility guarantee exact. Authoring one `pipeline:` line per moment
  // is what opts a board into walking.
  const authored = !!(
    workflow &&
    workflow.source === "file" &&
    tw.pipelineAuthoredFor(workflow, issueType, stage)
  );
  if (!authored) {
    return {
      spec: lib.resolveStage({ stage, issueType, record }),
      moment: null,
      authored: false,
    };
  }

  const moment = tw.resolveMoment(stage, workflow, { issueType });

  // Null from an authored file means DISABLED, not "unspecified". Omission from
  // `pipeline:` is the only way to switch a moment off, so falling back to the
  // built-in defaults here would fire a transition the author deliberately
  // removed — and for `done` that means firing the board's real Done. An
  // unwanted terminal transition is the one outcome that cannot be undone.
  if (!moment) {
    return {
      spec: {
        known: true,
        stage,
        enabled: false,
        candidates: [],
        rank: null,
        reason: "not declared in tracker-workflow.yaml — omission is disablement",
        terminal: false,
      },
      moment: null,
      // The FILE answered — it just answered "off". A reader asking which source
      // decided this must not be told "record".
      authored: true,
    };
  }

  return {
    spec: {
      known: true,
      stage,
      enabled: true,
      candidates: moment.targets,
      rank: moment.rank,
      reason: "",
      terminal: lib.isTerminalMoment(stage) && moment.isLastRung,
    },
    moment,
    authored: true,
  };
}

// Hop construction lives in jira-sync.js beside walkLadder, so the plan printed
// here is built by the same code that walks it. Re-exported for tests.
const planHops = lib.planHops;

async function run({
  argv = process.argv,
  fetchImpl = typeof fetch !== "undefined" ? fetch : null,
  // Where to look for tracker-workflow.yaml. Absent, `loadWorkflow` shells out to
  // `git rev-parse --show-toplevel` and reads the real repo's file — which makes
  // a test's outcome depend on a committed board description whose own comments
  // invite editing. Tests pin their own ladder through this.
  repoRoot = undefined,
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

  // --print-plan needs no issue: it reads a config file, not a board.
  if ((!args.issue && !args.printPlan) || !args.stage) {
    output.err(
      args.printPlan
        ? "Error: --stage is required"
        : "Error: --issue and --stage are both required",
    );
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

  // The ladder is read before credentials are even looked at, because
  // --print-plan must work without them — that is the entire point of it. Never
  // throws: a missing or malformed file resolves to the built-in default ladder.
  const workflow = tw.loadWorkflow(repoRoot ? { repoRoot } : {});

  // --print-plan: resolve and print, no credentials, no network, exit 0.
  //
  // This is what jira-transition-protocol.md consumes, so it must run BEFORE the
  // auth check — the fallback exists precisely because credentials are absent.
  // `output.emit` writes unconditionally rather than only under --json, which is
  // what makes the flag machine-readable on its own.
  if (args.printPlan) {
    const { spec, moment, authored } = resolveMomentSpec({
      stage: args.stage,
      issueType: args.issueType,
      record: lib.loadWorkflowRecord(repoRoot),
      workflow,
    });
    const targets = spec.enabled ? spec.candidates : [];
    const hops = spec.enabled
      ? planHops({
          from: args.from,
          targets,
          workflow: moment ? workflow : null,
          issueType: args.issueType,
        })
      : [];
    output.emit({
      stage: args.stage,
      reason: "plan",
      enabled: spec.enabled,
      targets: spec.enabled ? targets : null,
      hops,
      from: args.from || null,
      // Without --from, planMove has no starting point and returns [], so the
      // plan is the target rung ALONE. Say so explicitly rather than letting a
      // reader mistake a one-element plan for "this moment is one hop away".
      spansFrom: !!args.from,
      isLastRung: moment ? moment.isLastRung : null,
      terminal: spec.terminal,
      // Where this plan actually came from — which is not the same question as
      // "does a file exist". A statuses-only or malformed file is `source:
      // "file"` while contributing nothing to the plan, and this is the one
      // field a reader consults to answer "did my ladder do this?".
      //
      // A ladder-DISABLED moment came from the file too: `enabled: false` with
      // the omission reason is the file's answer, not the record's, so it must
      // not be labelled "record".
      source: authored ? workflow.source : "record",
      authored,
      exitCode: 0,
    });
    return { exitCode: 0, reason: "plan", hops, spansFrom: !!args.from };
  }

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
  const record = lib.loadWorkflowRecord(repoRoot);

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

  const { spec, moment } = resolveMomentSpec({
    stage: args.stage,
    issueType,
    record,
    workflow,
  });
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
    // Strictly GET-only — nothing moves. But it can only verify the FIRST hop:
    // the transitions available after a hop do not exist until that hop fires,
    // so a multi-hop plan's later rungs are reported as unverified rather than
    // claimed as a destination. Use --print-plan to see the full intended path.
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
    const hops = planHops({
      from: currentStatus,
      targets: spec.candidates,
      workflow: moment ? workflow : null,
      issueType,
    });
    const r = lib.resolveTransition({
      transitions,
      candidates: hops[0] || spec.candidates,
      currentStatus,
      // Only the final rung can be terminal — see walkLadder.
      terminal: hops.length === 1 ? spec.terminal : false,
    });
    const to = r.match ? (r.match.to && r.match.to.name) || r.match.name : null;
    output.info(
      `🔎 ${args.issue} [${issueType}] @ "${currentStatus}" — stage ${args.stage}: ` +
        (r.match
          ? `would move to "${to}" (via ${r.rule})`
          : `skip (${r.reason})`),
    );
    for (let i = 1; i < hops.length; i++) {
      output.info(
        `   ↪ then "${hops[i].join('" / "')}" — unverified (depends on hop 1)`,
      );
    }
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
        hops,
        // Everything after hop 1 is a plan, not an observation.
        unverifiedHops: hops.length - 1,
      },
      0,
    );
  }

  const res = await lib.walkLadder({
    http,
    baseUrl: auth.baseUrl,
    email: auth.email,
    token: auth.token,
    issueKey: args.issue,
    from: currentStatus,
    targets: spec.candidates,
    // Only pass the ladder when a moment actually resolved from it. On the
    // legacy JSON-record path there are no rungs to walk and no ladder ranks,
    // and handing one over would switch the monotonicity guard to a rank scale
    // the record-derived `minRank` is not measured on.
    workflow: moment ? workflow : null,
    issueType,
    // Deliberately NOT `spec.terminal ? "accepted" : ...`-driven for rule 4 —
    // that is what `terminal` below is for now. This still yields the literal
    // "done" for a retargeted done moment, which IS in TERMINAL_LOCAL_STATUSES,
    // so positive-resolution preference keeps working when a transition demands
    // a resolution. Correct, and load-bearing: do not "simplify" it.
    localStatus: spec.terminal ? "accepted" : args.stage,
    terminal: spec.terminal,
    doneResolution: lib.loadDoneResolution(repoRoot),
    cancelledResolution: lib.loadCancelledResolution(repoRoot),
    worklogTimeSpent: args.worklog || lib.loadWorklogTimeSpent(repoRoot),
    minRank: spec.rank,
    workflowRecord: record,
    allowRegress: args.allowRegress,
    output,
  });

  // A skip is only actionable if the operator can see what the board DID offer.
  // Shared by the walk-incomplete branch and the plain no-transition tail — two
  // copies of this drifted apart once already.
  const explainNoTransition = async () => {
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
  };

  // A partial walk is neither a success nor "nothing happened" — the card is
  // parked in a gate the board declares, and a reader must be able to tell that
  // from a card that never moved.
  //
  // This is tested FIRST, before the success branch. A partial walk that got
  // through the gate has `transitioned: true` — it really did move — so a
  // success branch checking `res.transitioned` would swallow it and report a
  // parked card as a clean pass, with no warning at all. The one outcome the
  // three-shape reporting exists to surface would be the one never surfaced.
  //
  // Exit 0 unless --strict, matching every other skip: a gate is a legitimate
  // board shape and stopping at one is the correct outcome, but a caller that
  // has opted into strictness wants to hear about anything short of arrival.
  if (res.reason === "walk-incomplete") {
    const remaining = (res.remaining || [])
      .map((rung) => rung.join(" / "))
      .join(" → ");
    const moved = res.landed && res.landed !== res.from;
    output.warn(
      moved
        ? `⏸️  ${args.issue} walked as far as "${res.landed}" — ${remaining || "the target"} not reachable from there.`
        : `⏸️  ${args.issue} did not move from "${res.from}" — ${remaining || "the target"} not reachable.`,
    );
    if (moved)
      output.warn(
        `    The card is parked mid-ladder, not un-moved. Move it on by hand, or declare the missing rung.`,
      );
    // The hop's own failure, which `incomplete()` carries up as `cause`. Without
    // this an HTTP error or a required-field refusal reads as a gate.
    if (res.cause && res.cause !== "no-transition")
      output.warn(`    Hop failed with: ${res.cause}${res.detail ? ` — ${res.detail}` : ""}.`);
    if (res.cause === "no-transition") await explainNoTransition();
    return emit({ ...res, issueType }, args.strict ? 1 : 0);
  }

  // `walked` is the only success shape walkLadder can return with
  // `transitioned: true` once walk-incomplete is handled above; the second
  // disjunct is defensive and currently unreachable.
  if (res.reason === "walked" || res.transitioned) {
    return emit({ ...res, issueType }, 0);
  }

  if (res.reason === "already") {
    output.info(`✅ ${args.issue} is already "${currentStatus}".`);
    return emit({ ...res, issueType }, 0);
  }

  // Everything else is a skip. Surface why, then let the pipeline continue.
  if (res.reason === "no-transition") await explainNoTransition();

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

module.exports = {
  run,
  parseArgs,
  describeAlternatives,
  resolveMomentSpec,
  planHops,
  USAGE,
};
