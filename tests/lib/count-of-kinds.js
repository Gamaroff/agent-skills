"use strict";

/**
 * "How many test-free kinds are there?" has one answer, in finalise-dod-ac-prompt.md Step 3's
 * heading sentence (task 166). Two pins guard it — the AC prompt states the count once, and
 * review-task check 4 states none — and both use this one pattern, so they cannot disagree about
 * what a count looks like (QA cycle 4, CR4-6).
 *
 * A count is a number word, "both" or digits, up to three qualifiers, then "kinds". It is not:
 * - a section reference — "the Step 3 test-free kinds" (cycle 3, CR3-5);
 * - "kinds of <something other than criteria>" — "two kinds of evidence" (CR3-5); "kinds of
 *   criteria" and "kinds of test-free criterion" ARE counts (cycle 4, CR4-3).
 */
const COUNT_OF_KINDS =
  /(?<!Step )\b(two|three|four|five|six|seven|eight|nine|ten|\d+|both)(?: [\w"'“”-]+){0,3} kinds\b(?! of (?!(?:[\w"'“”-]+ )?criteri(?:on|a)(?![\w-])))/gi;

/**
 * Text as a reader sees it, for counting only: code formatting and emphasis (`**`, `*`, `__`, `_`)
 * stripped, whitespace collapsed — so "`two` kinds", "*two* kinds" and a count wrapped across lines
 * are still counts (cycle 3 CR3-6, cycle 4 CR4-7). Underscores are emphasis only at a word edge, so
 * an identifier such as test_citation is left alone.
 */
function prose(text) {
  return (
    text
      .replace(/`/g, "")
      // Whitespace first, so emphasis wrapped across lines is stripped like any other (cycle 5, CR5-3).
      .replace(/\s+/g, " ")
      .replace(/\*{1,2}(?=\S)([^*\n]+?)(?<=\S)\*{1,2}/g, "$1")
      .replace(
        /(^|[\s("'“])_{1,2}(?=\S)([^_\n]+?)(?<=\S)_{1,2}(?=[\s.,;:)!?"'”]|$)/gm,
        "$1$2",
      )
      .replace(/\s+/g, " ")
  );
}

/** Every count of kinds the text states, as matched. */
function countsOfKinds(text) {
  return [...prose(text).matchAll(COUNT_OF_KINDS)].map((m) => m[0]);
}

/** Both directions, held by a test so the pattern cannot drift silently. */
const FIXTURES = {
  match: [
    "The two `NOT_APPLICABLE` kinds",
    "the 3 test-free kinds",
    "three such test-free kinds",
    "Three kinds of criterion",
    "three kinds of criteria",
    "two kinds of test-free criterion",
    "on all three kinds",
    "both kinds pass",
    "*two* kinds",
    "_two_ kinds",
    "three\nkinds",
    "*three\ntest-free* kinds",
    'the two "test-free" kinds',
    '"_two_ kinds"',
  ],
  noMatch: [
    "the Step 3 test-free kinds",
    "two kinds of evidence",
    "both kinds of evidence",
    "the test-free kinds that Step 3 lists",
    "test_citation kinds",
    "two kinds of evidence per criterion",
    "two kinds of criterion-free evidence",
  ],
};

module.exports = { COUNT_OF_KINDS, prose, countsOfKinds, FIXTURES };
