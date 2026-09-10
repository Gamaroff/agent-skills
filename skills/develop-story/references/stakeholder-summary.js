// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/stakeholder-summary.js. Regenerate via `npm run bundle`.
"use strict";
/**
 * stakeholder-summary.js — the plain-language lead every tracker comment opens with.
 *
 * Standard, writing rules and worked examples: stakeholder-summary.md.
 *
 * WHY THIS IS A MODULE AND NOT A CONVENTION. The repository already has evidence
 * that a documented-but-unenforced comment convention drifts: the comment contract
 * says every GitHub site should route through tracker-comment.js, and several still
 * post a bare `gh issue comment`, because prose has no chokepoint. A lead that is
 * merely *asked for* ships missing the first time someone is in a hurry, and nothing
 * notices — a comment with no lead posts exactly as successfully as one with a lead.
 * Rendering it here, keyed by the --stage the engine already validates, is what makes
 * the rule mechanical.
 *
 * PURE BY CONTRACT. No I/O, no `process.exit`, no require of anything that performs
 * either. The caller owns the exit-2 decision and its error message; a module that
 * exits on the caller's behalf cannot be tested without spawning a process.
 */

/**
 * A verdict token is the single most-read fact in a testing comment and the single
 * most opaque. PASS/CONCERNS/FAIL/WAIVED are internal vocabulary — nothing about the
 * word "CONCERNS" tells an outside reader whether it is bad news, and guessing wrong
 * in either direction is worse than the raw token would have been. Map to a sentence;
 * never pass the token through.
 */
const GATE_MEANING = Object.freeze({
  PASS: "The checks found no problems.",
  CONCERNS:
    "The checks found some problems worth knowing about, but none that stop the work.",
  FAIL: "The checks found problems serious enough that the work is not finished.",
  WAIVED:
    "Some checks were deliberately skipped, and the reason is recorded below.",
});

/**
 * Resolve a verdict slot to its sentence. An absent, unknown or malformed verdict
 * falls back to the no-problems reading being ABSENT rather than being asserted:
 * the fallback states that testing happened and points at the body, which is true
 * regardless of the verdict. Defaulting to "no problems found" would turn a missing
 * slot into an unearned reassurance, which is the one direction this must not fail in.
 */
function verdictSentence(verdict) {
  if (typeof verdict !== "string") return "The results are recorded below.";
  const key = verdict.trim().toUpperCase();
  return GATE_MEANING[key] || "The results are recorded below.";
}

/**
 * Every template must return a complete, grammatical paragraph when called with `{}`.
 * That is the path that ships first — this task supplies no slots at any call site —
 * and a template that only reads well when fully populated would go live in its worst
 * form. Slots are therefore folded into the sentence, never appended to it: a lead
 * that degrades to a stub plus a dangling clause is worse than one that degrades to a
 * shorter true sentence.
 */
const LEAD_TEMPLATES = Object.freeze({
  "work-started": (s) =>
    `A developer has started work on this item${s.title ? ` — ${s.title}` : ""}. ` +
    `Nothing has changed yet in the live product; this is the point at which the work ` +
    `begins. The next update here will say what was built.`,

  review: (s) =>
    `Before any code is written, this item's written description is checked to make sure ` +
    `it is clear, complete and possible to build${s.outcome ? ` — the result was ${s.outcome}` : ""}. ` +
    `${
      s.blocking
        ? "Some things need answering before work can start; they are listed below. "
        : "Nothing is blocking the work from starting. "
    }` +
    `The detail below is for the team doing the building.`,

  "review-story": (s) =>
    `Before any code is written, the description of this piece of work was checked to make ` +
    `sure it is clear, complete and possible to build${s.outcome ? ` — the result was ${s.outcome}` : ""}. ` +
    `${
      s.blocking
        ? "Some things need answering before work can start; they are listed below. "
        : "Nothing is blocking the work from starting. "
    }` +
    `The detail below is for the team doing the building.`,

  "review-task": (s) =>
    `Before any code is written, the description of this piece of technical work was checked ` +
    `to make sure it is clear, complete and possible to build${s.outcome ? ` — the result was ${s.outcome}` : ""}. ` +
    `${
      s.blocking
        ? "Some things need answering before work can start; they are listed below. "
        : "Nothing is blocking the work from starting. "
    }` +
    `The detail below is for the team doing the building.`,

  "review-bug": (s) =>
    `This reported problem was checked to see whether it can be fixed as written — whether it ` +
    `is clear enough to act on, and whether it is genuinely still a problem` +
    `${s.outcome ? `, and the result was ${s.outcome}` : ""}. ` +
    `${
      s.blocking
        ? "Some things need answering before a fix can start; they are listed below. "
        : "Nothing is blocking a fix from starting. "
    }` +
    `The detail below is for the team doing the fixing.`,

  "develop-complete": (s) =>
    `The building is finished. Everything this item asked for has been written` +
    `${s.count ? ` (${s.count} separate pieces of work)` : ""}, and it now goes for checking. ` +
    `It is not live yet, and it may still change if the checks find problems.`,

  "in-review": (s) =>
    `The finished work has been submitted for review${s.pr ? ` (${s.pr})` : ""}. ` +
    `Other people now read it and test it before it can be added to the product. ` +
    `Expect either an approval or a list of changes.`,

  "qa-gate": (s) =>
    `The finished work has been through testing, and the results are in. ` +
    `${verdictSentence(s.verdict)} ` +
    `${
      s.blocking_count
        ? `${s.blocking_count} of them must be dealt with before this item can be finished. `
        : ""
    }` +
    `The detail below records what was tested and what was found.`,

  "qa-cycle": (s) =>
    `The work has been through another round of testing${s.cycle ? ` (round ${s.cycle})` : ""}. ` +
    `${verdictSentence(s.verdict)} ` +
    `If anything needs fixing it will be fixed and tested again before this item is finished.`,

  "qa-fix": (s) =>
    `The problems found in testing have been fixed${s.cycle ? ` (round ${s.cycle})` : ""}. ` +
    `The work now goes back for testing again, to confirm the fixes hold and that nothing ` +
    `else broke. This item is not finished until that testing passes.`,

  done: (s) =>
    `This work is finished and has been accepted. Everything it set out to do was checked and ` +
    `confirmed working, and the change is now part of the product${s.pr ? ` (${s.pr})` : ""}. ` +
    `No further action is needed on this item.`,
});

/**
 * Cycle-scoped stages carry a round number (`qa-cycle-3`, `qa-fix-2`) so that each
 * round posts its own comment instead of being suppressed by the previous round's
 * marker. The suffix is an identity detail, not a different moment, so it is stripped
 * before catalogue lookup rather than duplicated across numbered entries.
 *
 * Kept deliberately consistent with the same strip in
 * evals/shared/tests/transition-protocol-parity.test.mjs.
 */
/**
 * Slot values arrive from `--slot k=v` as STRINGS, always — the CLI has no type
 * information to give them. Templates then consume them by truthiness, so the
 * string "false" is truthy and `--slot blocking=false` rendered "Some things
 * need answering before work can start": the opposite of what the caller said,
 * in the one paragraph aimed at a reader who cannot check the body underneath
 * it. `blocking_count=0` and `count=0` failed the same way.
 *
 * Coerce at the boundary, so a template can go on being written the obvious way.
 * A missing lead is a gap; a confidently wrong one is misinformation.
 */
const FALSEY_SLOT_VALUES = Object.freeze([
  "",
  "0",
  "false",
  "no",
  "none",
  "null",
  "undefined",
]);

function normaliseSlots(slots) {
  if (!slots || typeof slots !== "object") return {};
  const out = Object.create(null);
  // OWN properties only. An inherited slot is never something the caller meant
  // to pass, and reading one lets a caller-constructed prototype reach the lead.
  for (const key of Object.keys(slots)) {
    const raw = slots[key];
    if (raw === null || raw === undefined) continue;
    const value = typeof raw === "string" ? raw.trim() : raw;
    if (
      typeof value === "string" &&
      FALSEY_SLOT_VALUES.includes(value.toLowerCase())
    ) {
      continue; // absent, not false — the template's own `? :` then reads correctly
    }
    if (typeof value === "number" && !Number.isFinite(value)) continue;
    if (value === false) continue;
    out[key] = value;
  }
  return out;
}

const CYCLE_SUFFIX = /-\d+$/;

const LEAD_STAGES = Object.freeze(Object.keys(LEAD_TEMPLATES));

/**
 * Render the lead for a stage.
 *
 * Returns `null` — never throws, never exits — for a stage with no template, including
 * an omitted or non-string one. The caller decides what an absent lead means; here it is
 * simply a fact about the catalogue.
 */
function renderLead(stage, slots = {}) {
  if (typeof stage !== "string" || stage === "") return null;
  const key = stage.replace(CYCLE_SUFFIX, "");
  // hasOwnProperty, not a bare bracket lookup: `LEAD_TEMPLATES["__proto__"]`
  // resolves up the prototype chain and is then CALLED, so renderLead threw for
  // `__proto__`/`valueOf` and returned a non-string for `constructor`/`toString`
  // — contradicting this function's own "returns null, never throws" contract,
  // which tracker-comment.js's exit-2 guard depends on. hasTemplate below always
  // guarded correctly; the two disagreed on the same input.
  if (!Object.prototype.hasOwnProperty.call(LEAD_TEMPLATES, key)) return null;
  const template = LEAD_TEMPLATES[key];
  if (typeof template !== "function") return null;
  return template(normaliseSlots(slots));
}

/** Whether the catalogue can render this stage. Same normalisation as renderLead. */
function hasTemplate(stage) {
  if (typeof stage !== "string" || stage === "") return false;
  return Object.prototype.hasOwnProperty.call(
    LEAD_TEMPLATES,
    stage.replace(CYCLE_SUFFIX, ""),
  );
}

module.exports = {
  LEAD_TEMPLATES,
  LEAD_STAGES,
  GATE_MEANING,
  renderLead,
  hasTemplate,
};
