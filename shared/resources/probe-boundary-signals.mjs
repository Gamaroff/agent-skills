// The signals that make a deliverable a BOUNDARY — stated once, as data.
//
// Prose peer: the "Signals" list in finalise-dod-security-prompt.md Step 1b, and
// probe-boundary-rule.md, which argue the rule. This module is what a test can
// call: `classifyBoundaryText` applies the text-shaped signals to a script's
// header, a function's doc comment or a work item's Success Criteria, and
// returns which phrase fired. Nothing here reads a file or runs anything.
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
      'a script or function whose own header or doc comment says it *refuses*, *never guesses*, or *fails closed* — in any language; a bash script is a boundary by its own words, and "not importable" routes it to the engine\'s `shell:` entry form, never to `boundary: false`',
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
