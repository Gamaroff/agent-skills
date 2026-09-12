/**
 * Contract test for the /finalise DoD security prompt.
 *
 * Why this exists: the security prompt was a grep-only inspector. On task 67 a substituted prompt
 * that *executed* candidate inputs found fourteen fail-open routes past a boundary the grep version
 * had reported as PASS — two of them commands the code deny-listed by name. The prompt now carries a
 * gated **probe mode** that executes candidates instead of reading for them.
 *
 * Prose has no compiler, so nothing but a test stops the load-bearing pieces from being softened
 * back out by a later edit: the detection rule that gates probe mode, the instruction to execute
 * rather than reason, the read-only clauses that keep execution safe, and the guard that makes zero
 * executed candidates a finding rather than a pass. Each assertion below names the piece it protects.
 *
 * Run: node --test evals/shared/tests/finalise-dod-prompt-contract.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { allCases } from "../../../shared/resources/security-input-corpus.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");

const PROMPT = "finalise-dod-security-prompt.md";
const sourcePath = join(repoRoot, "shared", "resources", PROMPT);
const bundledPath = join(repoRoot, "skills", "finalise", "references", PROMPT);
const skillPath = join(repoRoot, "skills", "finalise", "SKILL.md");

/**
 * Read lazily. A module-scope `readFileSync` throws ENOENT before any test runs, which makes the
 * existence assertions below unreachable — they could never observe a false, and their failure
 * messages could never be shown.
 */
let _source, _skill, _bundled;
const source = () => (_source ??= readFileSync(sourcePath, "utf-8"));
const skill = () => (_skill ??= readFileSync(skillPath, "utf-8"));
const bundled = () => (_bundled ??= readFileSync(bundledPath, "utf-8"));

/**
 * Match on collapsed whitespace. These assertions test a RULE, not the column its paragraph happens
 * to wrap at. Matching raw text makes a harmless rewrap fail with a message claiming the rule was
 * deleted — a false alarm that costs more than the assertion is worth.
 */
const flat = (t) => t.replace(/\s+/g, " ");
const has = (haystack, needle) => flat(haystack).includes(flat(needle));

test("the security prompt source exists where the bundler expects it", () => {
  assert.ok(existsSync(sourcePath), `missing shared/resources/${PROMPT}`);
});

// --- Phase 1: the detection rule ------------------------------------------------------------

test("the prompt defines when a deliverable counts as a boundary", () => {
  assert.match(
    source(),
    /###\s+Step 1b: Is the deliverable a boundary\?/,
    `${PROMPT}: the Step 1b boundary-detection heading is gone — probe mode has nothing to gate on`,
  );
  for (const signal of [
    "accept or reject",
    "allow-list or deny-list",
    "exported predicate",
    "Success Criteria",
  ]) {
    assert.ok(
      has(source(), signal),
      `${PROMPT}: the boundary detection rule no longer names "${signal}"`,
    );
  }
});

test("the detection rule states its negative case, so probe mode cannot fire on everything", () => {
  assert.ok(
    has(source(), "The negative case is explicit"),
    `${PROMPT}: the negative case is gone — without it probe mode fires on every work item`,
  );
  for (const nonBoundary of ["CRUD endpoint", "renderer", "report writer"]) {
    assert.ok(
      has(source(), nonBoundary),
      `${PROMPT}: the negative case no longer names "${nonBoundary}" as a non-boundary`,
    );
  }
  assert.ok(
    has(source(), "Probe mode must **not** fire on them"),
    `${PROMPT}: the prohibition on firing probe mode for non-boundaries has been softened`,
  );
});

test("the boundary decision is recorded explicitly, never inferred from an empty probes list", () => {
  assert.ok(
    has(source(), "Do **not** signal the decision by leaving `probes`"),
    `${PROMPT}: Step 1b no longer forbids signalling the decision via an empty list. An empty ` +
      `\`probes\` is ALSO the correct output for a boundary that was probed and held, so the two ` +
      `outcomes stop being distinguishable.`,
  );
});

// --- Phase 2: probe mode --------------------------------------------------------------------

test("the prompt has a probe-mode section gated on the detection rule", () => {
  assert.match(
    source(),
    /###\s+Step 4: Probe mode — only when Step 1b fired/,
    `${PROMPT}: the probe-mode heading is missing or no longer gated on Step 1b`,
  );
  assert.ok(
    has(source(), "Skip this step entirely when Step 1b found no boundary"),
    `${PROMPT}: probe mode is no longer explicitly skippable — it must not run on non-boundaries`,
  );
});

test("probe mode instructs execution, not abstract reasoning", () => {
  assert.ok(
    has(source(), "Do not reason abstractly"),
    `${PROMPT}: the "do not reason abstractly" instruction is gone. This is THE instruction — ` +
      `without it the agent inspects the boundary again and the prompt is a grep checklist with extra steps`,
  );
  assert.match(
    source(),
    /\*\*3\. Execute them\.\*\*/,
    `${PROMPT}: the "Execute them" step has been removed or renamed`,
  );
});

test("probe mode names every candidate axis that defeats boundaries in practice", () => {
  for (const axis of [
    "Alternative spellings",
    "Position",
    "Composition",
    "The unparseable case",
    "Flag forms",
  ]) {
    assert.ok(
      has(source(), axis),
      `${PROMPT}: candidate axis "${axis}" is gone — each one corresponds to a real task-67 escape`,
    );
  }
});

test("probe mode sources its candidates from the shared corpus", () => {
  assert.ok(
    has(source(), "security-input-corpus.md"),
    `${PROMPT}: the prompt no longer points at shared/resources/security-input-corpus.md — ` +
      `without it the agent re-derives a candidate set from prose on every run, which is what ` +
      `made two runs of the same probe reach different verdicts`,
  );
  assert.ok(
    has(source(), "security-input-corpus.mjs"),
    `${PROMPT}: the machine-readable peer is no longer named, so there is nothing to import`,
  );
  assert.ok(
    has(source(), "corpusFor("),
    `${PROMPT}: the corpus accessor is gone — naming the file without naming the call leaves ` +
      `the agent to guess how to read it`,
  );
});

/**
 * ─────────────────────────── The non-restatement guard ───────────────────────────
 *
 * The rule: the prompt must REFERENCE the corpus, not quote it. Two copies drift,
 * and the copy an agent reads is the one in front of it — task.74 found a third
 * stale copy of a scoping rule at its own DoD gate.
 *
 * ⚠️ The first version of this guard was VACUOUS, and the way it was vacuous is
 * worth keeping written down. It asked whether any WHOLE corpus input appeared in
 * the prompt. Run against the pre-change prompt — the axis table task.79 deleted,
 * the exact artefact this guard is named for — it reported ZERO findings and
 * passed. Real restatement is FRAGMENTARY: that table carried `cu'r'l`, `g\h` and
 * `--output`, each a *piece* of a corpus input, and whole-input containment
 * matched none of them. Its mutation proof passed only because the mutation
 * re-added two inputs in full, which is not the shape restatement takes.
 *
 * So the guard now works on fragments, and — more importantly — the test below
 * proves it can still see the real thing. DELETED_AXIS_TABLE is the deleted text,
 * kept as a fixture the detector MUST flag. Without that, a future simplification
 * could quietly return the guard to uselessness and every test would stay green.
 */

/** Inline code spans, which is how a prompt quotes an input. */
const codeSpans = (text) => [...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);

/**
 * A span distinctive enough that sharing text with a corpus input means quotation
 * rather than coincidence: it carries a shell/URL metacharacter, or is flag-shaped.
 *
 * Without this, ordinary words that happen to sit inside a corpus input — `data`,
 * `note`, `secret`, `https`, `ssl`, `process.env` — all match, and the guard cries
 * wolf on prose that quotes nothing. Verified: the filter drops exactly those six
 * and keeps the three real ones.
 */
const META = /[\\'"`;|&<>$(){}[\]*?~!#%^]/;
const FLAG = /^--?[A-Za-z]/;
const distinctive = (span) =>
  span.length >= 3 && (META.test(span) || FLAG.test(span));

/**
 * Text the prompt is allowed to use even though it collides with a corpus input.
 *
 * This replaces a `length >= 8` heuristic, which exempted 14 cases nobody had
 * chosen to exempt (`p@ss`, `[::1]`, `a/b+c=d`, `O'Brien`, …) while admitting
 * generic strings a future example would trip on. An explicit list is reviewed;
 * a character count is not. Add an entry here only with a reason.
 */
const PROMPT_MAY_MENTION = Object.freeze([
  // Empty, and worth keeping that way. It briefly held "--body", because the
  // prompt's YAML output example used `gh pr comment --body x` — which is a
  // de-escaped copy of the shell-exec case `g\h pr comment 1 --body x`. So the
  // one suppression was covering the one genuine paraphrase in the file: the
  // exemption list papering over exactly what it warns about. The example was
  // changed instead, and the exemption removed.
]);

/**
 * Distinctive TOKENS of the corpus inputs — whitespace-split, >=3 chars, and
 * either metacharacter-bearing or flag-shaped.
 *
 * The span scan below only sees INLINE CODE SPANS, which is how the deleted axis
 * table happened to quote its inputs. It is not the only way: bold, plain prose
 * and fenced blocks all restate without an inline span, and the span scan misses
 * every one of them — measured, not assumed. This token scan runs over the whole
 * text and catches those. The two are kept together because they are
 * complementary: the span scan catches `--output` (a substring of
 * `sort --output=/tmp/x file.txt`, which is not a whole token), and this one
 * catches `g\h` in a bold cell.
 */
function corpusFragments() {
  const set = new Set();
  const add = (t) => {
    if (t.length >= 3 && (META.test(t) || FLAG.test(t))) set.add(t);
    // Flag heads down to two characters — `-o`, `-i`. Safe only because
    // restatedFragments matches on a word boundary.
    if (t.length >= 2 && FLAG.test(t)) set.add(t);
  };
  for (const c of allCases()) {
    for (const token of c.input.split(/\s+/)) {
      const t = token.replace(/^[`*_]+|[`*_,.;:]+$/g, "");
      add(t);
      // A flag carrying its operand HIDES the flag: the token `--output=/tmp/x`
      // contains `--output`, which is what a restatement quotes. Without this
      // split, the axis table's Flag-forms row (`-o` and `--output`) was missed
      // by BOTH scans — and DELETED_AXIS_TABLE did not notice, because its
      // other rows carried code spans the span scan caught instead.
      if (t.includes("=")) add(t.slice(0, t.indexOf("=")));
    }
  }
  return [...set].filter((f) => !PROMPT_MAY_MENTION.includes(f));
}

const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Corpus fragments appearing anywhere in `text`, code span or not. */
function restatedFragments(text) {
  return corpusFragments().filter((f) =>
    new RegExp(`(?<![\\w-])${escapeRe(f)}(?![\\w-])`).test(text),
  );
}

/** Corpus inputs a span could be quoting. Short ones are punctuation, not quotation. */
const quotableInputs = () =>
  allCases()
    .map((c) => c.input)
    .filter((input) => input.length >= 3);

/** Every distinctive code span in `text` that shares text with a corpus input. */
function restatedSpans(text) {
  const inputs = quotableInputs();
  return [
    ...new Set(
      codeSpans(text)
        .filter(distinctive)
        .filter((span) => !PROMPT_MAY_MENTION.includes(span))
        .filter((span) =>
          inputs.some((input) => input.includes(span) || span.includes(input)),
        ),
    ),
  ];
}

/**
 * The axis table task.79 removed, verbatim. This is the fixture the detector must
 * flag — it is what "restatement" actually looked like in this file.
 */
const DELETED_AXIS_TABLE = [
  "| Axis | What to vary |",
  "|---|---|",
  "| **Alternative spellings** | quoting (`g\"h\"`, `cu'r'l`), escaping (`g\\h`), globbing, case, unicode look-alikes, added whitespace |",
  "| **Position** | a flag in trailing rather than leading position; the payload as the last argument rather than the first |",
  "| **Composition** | chaining (`a; b`, `a && b`), nesting, command substitution, piping into an interpreter |",
  "| **The unparseable case** | input the checker cannot read at all — malformed quoting, a truncated token, an empty string, a very long token |",
  "| **Flag forms** | the long **and** short form of every flag the code names by hand (`-o` and `--output`) |",
].join("\n");

test("the non-restatement detector can see the restatement it is named for", () => {
  const hits = [
    ...restatedSpans(DELETED_AXIS_TABLE),
    ...restatedFragments(DELETED_AXIS_TABLE),
  ];
  assert.ok(
    hits.length > 0,
    "the detector reports NOTHING on the deleted axis table — the exact text " +
      "the guard below exists to forbid. A guard that cannot fail on its own " +
      "worked example is not a guard, and this is precisely how the first " +
      "version of it shipped: green, and blind to the defect it named.",
  );
});

test("the detector sees a restatement that uses no inline code spans", () => {
  // The deleted table happened to quote its inputs in code spans. Nothing makes
  // that the only shape: bold, plain prose and fenced blocks all restate without
  // one, and the span scan misses every one of them. Measured, so this fixture
  // is a second worked example rather than a restatement of the first.
  const noSpans =
    "Vary the quoting, e.g. cu'r'l and g\\h, and the flag form -o / --output.";
  assert.equal(
    restatedSpans(noSpans).length,
    0,
    "precondition: this fixture deliberately contains no inline code spans",
  );
  assert.ok(
    restatedFragments(noSpans).length > 0,
    "the detector cannot see a restatement written without code spans — the " +
      "span scan alone was blind to bold, prose and fenced-block restatement",
  );
});

test("the detector sees a flag-forms restatement, which hides inside its operand", () => {
  // The narrowest real shape, and the one every earlier version of this guard
  // missed. The axis table's Flag-forms row quotes `-o` and `--output` —
  // neither is a whole token of any corpus input (the token is
  // `--output=/tmp/x`), and `-o` is under the three-character floor. Rewritten
  // in bold it escapes the span scan too. DELETED_AXIS_TABLE did not catch this
  // on its own, because its OTHER rows carry code spans the span scan sees: a
  // fixture can pass for the wrong reason, so this row is asserted alone.
  const flagRow =
    "| **Flag forms** | the long **and** short form of every flag the code " +
    "names by hand (**-o** and **--output**) |";
  assert.equal(
    restatedSpans(flagRow).length,
    0,
    "precondition: this fixture deliberately contains no inline code spans",
  );
  assert.ok(
    restatedFragments(flagRow).length > 0,
    "the detector misses a flag-forms restatement — `--output` hides inside " +
      "the corpus token `--output=/tmp/x`, and `-o` is two characters",
  );
});

test("probe mode does not restate the corpus's inputs", () => {
  const spans = restatedSpans(source());
  assert.deepEqual(
    spans,
    [],
    `${PROMPT} quotes corpus inputs: ${spans.map((s2) => JSON.stringify(s2)).join(", ")}. ` +
      `Reference the corpus; do not copy pieces of it. If one of these is a ` +
      `genuine coincidence, add it to PROMPT_MAY_MENTION with a reason rather ` +
      `than weakening the detector.`,
  );
});

test("probe mode does not carry a corpus fragment outside a code span", () => {
  const hits = restatedFragments(source());
  assert.deepEqual(
    hits,
    [],
    `${PROMPT} carries corpus fragments: ${hits.map((h) => JSON.stringify(h)).join(", ")}. ` +
      `If one is a genuine coincidence, add it to PROMPT_MAY_MENTION with a ` +
      `reason rather than weakening the scan.`,
  );
});

test("probe mode does not restate a whole corpus input either", () => {
  const flatSource = flat(source());
  const restated = allCases()
    .filter((c) => c.input.length >= 3)
    .filter((c) => flatSource.includes(flat(c.input)));
  assert.deepEqual(
    restated.map((c) => c.id),
    [],
    `${PROMPT} carries corpus inputs verbatim: ${restated.map((c) => c.id).join(", ")}`,
  );
});

test("probe mode asserts the accept direction too, so an over-strict fix is caught", () => {
  assert.ok(
    has(source(), "legitimate inputs that must still be accepted"),
    `${PROMPT}: the legitimate-input direction is gone — a boundary that refuses everything ` +
      `would now read as a pass`,
  );
});

test("probe mode reports only what reproduced, and counts everything it ran", () => {
  assert.ok(
    has(source(), "Report only what reproduced"),
    `${PROMPT}: the reproduced-only rule is gone — unreproduced suspicions would enter the gate`,
  );
  assert.ok(
    has(source(), "A candidate you did not run is not a finding"),
    `${PROMPT}: the "did not run is not a finding" rule has been softened`,
  );
  assert.ok(
    has(source(), "Report the total in **`probes_executed:`**"),
    `${PROMPT}: the execution count is no longer required. Without it a filtered \`probes\` list ` +
      `is the only signal, and "probed and held" is indistinguishable from "probed nothing".`,
  );
});

// --- The read-only contract -----------------------------------------------------------------

test("the read-only contract survives, redefined as does-not-mutate rather than does-not-run", () => {
  assert.ok(
    has(
      source(),
      "Read-only means you do not mutate. It does not mean you do not run.",
    ),
    `${PROMPT}: the read-only redefinition is gone. Restoring a bare "read-only agent" is what ` +
      `foreclosed execution and let the fourteen routes through`,
  );
  for (const clause of [
    "modify, stage, or commit any file tracked by the repository",
    "open a network connection",
    "write anywhere outside a temporary directory",
  ]) {
    assert.ok(
      has(source(), clause),
      `${PROMPT}: the read-only clause "${clause}" is missing — probe mode is only safe with all three`,
    );
  }
});

// --- Phase 3: return shape and the zero-probes guard -----------------------------------------

/**
 * Slice the fenced ```yaml block out and assert the return shape against THAT. Matching these keys
 * against the whole document would pass even if they were moved out of the return shape entirely.
 * Applied to every key set, not only the probe fields — a vacuity fix covering half the keys leaves
 * the other half exactly as vacuous as before.
 */
function yamlBlock() {
  const block = source().match(/```yaml\n([\s\S]*?)```/);
  assert.ok(block, `${PROMPT}: no fenced yaml output block found`);
  return block[1];
}

test("the returned YAML keeps the shape finalise/SKILL.md renders", () => {
  const yaml = yamlBlock();
  for (const key of [
    "security_review:",
    "story_type:",
    "checks:",
    "general:",
    "overall:",
    "summary:",
  ]) {
    assert.ok(
      yaml.includes(key),
      `${PROMPT}: the returned YAML block no longer carries "${key}" — skills/finalise/SKILL.md renders it`,
    );
  }
});

test("the returned YAML carries the probe fields, inside the fenced output block", () => {
  const yaml = yamlBlock();
  for (const field of [
    "boundary:",
    "probes_executed:",
    "probes:",
    "input:",
    "expected:",
    "actual:",
    "reproduced:",
  ]) {
    assert.ok(
      yaml.includes(field),
      `${PROMPT}: the returned YAML block no longer carries "${field}"`,
    );
  }
});

test("zero executed candidates on a boundary is a finding, not a pass", () => {
  assert.ok(
    has(
      source(),
      "Zero executed candidates on a boundary deliverable is a finding, not a pass",
    ),
    `${PROMPT}: the zero-probes guard is gone. Without it a probe mode that ran nothing reports ` +
      `success — the same self-certifying defect this prompt exists to catch`,
  );
  assert.ok(
    has(source(), "probe mode executed no candidates"),
    `${PROMPT}: the named FAIL check for an empty probe run is missing`,
  );
});

test("the zero-executed guard keys on the execution count, not on an empty probes list", () => {
  assert.ok(
    has(source(), "If `boundary: true` and `probes_executed: 0`"),
    `${PROMPT}: the guard no longer keys on probes_executed. Keying it on an empty \`probes\` ` +
      `condemns the one outcome everybody wants — a boundary probed thoroughly that held.`,
  );
  assert.ok(
    has(source(), "An empty `probes` is not by itself a failure"),
    `${PROMPT}: the clarification that an empty probes list can be the GOOD result is gone`,
  );
  assert.ok(
    has(source(), "What is never a pass is a boundary that executed nothing"),
    `${PROMPT}: the probe rule no longer names what actually cannot pass`,
  );
});

// --- The consumer ---------------------------------------------------------------------------

test("skills/finalise/SKILL.md renders probe results in the Security section", () => {
  assert.ok(
    has(skill(), "### Probe Results"),
    "skills/finalise/SKILL.md: the Probe Results sub-block is missing from the Security append",
  );
  // Anchor `probes` — it is a strict prefix of `probes_executed`, so the bare form still passes
  // if `probes` itself is dropped from the render and only the count survives.
  for (const marker of [
    "security_result.probes where",
    "security_result.probes_executed",
    "Candidates executed:",
    "reproduced:",
  ]) {
    assert.ok(
      has(skill(), marker),
      `skills/finalise/SKILL.md: the probe render no longer references "${marker}"`,
    );
  }
});

test("the probe render branches on boundary, not on list emptiness", () => {
  assert.ok(
    has(skill(), "{else if security_result.boundary == false:}"),
    "skills/finalise/SKILL.md: the probe render must branch on `boundary`, and `false` must be its " +
      "own branch. Branching on an empty `probes` reports a boundary that held and one that was " +
      "never probed identically.",
  );
  assert.ok(
    has(skill(), "**Candidates executed:** {security_result.probes_executed"),
    "skills/finalise/SKILL.md: the candidate count must render `probes_executed`, not the length " +
      "of the filtered `probes` list",
  );
  assert.ok(
    has(skill(), "The boundary held"),
    "skills/finalise/SKILL.md: the probed-and-held case has no render branch of its own, so the " +
      "good outcome is reported as though probe mode never ran",
  );
  assert.ok(
    has(skill(), "Probe mode executed no candidates"),
    "skills/finalise/SKILL.md: the zero-executed case has no render branch of its own",
  );
});

test("an absent boundary renders as unverified, never as 'not a boundary'", () => {
  assert.ok(
    has(skill(), "{if security_result.boundary is absent or not a boolean:}"),
    "skills/finalise/SKILL.md: a missing `boundary` falls into the `false` branch, so an agent that " +
      "never answered the question is reported as having answered 'not a boundary'. That moves the " +
      "conflation up a level rather than removing it.",
  );
  assert.ok(
    has(skill(), "reported no boundary decision"),
    "skills/finalise/SKILL.md: the unverified case has no render branch of its own",
  );
  assert.ok(
    has(source(), "A missing `boundary` is not `false`"),
    `${PROMPT}: the prompt no longer states that omitting boundary is not a way to answer it`,
  );
});

test("an absent probes_executed counts as zero, not as a pass", () => {
  assert.ok(
    has(skill(), "{if security_result.probes_executed is absent or == 0:}"),
    "skills/finalise/SKILL.md: `probes_executed` absent under `boundary: true` falls through to the " +
      "held branch, granting the good verdict to an agent that reported a boundary and omitted the " +
      "count — the zero-executed guard reachable by omission instead of by a zero.",
  );
  assert.ok(
    has(
      source(),
      "missing `probes_executed` under `boundary: true` counts as **zero**",
    ),
    `${PROMPT}: the prompt no longer states that an absent probes_executed counts as zero`,
  );
});

test("the held branch keys on no probe having reproduced, not on an empty list", () => {
  assert.ok(
    has(
      skill(),
      "{if any probe in security_result.probes has reproduced == true:}",
    ),
    "skills/finalise/SKILL.md: the held branch keys on list emptiness while the findings branch " +
      "filters on `reproduced`, so a `reproduced: false` entry makes the list non-empty and " +
      "suppresses the verdict line entirely — header, no bullets, no verdict.",
  );
});

/**
 * Hold the EXCLUSIVITY, not the substrings.
 *
 * The three branch tests above assert that each marker is present. Presence is not the property that
 * matters: an earlier revision had the zero-executed callout and the held verdict as two independent
 * `{if}` blocks, so `probes_executed: 0` with nothing reproduced rendered BOTH "❌ executed no
 * candidates" AND "✅ the boundary held" — and every presence assertion passed green. A test whose
 * failure message claims to protect the verdict line has to be able to see that state.
 *
 * So parse the block's control tokens in order and assert the shape.
 */
function probeRenderTokens() {
  const text = skill();
  const start = text.indexOf("### Probe Results");
  assert.ok(
    start !== -1,
    "skills/finalise/SKILL.md: the Probe Results block is gone",
  );
  // Anchor the end AFTER the start — `**Agent summary:**` also appears in earlier append blocks,
  // and slicing to the first occurrence yields an empty string that silently passes every token
  // check below.
  const end = text.indexOf("**Agent summary:**", start);
  assert.ok(
    end !== -1,
    "skills/finalise/SKILL.md: no agent-summary line after the Probe Results block",
  );
  // Strip HTML comments before tokenising: the block carries a note that mentions `{if}` in prose,
  // and counting that as markup makes the balance check report a phantom imbalance.
  const block = text.slice(start, end).replace(/<!--[\s\S]*?-->/g, "");
  assert.ok(
    block.length > 0,
    "skills/finalise/SKILL.md: Probe Results block is empty",
  );
  return {
    block,
    tokens:
      block.match(/\{(?:if|else if|else|endif|for each|endfor)[^}]*\}/g) ?? [],
  };
}

test("the two verdict lines are an if/else-if pair, so they cannot both render", () => {
  const { block, tokens } = probeRenderTokens();

  const zeroIdx = tokens.findIndex((t) =>
    t.includes("probes_executed is absent or == 0"),
  );
  assert.ok(
    zeroIdx !== -1,
    "skills/finalise/SKILL.md: the zero-executed test is gone",
  );

  const heldToken = tokens[zeroIdx + 1];
  assert.ok(
    heldToken !== undefined && heldToken.startsWith("{else if"),
    `skills/finalise/SKILL.md: the token after the zero-executed test is ${heldToken} — the held ` +
      `verdict must be an \`{else if}\` continuation of it. As two independent \`{if}\` blocks, ` +
      `\`probes_executed: 0\` with nothing reproduced renders BOTH "executed no candidates" and ` +
      `"the boundary held" — claiming every candidate passed when none ran.`,
  );
  assert.ok(
    heldToken.includes("no probe") && heldToken.includes("reproduced"),
    `skills/finalise/SKILL.md: the held verdict's condition is ${heldToken} — it must test that no ` +
      `probe reproduced`,
  );

  // The ✅ line must sit between that {else if} and the {endif} that closes the pair.
  const heldAt = block.indexOf("The boundary held");
  const elseIfAt = block.indexOf(heldToken);
  assert.ok(
    elseIfAt !== -1 && heldAt > elseIfAt,
    "skills/finalise/SKILL.md: the ✅ held line must be emitted inside the else-if arm",
  );
  // Count, don't just locate. `indexOf` finds the first occurrence, so a SECOND independent
  // `{if …:} ✅ The boundary held {endif}` appended after the pair would leave every ordering
  // assertion satisfied and the {if}/{endif} count balanced, while restoring exactly the double
  // render this test exists to prevent.
  for (const verdict of [
    "The boundary held",
    "Probe mode executed no candidates",
  ]) {
    const occurrences = block.split(verdict).length - 1;
    assert.equal(
      occurrences,
      1,
      `skills/finalise/SKILL.md: "${verdict}" appears ${occurrences} times in the Probe Results ` +
        `block. A duplicate outside the if/else-if pair re-introduces the double render while ` +
        `satisfying every ordering check.`,
    );
  }

  const zeroAt = block.indexOf("Probe mode executed no candidates");
  assert.ok(
    zeroAt !== -1 && zeroAt < elseIfAt,
    "skills/finalise/SKILL.md: the ❌ zero-executed line must precede the else-if that guards the ✅ line",
  );
});

test("the probe render's control tokens balance", () => {
  const { tokens } = probeRenderTokens();
  const opens = tokens.filter((t) => t.startsWith("{if")).length;
  const closes = tokens.filter((t) => t === "{endif}").length;
  assert.equal(
    opens,
    closes,
    `skills/finalise/SKILL.md: ${opens} {if} vs ${closes} {endif} in the Probe Results block — an ` +
      `unbalanced template is read literally by the agent that renders it`,
  );
  const fors = tokens.filter((t) => t.startsWith("{for each")).length;
  const endfors = tokens.filter((t) => t === "{endfor}").length;
  assert.equal(
    fors,
    endfors,
    `skills/finalise/SKILL.md: ${fors} {for each} vs ${endfors} {endfor}`,
  );
});

test("the probe render sits inside the Security section, before the agent summary", () => {
  const probeAt = skill().indexOf("### Probe Results");
  const generalAt = skill().indexOf("### General Security");
  const summaryAt = skill().indexOf(
    "**Agent summary:** {security_result.summary}",
  );
  assert.ok(
    generalAt !== -1 && probeAt !== -1 && summaryAt !== -1,
    "security render anchors missing",
  );
  assert.ok(
    generalAt < probeAt && probeAt < summaryAt,
    "skills/finalise/SKILL.md: Probe Results must render after General Security and before the agent summary",
  );
});

// --- Bundling -------------------------------------------------------------------------------

test("finalise bundles the security prompt under references/", () => {
  assert.ok(
    existsSync(bundledPath),
    `run \`npm run bundle\` — skills/finalise/references/${PROMPT} is missing`,
  );
});

import { bundleCheck } from "../lib/bundled-parity.mjs";

/**
 * Every shared resource the prompt drags into skills/finalise/references/.
 *
 * `bundle_skill.py` walks shared refs TRANSITIVELY, so this is not just the
 * prompt: the prompt references the corpus doc, the corpus doc references its
 * `.mjs` peer and `mutation-proving.md`, and all four ship. Listing only the
 * prompt is how a stale corpus reaches the agent — the exact drift the corpus
 * exists to prevent, reintroduced one directory over.
 */
const bundledDir = join(repoRoot, "skills", "finalise", "references");
const BUNDLED_REFS = readdirSync(bundledDir).filter(
  (f) =>
    // Files only. Both consumers below `readFileSync` every entry, so a
    // directory here throws EISDIR and the parity test reports staleness for
    // something that is not stale. `shared/resources/tests/` is a directory the
    // bundler could plausibly emit a peer for one day.
    statSync(join(bundledDir, f)).isFile() &&
    existsSync(join(repoRoot, "shared", "resources", f)),
);

/**
 * The rewrite can CORRUPT a path as easily as it can fix one, and a freshness
 * check cannot see it: `bundle --check` asks whether the copy is what the
 * bundler would write, so a source and a bundled copy that differ only by a
 * faithfully-applied but wrong rewrite compare equal.
 *
 * Found the hard way during task.79's own qa-fix cycle. A fix for an
 * unresolvable import wrote `join(repoRoot, "shared/resources/…")` into the
 * prompt; the bundler rewrote it to `join(repoRoot, "references/…")`, which
 * resolves to nothing — so the "fix" shipped a *different* broken import to the
 * only copy an agent reads. `repoRoot` + `references/` is never a real path,
 * which makes the corruption exactly detectable.
 */
test("no bundled reference builds a repo-root path out of the rewritten directory", () => {
  for (const ref of BUNDLED_REFS) {
    const bun = join(repoRoot, "skills", "finalise", "references", ref);
    if (!existsSync(bun)) continue;
    const text = readFileSync(bun, "utf-8");
    const bad = [...text.matchAll(/repoRoot[^\n]{0,40}["'`]references\//g)].map(
      (m) => m[0],
    );
    assert.deepEqual(
      bad,
      [],
      `skills/finalise/references/${ref} builds a path from repoRoot + ` +
        `"references/", which does not exist. The source almost certainly says ` +
        `"shared/resources/..." inside a code example, and the bundler rewrote ` +
        `it. Write the example so it does not carry a rewritable path — e.g. ` +
        `try both directory names at runtime.`,
    );
  }
});

test("every transitively-bundled reference is in sync with its source", () => {
  // Freshness as the BUNDLER defines it, not marker presence and not a
  // test-local byte comparison. The first version of this test checked that
  // five strings survived into the bundled copy, which a stale copy passes
  // trivially — it passed on an edited-but-unbundled prompt during task.79's
  // own development. The second undid the `shared/resources/` → `references/`
  // rewrite by hand and compared bytes, which stopped being a faithful inverse
  // when task.108 taught the bundler to re-relativise every other prose link.
  // `bundle_skill.py --check` is the one definition of "in sync"; asking it is
  // what keeps this test from drifting the next time the rewrite grows.
  // `npm run ci:fast` never runs the bundler's WRITE path, so nothing else
  // here would catch a stale copy.
  const { ok, problems, stdout } = bundleCheck(
    join(repoRoot, "skills", "finalise"),
  );
  for (const ref of BUNDLED_REFS) {
    const src = join(repoRoot, "shared", "resources", ref);
    const bun = join(repoRoot, "skills", "finalise", "references", ref);
    assert.ok(existsSync(src), `missing source shared/resources/${ref}`);
    assert.ok(
      existsSync(bun),
      `skills/finalise/references/${ref} is missing — the prompt pulls it in ` +
        `transitively. Run \`npm run bundle\` and commit the result.`,
    );
    assert.ok(
      !problems.has(ref),
      `skills/finalise/references/${ref} is ${problems.get(ref)} — it differs ` +
        `from shared/resources/${ref}. Run \`npm run bundle\` and commit it. An ` +
        `agent reads the bundled copy, so a stale one is a wrong answer ` +
        `delivered confidently.`,
    );
  }
  assert.ok(
    ok,
    `bundle_skill.py --check skills/finalise reported problems outside the ` +
      `prompt's own references:\n${stdout}`,
  );
});
