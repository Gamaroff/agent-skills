#!/usr/bin/env node
"use strict";

/**
 * pipeline-answers — resolve a develop pipeline's up-front answers, speed mode
 * and skips before Phase 0d asks anything.
 *
 * Canonical spec: develop-pipeline-step-0-resolve-and-prepare.md §0d ("Answer
 * resolution") and develop-pipeline-lite-mode.md ("Speed modes and skips").
 * task.201 introduced it.
 *
 * ## The one rule
 *
 * Every answer resolves in the same order: **flag → consumer policy → derived
 * recommendation → ask**. A source is used only when it validates; a source that
 * contradicts what Phase 0d derives (the epic's `branch_model`, Q1/Q2 agreement,
 * the answer already recorded for this run) is not obeyed and not dropped — the
 * question is asked, with the conflict stated. A question is asked only when
 * sources conflict or nothing resolves it, so a run with no flags and no policy
 * asks exactly what it asked before this module existed.
 *
 * ## Why a module and not a paragraph in §0d
 *
 * The orchestrators used to restate Phase 0d's answers in prose, and the
 * restatement drifted from Phase 0d (bug.18). A precedence rule with conflict
 * paths is a table of cases; a table of cases is testable only when something
 * executes it. §0d calls this module from a fenced block, so the tested path is
 * the executed one.
 *
 * ## Properties
 *
 *   1. PURE CORE. `resolveAnswers`, `gateFor` and `parseArgs` read no file,
 *      spawn nothing and never throw; malformed input returns a result with the
 *      problem recorded. Only the CLI wrapper does I/O (it reads one JSON file
 *      when `--persisted-file` is given).
 *   2. NO NEW QUESTIONS. The only questions this module can return are the ones
 *      Phase 0d already asks (story/task: Q1 base, Q2 target; bug: Q1 branch
 *      model, Q2 base, Q3 target). The speed mode and the skips are never asked.
 *   3. THE CONSUMER OWNS THE CEILING. A skip outside `develop.skippable` is
 *      refused with the reason, and the run continues unskipped. The allow-list
 *      defaults to empty. The floor (`FLOOR`) is refused whatever the policy says.
 *   4. A WAIVER NEVER MASKS A FAILURE. `gateFor` turns an earned PASS/CONCERNS
 *      into WAIVED when a step was skipped; an earned FAIL stays FAIL. A depth
 *      skip that still yields a clean review keeps the verdict it earned.
 */

// ── vocabulary ─────────────────────────────────────────────────────────────

const PIPELINES = Object.freeze(["story", "task", "bug"]);
const MODES = Object.freeze(["standard", "lite", "fast"]);

// A skip that removes a step: the gate cannot be earned, so it reads WAIVED.
const STEP_SKIPS = Object.freeze(["review"]);
// A skip that only shortens a step: the verdict is still earned.
const DEPTH_SKIPS = Object.freeze(["qa-depth", "review-pr-depth"]);
const SKIP_VOCABULARY = Object.freeze([...STEP_SKIPS, ...DEPTH_SKIPS]);

// Never skippable by any flag or policy. Named so a request for one is refused
// as "floor", not as an unknown word.
const FLOOR = Object.freeze([
  "create-branch",
  "develop",
  "create-pr",
  "qa",
  "review-pr",
  "finalise",
  "commit",
  "tracker-signals",
]);

// `read_nested_config_key` reads scalars only, so the allow-list is one comma-separated
// line. A YAML block list reads as empty — every skip refused, the safe direction — and
// the refusal says why, so the misconfiguration is visible rather than silent.
const EMPTY_HINT =
  " — write develop.skippable as one comma-separated line; a YAML list reads as empty";

// `fast` is exactly these two depth skips, applied regardless of the lite detector.
const FAST_NEEDS = DEPTH_SKIPS;

const SOURCES = Object.freeze({
  FLAG: "flag",
  POLICY: "policy",
  PERSISTED: "persisted",
  RECOMMENDED: "recommended",
  DETECTOR: "detector",
  ASKED: "asked",
  DERIVED: "derived-from-Q1",
  NONE: "none",
});

const QUESTION_SETS = Object.freeze({
  story: [
    { id: "Q1", key: "base" },
    { id: "Q2", key: "target" },
  ],
  task: [
    { id: "Q1", key: "base" },
    { id: "Q2", key: "target" },
  ],
  bug: [
    { id: "Q1", key: "branchModel" },
    { id: "Q2", key: "base" },
    { id: "Q3", key: "target" },
  ],
});

const BUG_MODELS = Object.freeze({
  bugfix: { base: "develop", target: "develop" },
  hotfix: { base: "main", target: "main" },
});

const FLAG_FOR = Object.freeze({
  base: "--base",
  target: "--target",
  branchModel: "--branch-model",
});

// ── argument parsing ───────────────────────────────────────────────────────

// Split a skill's argument string into words. Quotes group; nothing expands.
// The skill receives its arguments as one string, so this is the one place a
// flag is read — a second parser elsewhere would be a second definition.
function splitWords(input) {
  const words = [];
  let cur = "";
  let quote = null;
  let started = false;
  for (const ch of String(input)) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
    } else if (/\s/.test(ch)) {
      if (started) words.push(cur);
      cur = "";
      started = false;
    } else {
      cur += ch;
      started = true;
    }
  }
  if (started) words.push(cur);
  return words;
}

function splitList(value) {
  if (typeof value !== "string") return [];
  return value
    .replace(/^\s*\[/, "")
    .replace(/\]\s*$/, "")
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

/**
 * Parse a develop pipeline's invocation arguments.
 *
 * @param {string|string[]} input  the raw argument string, or pre-split words
 * @returns {{ positional: string[], flags: object, errors: string[] }}
 *   `flags` holds only what was given: `defaults` (boolean), `base`, `target`,
 *   `branchModel`, `mode` (strings), `skip` (string[]).
 */
function parseArgs(input) {
  const words = Array.isArray(input)
    ? input.map(String)
    : splitWords(input == null ? "" : input);
  const flags = {};
  const positional = [];
  const errors = [];
  const VALUED = {
    "--base": "base",
    "--target": "target",
    "--branch-model": "branchModel",
    "--mode": "mode",
    "--skip": "skip",
  };
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w === "--defaults") {
      flags.defaults = true;
      continue;
    }
    const eq = w.indexOf("=");
    const name = w.startsWith("--") && eq > 0 ? w.slice(0, eq) : w;
    if (Object.prototype.hasOwnProperty.call(VALUED, name)) {
      let value;
      if (name !== w) value = w.slice(eq + 1);
      else if (i + 1 < words.length && !words[i + 1].startsWith("--"))
        value = words[++i];
      if (value === undefined || value === "") {
        errors.push(`${name} needs a value`);
        continue;
      }
      const key = VALUED[name];
      if (key === "skip")
        flags.skip = [...(flags.skip || []), ...splitList(value)];
      else flags[key] = value;
      continue;
    }
    if (w.startsWith("--")) {
      // Not ours. Left to the caller — another skill may define it — but named.
      errors.push(`unrecognised flag ${w}`);
      continue;
    }
    positional.push(w);
  }
  return { positional, flags, errors };
}

// ── resolution ─────────────────────────────────────────────────────────────

function str(v) {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function isEpicBranch(b) {
  return typeof b === "string" && b.startsWith("epic/");
}

/**
 * The recommendation Phase 0d derives for one question, given what is already
 * answered. Q2 follows an `epic/*` Q1 (Phase 0d §Q2); a bug's base and target
 * follow its branch model (develop-bug §0d Q2/Q3).
 */
function recommendationFor(pipeline, key, derived, answers) {
  if (pipeline === "bug") {
    if (key === "branchModel") return str(derived.branchModel) || "bugfix";
    const model = BUG_MODELS[answers.branchModel];
    return model ? model[key] : null;
  }
  if (key === "base") return str(derived.epicBranch) || str(derived.base);
  if (key === "target") {
    if (str(derived.epicBranch)) return str(derived.epicBranch);
    if (isEpicBranch(answers.base)) return answers.base;
    return str(derived.target);
  }
  return null;
}

/**
 * Why a value given for `key` cannot be applied, or null when it can.
 * Checked for flags and persisted answers alike.
 */
function conflictFor(pipeline, key, value, derived, answers) {
  if (pipeline === "bug") {
    if (key === "branchModel" && !BUG_MODELS[value])
      return `unknown branch model "${value}" — one of ${Object.keys(BUG_MODELS).join(", ")}`;
    if (key === "base" || key === "target") {
      const model = BUG_MODELS[answers.branchModel];
      if (model && model[key] !== value)
        return `branch model "${answers.branchModel}" sets the ${key === "base" ? "base" : "PR target"} to "${model[key]}", not "${value}"`;
    }
    return null;
  }
  const epic = str(derived.epicBranch);
  if (epic && value !== epic)
    return `the epic declares branch_model: epic-integration; its integration branch is "${epic}", not "${value}"`;
  if (key === "target" && isEpicBranch(answers.base) && value !== answers.base)
    return `Q1 and Q2 must agree for an integration branch: the base is "${answers.base}", so the PR target must be too, not "${value}"`;
  if (
    key === "target" &&
    isEpicBranch(value) &&
    answers.base &&
    answers.base !== value
  )
    return `Q1 and Q2 must agree for an integration branch: the PR target is "${value}", but the base is "${answers.base}"`;
  return null;
}

function resolveMode(pipeline, flags, policy, derived, refused) {
  const detector = derived.detectorMode === "lite" ? "lite" : "standard";
  const policyMode = str(policy.defaultMode);
  const skippable = policy.skippable;

  if (pipeline === "bug") {
    if (flags.mode !== undefined)
      refused.push({
        flag: "--mode",
        value: flags.mode,
        reason:
          "develop-bug has its own lite rule and no QA gate to record a waiver in — not supported there",
      });
    return { mode: detector, source: SOURCES.DETECTOR };
  }

  const fastAuthorised = () => FAST_NEEDS.every((s) => skippable.includes(s));

  if (flags.mode !== undefined) {
    const m = str(flags.mode);
    if (!MODES.includes(m)) {
      refused.push({
        flag: "--mode",
        value: flags.mode,
        reason: `unknown mode — one of ${MODES.join(", ")}`,
      });
    } else if (m === "standard") {
      return { mode: "standard", source: SOURCES.FLAG };
    } else if (m === "lite") {
      if (detector === "lite") return { mode: "lite", source: SOURCES.FLAG };
      refused.push({
        flag: "--mode",
        value: m,
        reason:
          "lite mode's conditions are not met (risk low/absent, < 3 phases, one module) — use --mode fast to shorten QA regardless",
      });
    } else if (m === "fast") {
      if (policyMode === "fast" || fastAuthorised())
        return { mode: "fast", source: SOURCES.FLAG };
      refused.push({
        flag: "--mode",
        value: m,
        reason: `fast shortens QA and the PR review, so develop.skippable must list ${FAST_NEEDS.join(" and ")} (it lists: ${skippable.length ? skippable.join(", ") : "nothing"})`,
      });
    }
  }

  if (policyMode !== null) {
    if (!MODES.includes(policyMode)) {
      refused.push({
        flag: "develop.defaultMode",
        value: policyMode,
        reason: `unknown mode — one of ${MODES.join(", ")}`,
      });
    } else if (policyMode === "lite") {
      // Policy `lite` asks for lite where the document qualifies — the detector decides.
      return {
        mode: detector,
        source: detector === "lite" ? SOURCES.POLICY : SOURCES.DETECTOR,
      };
    } else {
      return { mode: policyMode, source: SOURCES.POLICY };
    }
  }
  return { mode: detector, source: SOURCES.DETECTOR };
}

function resolveSkips(pipeline, flags, policy, invoker, refused) {
  const requested = Array.isArray(flags.skip) ? flags.skip : [];
  const skips = [];
  for (const raw of requested) {
    const s = String(raw).trim();
    let reason = null;
    if (pipeline === "bug")
      reason =
        "develop-bug has no QA gate to record a waiver in — not supported there";
    else if (FLOOR.includes(s)) reason = "floor — never skippable in any mode";
    else if (!SKIP_VOCABULARY.includes(s))
      reason = `unknown step — skippable steps are ${SKIP_VOCABULARY.join(", ")}`;
    else if (!policy.skippable.includes(s))
      reason = `not in develop.skippable (it lists: ${policy.skippable.length ? policy.skippable.join(", ") : `nothing${EMPTY_HINT}`})`;
    else if (STEP_SKIPS.includes(s) && !str(invoker))
      reason =
        "a skipped step is recorded as a waiver, and a waiver needs an approver — git config user.name is unset";
    if (reason) refused.push({ flag: "--skip", value: s, reason });
    else if (!skips.includes(s)) skips.push(s);
  }
  return skips;
}

function normalisePolicy(policy) {
  const p = policy && typeof policy === "object" ? policy : {};
  const list = Array.isArray(p.skippable)
    ? p.skippable
    : splitList(p.skippable);
  return {
    defaultMode: str(p.defaultMode),
    // The floor cannot be authorised, so a floor entry in the allow-list is dropped here.
    skippable: list
      .map((s) => String(s).trim())
      .filter((s) => s && !FLOOR.includes(s)),
  };
}

/**
 * Resolve every up-front answer for one pipeline run.
 *
 * @param {object} input
 * @param {"story"|"task"|"bug"} input.pipeline
 * @param {object} [input.flags]      from parseArgs().flags
 * @param {object} [input.policy]     { defaultMode, skippable } from skills-config.yaml `develop:`
 * @param {object} [input.derived]    what Phase 0d derives: { base, target, epicBranch,
 *                                    branchModel, detectorMode }
 * @param {object} [input.persisted]  answers already recorded for this run (the lock's `answers`)
 * @param {string} [input.invoker]    `git config user.name` — the waiver approver
 * @returns {object} { answers, sources, questions, conflicts, refused, effective, waiver, errors }
 */
function resolveAnswers(input) {
  const errors = [];
  let pipeline, flags, policy, derived, persisted, invoker;
  try {
    pipeline = input && input.pipeline;
    flags = (input && input.flags) || {};
    policy = normalisePolicy(input && input.policy);
    derived = (input && input.derived) || {};
    persisted = (input && input.persisted) || null;
    invoker = input && input.invoker;
  } catch {
    errors.push("input-unreadable");
    pipeline = null;
  }
  if (!PIPELINES.includes(pipeline)) {
    errors.push(
      `unknown pipeline "${pipeline}" — one of ${PIPELINES.join(", ")}`,
    );
    pipeline = "task";
    flags = flags || {};
    policy = policy || normalisePolicy(null);
    derived = derived || {};
  }

  const answers = {};
  const sources = {};
  const questions = [];
  const conflicts = [];
  const refused = [];
  const persistedAnswers =
    persisted && typeof persisted === "object" ? persisted : {};

  for (const q of QUESTION_SETS[pipeline]) {
    const flagValue = str(flags[q.key]);
    const persistedValue = str(persistedAnswers[q.key]);
    const recommended = recommendationFor(pipeline, q.key, derived, answers);

    let conflict = null;
    if (flagValue !== null) {
      conflict = conflictFor(pipeline, q.key, flagValue, derived, answers);
      if (!conflict && persistedValue !== null && persistedValue !== flagValue)
        conflict = `${FLAG_FOR[q.key]} ${flagValue} disagrees with the answer already recorded for this run ("${persistedValue}")`;
      if (!conflict) {
        answers[q.key] = flagValue;
        sources[q.key] = SOURCES.FLAG;
        continue;
      }
      conflicts.push({
        question: q.id,
        key: q.key,
        given: flagValue,
        source: SOURCES.FLAG,
        reason: conflict,
      });
    } else if (persistedValue !== null) {
      conflict = conflictFor(pipeline, q.key, persistedValue, derived, answers);
      if (!conflict) {
        answers[q.key] = persistedValue;
        sources[q.key] = SOURCES.PERSISTED;
        continue;
      }
      conflicts.push({
        question: q.id,
        key: q.key,
        given: persistedValue,
        source: SOURCES.PERSISTED,
        reason: conflict,
      });
    } else if (pipeline === "bug" && q.key !== "branchModel") {
      // develop-bug never asks Q2/Q3: they follow Q1 (develop-bug §0d). With Q1
      // still to be asked, they are derived from its answer, not asked themselves.
      answers[q.key] = recommended;
      sources[q.key] =
        recommended === null ? SOURCES.DERIVED : SOURCES.RECOMMENDED;
      continue;
    } else if (flags.defaults === true && recommended !== null) {
      answers[q.key] = recommended;
      sources[q.key] = SOURCES.RECOMMENDED;
      continue;
    }

    answers[q.key] = null;
    sources[q.key] = SOURCES.ASKED;
    questions.push({
      id: q.id,
      key: q.key,
      recommended,
      reason:
        conflict ||
        (flags.defaults === true
          ? "no recommendation could be derived"
          : "no answer supplied"),
    });
  }

  const { mode, source: modeSource } = resolveMode(
    pipeline,
    flags,
    policy,
    derived,
    refused,
  );
  answers.mode = mode;
  sources.mode = modeSource;

  const skips = resolveSkips(pipeline, flags, policy, invoker, refused);
  answers.skips = skips;
  sources.skips = skips.length ? SOURCES.FLAG : SOURCES.NONE;

  const shortened = mode === "lite" || mode === "fast";
  const effective = {
    runReview: !skips.includes("review"),
    qaDepth: shortened || skips.includes("qa-depth") ? "direct-tools" : "full",
    reviewPrEffort:
      shortened || skips.includes("review-pr-depth") ? "low" : "medium",
  };

  const waived = skips.filter((s) => STEP_SKIPS.includes(s));
  const waiver = waived.length
    ? {
        active: true,
        reason: waived.map((s) => `${s} skipped: --skip ${s}`).join("; "),
        approved_by: str(invoker),
      }
    : null;

  return {
    pipeline,
    answers,
    sources,
    questions,
    conflicts,
    refused,
    effective,
    waiver,
    errors,
  };
}

// ── the gate ───────────────────────────────────────────────────────────────

const GATES = Object.freeze(["PASS", "CONCERNS", "FAIL", "WAIVED"]);

/**
 * The gate decision a QA cycle records, given the verdict it earned and the
 * skips in force. FAIL is never masked; a removed step turns PASS/CONCERNS into
 * WAIVED; a depth-only skip keeps the earned verdict.
 *
 * @param {object} input  { earned, skips, waiver } — `waiver` from resolveAnswers
 * @returns {{ gate: string, waiver: object|null, reason: string }}
 */
function gateFor(input) {
  let earned, skips, waiver;
  try {
    earned = str(input && input.earned);
    skips = Array.isArray(input && input.skips) ? input.skips : [];
    waiver = (input && input.waiver) || null;
  } catch {
    return { gate: "FAIL", waiver: null, reason: "input-unreadable" };
  }
  const e = earned ? earned.toUpperCase() : null;
  if (!GATES.includes(e))
    return {
      gate: "FAIL",
      waiver: null,
      reason: `unknown earned verdict "${earned}"`,
    };
  if (e === "FAIL")
    return {
      gate: "FAIL",
      waiver: null,
      reason: "earned FAIL — a waiver never masks a failure",
    };
  const removed = skips.filter((s) => STEP_SKIPS.includes(s));
  if (removed.length === 0)
    return { gate: e, waiver: null, reason: "earned — no step removed" };
  const w = waiver && typeof waiver === "object" ? waiver : {};
  return {
    gate: "WAIVED",
    waiver: {
      active: true,
      reason: str(w.reason) || removed.map((s) => `${s} skipped`).join("; "),
      approved_by: str(w.approved_by),
    },
    reason: `${removed.join(", ")} skipped — the earned ${e} cannot stand for a step that did not run`,
  };
}

// ── CLI ────────────────────────────────────────────────────────────────────

const USAGE = `usage:
  pipeline-answers.js resolve --pipeline story|task|bug --args "<skill arguments>"
      [--derived-base B] [--derived-target T] [--epic-branch E] [--branch-model-derived M]
      [--detector lite|standard] [--policy-mode M] [--policy-skippable "a, b"]
      [--persisted-file LOCK.json] [--invoker NAME] [--json]
  pipeline-answers.js gate --earned PASS|CONCERNS|FAIL|WAIVED [--skips "a, b"]
      [--waiver-reason R] [--approved-by NAME] [--json]
exit: 0 resolved / gate decided; 2 usage error`;

function cliOptions(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a.startsWith("--") && i + 1 < argv.length)
      opts[a.slice(2)] = argv[++i];
    else opts._bad = a;
  }
  return opts;
}

function readPersisted(file) {
  if (!file) return null;
  try {
    const lock = JSON.parse(require("node:fs").readFileSync(file, "utf8"));
    return lock && typeof lock.answers === "object" ? lock.answers : null;
  } catch {
    // A missing or unreadable lock is the legacy / no-lock state: nothing persisted.
    return null;
  }
}

function main(argv) {
  const [cmd, ...rest] = argv;
  const o = cliOptions(rest);
  if (o._bad || (cmd !== "resolve" && cmd !== "gate")) {
    process.stderr.write(`${USAGE}\n`);
    process.exitCode = 2;
    return;
  }
  let out;
  if (cmd === "resolve") {
    if (!o.pipeline) {
      process.stderr.write(`--pipeline is required\n${USAGE}\n`);
      process.exitCode = 2;
      return;
    }
    const parsed = parseArgs(o.args || "");
    out = resolveAnswers({
      pipeline: o.pipeline,
      flags: parsed.flags,
      policy: {
        defaultMode: o["policy-mode"],
        skippable: o["policy-skippable"],
      },
      derived: {
        base: o["derived-base"],
        target: o["derived-target"],
        epicBranch: o["epic-branch"],
        branchModel: o["branch-model-derived"],
        detectorMode: o.detector,
      },
      persisted: readPersisted(o["persisted-file"]),
      invoker: o.invoker,
    });
    out.errors = [...parsed.errors, ...out.errors];
    out.positional = parsed.positional;
  } else {
    out = gateFor({
      earned: o.earned,
      skips: splitList(o.skips || ""),
      waiver: { reason: o["waiver-reason"], approved_by: o["approved-by"] },
    });
  }
  if (o.json) process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
  else process.stdout.write(`${render(cmd, out)}\n`);
  process.exitCode = 0;
}

function render(cmd, out) {
  if (cmd === "gate") return `gate: ${out.gate} — ${out.reason}`;
  const lines = [];
  for (const k of Object.keys(out.answers)) {
    const v = Array.isArray(out.answers[k])
      ? out.answers[k].join(", ") || "none"
      : out.answers[k];
    lines.push(`${k}: ${v === null ? "(asked)" : v} [${out.sources[k]}]`);
  }
  for (const q of out.questions)
    lines.push(`ask ${q.id} (${q.key}): ${q.reason}`);
  for (const r of out.refused)
    lines.push(`refused ${r.flag} ${r.value}: ${r.reason}`);
  return lines.join("\n");
}

if (require.main === module) main(process.argv.slice(2));

module.exports = {
  // vocabulary
  PIPELINES,
  MODES,
  SKIP_VOCABULARY,
  STEP_SKIPS,
  DEPTH_SKIPS,
  FLOOR,
  SOURCES,
  QUESTION_SETS,
  // parse
  parseArgs,
  splitList,
  // resolve
  resolveAnswers,
  gateFor,
};
