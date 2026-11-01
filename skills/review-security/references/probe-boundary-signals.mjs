// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/probe-boundary-signals.mjs. Regenerate via `npm run bundle`.
// The signals that make a deliverable a BOUNDARY — stated once, as data.
//
// Prose peer: the "Signals" list in finalise-dod-security-prompt.md Step 1b, and
// probe-boundary-rule.md, which argue the rule. This module is what a test can
// call: `classifyBoundaryText` applies the text-shaped signals to a script's
// header, a function's doc comment or a work item's Success Criteria, and
// returns which phrase fired. The library reads no file and runs nothing; the
// CLI at the bottom (task.248) is the one exception, and it runs only when this
// file is executed directly, never on import.
//
// Why this exists (task.128, obs #121). On task.121 five QA gates read the same
// change set and recorded "No boundary delivered"; the finalise security agent
// read it and recorded `boundary: true`, probed, and found two defects. Both
// readers applied one rule. The rule's signals were JS-shaped — an exported
// predicate, an allow-list, tests of the shape "X is refused" — and the
// deliverable was a bash script whose header says it "refuses rather than
// guesses". A script that SAYS it refuses matched none of them, and "not JS"
// was read as "not a boundary". The fifth signal below is the one the header
// carries, and it is language-neutral by construction.

import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import criteriaReader from "./criteria-section.js";

const { criteriaSection } = criteriaReader;

/**
 * The signals. Any ONE is sufficient; the negative case (a CRUD endpoint, a
 * renderer, a formatter, a migration) matches none and must not be probed.
 *
 * `phrases` are the regexes `classifyBoundaryText` applies for the text-shaped
 * signals; the code-shaped ones (an exported predicate, a list, a test shape)
 * are read from the diff and have no phrase list.
 */
export const BOUNDARY_SIGNALS = Object.freeze([
  Object.freeze({
    id: "exported-predicate",
    description:
      "an exported predicate that returns a verdict (`true`/`false`, `allow`/`deny`, a status enum)",
  }),
  Object.freeze({
    id: "allow-or-deny-list",
    description:
      "a named allow-list or deny-list in any form (array, regex alternation, `switch`, set membership)",
  }),
  Object.freeze({
    id: "refusal-tests",
    description:
      'a function whose own tests are mostly of the shape "X is refused"',
  }),
  Object.freeze({
    id: "criteria-vocabulary",
    description:
      "a work-item document whose Success Criteria contain *never*, *must not*, *fails closed*, or *refused*",
    scope: "criteria",
    phrases: Object.freeze([
      /\bnever\b/i,
      /\bmust not\b/i,
      /\bfails?[- ]closed\b/i,
      /\brefused\b/i,
    ]),
  }),
  Object.freeze({
    id: "self-declared-refusal",
    description:
      'a script or function whose own header or doc comment says it *refuses*, *never guesses*, or *fails closed* — in any language; a bash script is a boundary by its own words, and "not importable" routes it to the engine\'s `shell:` entry form — or, for a script taking several arguments or flags, to `shell-argv:` with `--argv`; for a guard shipped as a fenced bash block in a step doc, to `fence:<doc.md>#<heading>` with `--slot` — never to `boundary: false`',
    scope: "doc",
    phrases: Object.freeze([
      /\brefuses?\b(?: rather than| instead of| to guess)/i,
      /\brefuses\b/i,
      /\b(?:is|are) refused\b/i,
      /\bnever guess(?:es|ed)?\b/i,
      /\bfails?[- ]closed\b/i,
      /\brefusing rather than\b/i,
    ]),
  }),
]);

/**
 * Apply the text-shaped signals to a piece of text.
 *
 * @param {string} text   a script header, a doc comment, or (with scope
 *                        "criteria") a Success Criteria section
 * @param {{scope?: "doc"|"criteria"}} [opts]  which text signals apply. "doc"
 *        (default) applies only the self-declared-refusal phrases — "never" on
 *        its own is too common in ordinary prose to make a boundary of every
 *        file that contains it. "criteria" adds the Success Criteria vocabulary.
 * @returns {{boundary: boolean, matched: Array<{signal: string, phrase: string}>}}
 */
export function classifyBoundaryText(text, { scope = "doc" } = {}) {
  if (typeof text !== "string") {
    throw new TypeError("classifyBoundaryText: text must be a string");
  }
  const matched = [];
  for (const signal of BOUNDARY_SIGNALS) {
    if (!signal.phrases) continue;
    if (signal.scope === "criteria" && scope !== "criteria") continue;
    // One entry per signal — the first phrase that fires. Two overlapping
    // phrases ("refuses rather than" and "refuses") would otherwise report one
    // occurrence twice (task.128 QA cycle 2, CR-8).
    for (const re of signal.phrases) {
      const m = text.match(re);
      if (m) {
        matched.push({ signal: signal.id, phrase: m[0] });
        break;
      }
    }
  }
  return { boundary: matched.length > 0, matched };
}

/** Render the signal list as the markdown bullets the prompts carry. */
export function renderSignalBullets() {
  return BOUNDARY_SIGNALS.map((s) => `- ${s.description}`).join("\n");
}

// ── CLI: the criteria signal, for QA and the DoD security agent (task.248) ──
//
// Usage: probe-boundary-signals.mjs --doc <work-item.md> [--json]
//
// Reads the work item's criteria section with criteria-section.js (the reader
// finalise-rerun-scope.js and criteria-drift.js use) and applies
// classifyBoundaryText with scope "criteria". On task.234 seven QA gates
// recorded `boundary: false` and the DoD security agent recorded `true` on the
// same diff, citing criterion #2's "never" (obs #140): both read the rule and
// decided. This prints the signal so neither side has to.
//
// The CLI does not decide the boundary. A matched signal obliges the reader to
// record `boundary: true` or to state why not; it is not a verdict.
//
// reason       exit  boundary
// classified   0     true | false
// no-criteria  1     null — absence of a section is not a negative answer
// usage        2     null — no --doc, an unknown flag, or an unreadable file

/** The CLI's decision, pure over the document text. */
export function classifyCriteriaDoc(body) {
  const section = criteriaSection(body);
  if (section === null) {
    return { reason: "no-criteria", boundary: null, matched: [], exitCode: 1 };
  }
  const r = classifyBoundaryText(section, { scope: "criteria" });
  return {
    reason: "classified",
    boundary: r.boundary,
    matched: r.matched,
    exitCode: 0,
  };
}

function runCli(argv) {
  let doc = null;
  let json = false;
  let error = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") json = true;
    else if (a === "--doc") {
      // A flag where the path belongs is a missing path, not a file named "--json".
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) error ??= "--doc needs a path";
      else doc = argv[++i];
    } else error ??= `unknown argument: ${a}`;
  }
  let result;
  if (!error && !doc) error = "--doc <work-item.md> is required";
  if (!error) {
    try {
      result = classifyCriteriaDoc(readFileSync(doc, "utf8"));
    } catch (e) {
      error = `cannot read ${doc}: ${e.code || e.message}`;
    }
  }
  if (error)
    result = {
      reason: "usage",
      boundary: null,
      matched: [],
      exitCode: 2,
      error,
    };
  if (json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else if (result.reason === "classified") {
    const phrases = result.matched.map((m) => `"${m.phrase}"`).join(", ");
    process.stdout.write(
      result.boundary
        ? `boundary signal in the criteria: ${phrases} — record boundary: true, or boundary_reason\n`
        : "no boundary signal in the criteria\n",
    );
  } else {
    process.stderr.write(
      result.reason === "no-criteria"
        ? `no-criteria: ${doc} has no Success or Acceptance Criteria section\n`
        : `usage: ${result.error}\n`,
    );
  }
  process.exitCode = result.exitCode;
}

// Real paths on both sides: through the .agents/skills symlink, argv[1] and
// import.meta.url name the same file differently, and a plain compare runs
// nothing and exits 0 (obs #126).
function isInvokedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return (
      realpathSync(process.argv[1]) ===
      realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}

if (isInvokedDirectly()) runCli(process.argv.slice(2));
