"use strict";

// ---------------------------------------------------------------------------
// qa-diminishing-returns.js — has this QA loop finished, or merely gone quiet?
// ---------------------------------------------------------------------------
// Canonical spec: develop-pipeline-step-5-6-qa-loop.md, "Diminishing-returns
// exit". That section is the contract a pipeline reader executes; this module is
// what a test can execute, and the two must say the same thing.
//
// Since task.123 this module is also the loop's ROUTE CLASSIFIER —
// `classifyLoopRoute()` at the bottom — and the Diminishing-returns predicate is
// one arm of it. The other arms are route 2b (cosmetic residue: a PASS gate
// whose open entries are all LOW, after two HIGH-0 gates) and route 2c (gate the
// last fix: the budget is spent, HIGH was 0 throughout, MEDIUM fell strictly for
// three cycles, and the last budgeted cycle landed a fix no gate has read). Each
// is a predicate over the gate sequence, the latest gate's queue and the budget
// state, so each lives here as a fixture row first and prose second. The five
// properties below apply to every arm.
//
// THE QUESTION, AND WHY IT IS NOT THE CONVERGENCE CHECK'S QUESTION
//
// The Convergence check beside this one fires when HIGH findings **remain and
// stop falling** — a real blocker is unfixed, the loop has stopped working, and
// the right answer is to escalate to a person. This module answers the opposite
// shape: HIGH findings are **gone**, and what the loop keeps producing are
// findings about its own test machinery. Nothing is blocked; further cycles
// refine the pins. Escalating that would misreport finished work as stalled.
//
// Measured, on the run this was derived from: HIGH `2, 0, 0, 0` across four
// cycles, 21 findings, **not one of them in the three fixes the task existed to
// make**. Cycles 3 and 4 examined the repairs to cycle 2's repairs. The
// Convergence check evaluated correctly throughout and correctly did not trip.
//
// FIVE PROPERTIES, each because the obvious alternative fails:
//
//   1. NO FILESYSTEM ACCESS.   The caller passes gate *content* and resolved
//                              config values, never paths. Same reason as
//                              review-report-freshness.js: a rule that reads the
//                              disk decides differently in a fresh clone (CI, a
//                              /develop-batch worktree) than on a developer's
//                              machine, and a gate that is believed in both
//                              places must not be one of those.
//
//   2. HIGH COUNTS ARE INPUT.  This module does NOT count HIGH findings. The
//                              Convergence check's awk already computed `HIGH_N`
//                              for this cycle and recorded it in QA Iteration
//                              History; the caller passes that sequence in. A
//                              second implementation of one count is two things
//                              to keep honest, and the failure mode is silent:
//                              the two guards would disagree about the same run
//                              and each would look right on its own. The awk's
//                              hard-won rules — count what the gate RAISED, do
//                              not exclude `status: closed`, pin entry
//                              boundaries to the first entry's indent — are not
//                              restated here because they are not re-decided
//                              here.
//
//   3. AN EMPTY RESIDUE NEVER EXITS.  A gate with no `top_issues[]` at all does
//                              not fire this exit. Condition 2 ("every finding
//                              is machinery") is vacuously true of no findings,
//                              and a rule that fires on vacuous truth fires
//                              hardest exactly when its reader is broken. A gate
//                              with no findings is a clean gate; it exits through
//                              5c on the ordinary PASS path, which is where it
//                              belongs.
//
//   4. OPT-IN ON POSITIVE EVIDENCE, NEVER ON ABSENCE.  A finding with no `file:`,
//                              or one the globs do not match, FAILS condition 2.
//                              An unconfigured consumer (`testArtifactGlobs: []`)
//                              matches nothing and therefore never exits — which
//                              is the fail-safe direction stated as a default
//                              rather than as an opt-out. A missed exit costs
//                              time; a wrong exit ships a defect.
//
//   5. IT NEVER THROWS.        A throw surfaces as a crashed pipeline step rather
//                              than a decision. Malformed input returns a verdict
//                              with a reason. Same discipline as
//                              review-report-freshness.js and tracker-workflow.js.
//
// CONDITION 3 AND THE `category:` FIELD THAT IS NOT THERE
//
// The task that specified this rule wrote condition 3 as "no finding is a
// product-behaviour defect (`category: bug` against a non-test path)", and asked
// that the field be verified against the gate schema before implementing. It was:
// **no gate in this corpus carries `category:`**. Real `top_issues[]` entries
// carry `id`, `severity`, `file`, `finding`, `suggested_action`,
// `suggested_owner`, `status`.
//
// Requiring a field nothing emits would make the exit unreachable — a rule that
// can never fire is not conservative, it is dead, and it would be indis-
// tinguishable from one that is broken. So condition 3 is evaluated from what a
// gate does carry, and `category:` is honoured as an OPTIONAL refinement for the
// day a QA skill starts emitting it:
//
//   (a) `nfr_validation.*.status` — any value that is not PASS is a positive
//       signal that product behaviour is implicated, and it lives in a different
//       part of the gate from `file:`, which is what keeps condition 3
//       independent of condition 2. That independence is the whole point: it is
//       what catches a product defect filed with a test-file `file:`.
//   (b) `category: bug` on an entry whose `file:` is not machinery — checked when
//       the field is present, ignored when it is not.
//
// Note the asymmetry, which is deliberate and is not the same rule as property 4:
// condition 2 asks for positive evidence that every finding IS machinery, and
// absence fails it. Condition 3 asks whether any finding IS a product defect, and
// only positive evidence fails it. Demanding proof of a negative would make every
// gate fail condition 3, i.e. property 4 applied here would produce exactly the
// dead rule described above.

// ── glob matching ──────────────────────────────────────────────────────────

// A small, total glob→RegExp. `**` crosses separators, `*` and `?` do not, and
// every other character is escaped. Deliberately not a dependency: this repo has
// no production runtime deps (tech-stack.md), and the alternative — matching on
// substrings like "test" — is what would let `src/latest-price.ts` read as
// machinery.
//
// Order matters in the scanner below: `**/` is consumed before `**`, so
// `tests/**/*.mjs` also matches `tests/a.mjs` (zero intervening directories),
// which is what every reader expects a `**/` to mean.
function globToRegExp(glob) {
  if (typeof glob !== "string" || glob === "") return null;
  let out = "^";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*") {
      // COLLAPSE RUNS OF `*` FIRST. Three or more consecutive stars mean exactly
      // what two mean in glob semantics, so collapsing is a no-op on meaning —
      // and it is what stops the compiler emitting a chain of adjacent
      // quantifiers.
      //
      // Without it, `*` × N compiles to `[^/]*` × N, which is the textbook
      // catastrophic-backtracking shape: matching a non-matching path takes time
      // exponential in N. Measured on the shipped code before this fix, against a
      // 60-character path: 8 stars 15ms, 10 stars 193ms, 12 stars 2.2s, **14
      // stars 23s** — and it does not stop, it just takes longer.
      //
      // Not a vulnerability: both inputs are repo-controlled — the globs come
      // from a committed `skills-config.yaml` and the paths from a committed gate
      // file — so there is no untrusted-input path. It is a **hang**, self-
      // inflicted by an unusual but legal config, in a rule that runs inside the
      // QA loop. Found by executing the predicate against generated candidates at
      // the DoD security gate, not by reading it; four QA cycles of review had
      // walked past it.
      let run = 0;
      while (glob[i + run] === "*") run++;
      if (run > 2) {
        i += run - 2; // leave exactly two for the `**` handling below
      }
      if (glob[i + 1] === "*") {
        if (glob[i + 2] === "/") {
          out += "(?:.*/)?"; // `**/` — any number of directories, including none
          i += 3;
          continue;
        }
        out += ".*"; // bare `**` — anything, separators included
        i += 2;
        continue;
      }
      out += "[^/]*"; // `*` — anything but a separator
      i += 1;
      continue;
    }
    if (c === "?") {
      out += "[^/]";
      i += 1;
      continue;
    }
    out += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    i += 1;
  }
  return new RegExp(out + "$");
}

// Normalise a `file:` value to the repo-relative form the globs are written
// against. Backslashes become forward slashes (a Windows checkout writes them),
// a `./` prefix is dropped, and a leading `/` is dropped — a gate written by hand
// sometimes carries one, and `/shared/x.js` and `shared/x.js` are the same file.
function normalisePath(file) {
  if (typeof file !== "string") return null;
  let p = file.trim().replace(/\\/g, "/");
  if (p === "") return null;
  p = p.replace(/^\.\//, "").replace(/^\/+/, "");
  return p === "" ? null : p;
}

/**
 * Does `file` match any of `globs`?
 *
 * An empty or absent glob list matches nothing — that is the default, and it is
 * what makes an unconfigured consumer keep today's behaviour exactly.
 */
function matchesAnyGlob(file, globs) {
  const p = normalisePath(file);
  if (p === null) return false;
  if (!Array.isArray(globs)) return false;
  for (const g of globs) {
    const re = globToRegExp(g);
    if (re !== null && re.test(p)) return true;
  }
  return false;
}

// ── gate reading ───────────────────────────────────────────────────────────

// Gates are YAML, but not a YAML subset any of this repo's readers handles: a
// `finding:` is routinely a multi-line block scalar, and one of them can contain
// a line that looks like a key. So this is a focused scanner over the two blocks
// the rule needs, using the same two indent rules the Convergence check's awk
// arrived at, for the same reasons:
//
//   * entry boundaries are pinned to the FIRST entry's indent, so a wrapped
//     prose line beginning `- ` does not split one entry into two;
//   * a key is only read at the entry's own key indent, so `severity: high`
//     written inside a `finding:` block scalar is prose, not a field.
//
// Both were learned the expensive way in the awk. Re-deriving them here would
// have meant re-learning them.

function splitLines(text) {
  return text.split(/\r?\n/);
}

function indentOf(line) {
  const m = line.match(/[^ ]/);
  return m ? m.index : line.length;
}

// Strip a trailing `# comment`, honouring quotes, then unquote a scalar.
function scalarValue(raw) {
  let v = "";
  let inS = false;
  let inD = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === "#" && !inS && !inD) break;
    v += c;
  }
  v = v.trim();
  if (
    v.length > 1 &&
    ((v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'")))
  ) {
    v = v.slice(1, -1);
  }
  return v;
}

/**
 * The `top_issues[]` entries a gate raises, as `{id, severity, file, category,
 * status}` — every field a string or null, never undefined. `id` is what route 2b
 * carries into `recommendations.future`; like `file` it is case-preserved.
 *
 * Returns `[]` for a gate with no `top_issues:` block, and `null` when the input
 * is not a string at all. Those are different answers and the caller must not
 * collapse them: `[]` is "this gate raised nothing", `null` is "there is no gate
 * here to read", and only the second is a broken instrument.
 */
function readTopIssues(gateContent) {
  if (typeof gateContent !== "string") return null;
  const lines = splitLines(gateContent);

  let inBlock = false;
  let base = null; // indent of the first `- ` entry
  let entries = [];
  let current = null;

  const push = () => {
    if (current !== null) entries.push(current);
    current = null;
  };

  for (const line of lines) {
    if (!inBlock) {
      if (/^top_issues[ \t]*:/.test(line)) inBlock = true;
      continue;
    }

    if (line.trim() === "") continue;

    const ind = indentOf(line);

    // A non-blank line at column 0 that is not part of the list ends the block.
    // Gate files put `waiver:`, `quality_score:` and the rest at column 0.
    if (ind === 0 && !/^-[ \t]/.test(line)) break;

    const isEntry = /^[ \t]*-[ \t]/.test(line);
    if (isEntry && base === null) base = ind;

    if (isEntry && ind === base) {
      push();
      current = {
        id: null,
        severity: null,
        file: null,
        category: null,
        status: null,
      };
      // An inline entry — `- {severity: high, file: x}` — or the first key on the
      // dash line, which is the common `- id: "…"` form.
      const rest = line.slice(line.indexOf("-") + 1);
      readKeysInto(current, rest);
      continue;
    }

    if (current === null) continue;

    // Keys belong to the entry only at the entry's own key indent. Anything
    // deeper is inside a block scalar or a nested map: prose, not a field.
    if (base !== null && ind === base + 2) {
      readKeysInto(current, line);
    }
  }
  push();
  return entries;
}

const KEY_RE =
  /(?:^|[{,\s])(id|severity|file|category|status)[ \t]*:[ \t]*([^,}]*)/g;

// Three of the four keys are ENUMERATIONS, where case carries no information and
// folding makes the comparison robust. The fourth, `file:`, is a FILESYSTEM
// PATH, where case IS information.
//
// Folding all four was the original form, and it silently disabled the whole
// feature for any consumer whose `qa.testArtifactGlobs` contains a capital
// letter: the glob is written against the real path and matched against the
// folded one, so `src/Components/**` could never match. The direction was
// fail-safe — the exit simply never fires — which is precisely why it was
// invisible, because that is byte-identical from the consumer's side to never
// having configured the key at all. It also put a path that does not exist on
// disk into the reported `findings[].file`, sending anyone who tried to open it
// nowhere.
//
// The 32-test suite could not see it, and no mutation of that line would have
// been visible either: every fixture path and every glob in the suite was
// lowercase, so the fold was a no-op suite-wide. Mutation-proving asks whether a
// test can fail when the behaviour is removed; it cannot see a fixture
// population that never exercises the behaviour in the first place.
const CASE_INSENSITIVE_KEYS = new Set(["severity", "category", "status"]);

function readKeysInto(entry, text) {
  KEY_RE.lastIndex = 0;
  let m;
  while ((m = KEY_RE.exec(text)) !== null) {
    const key = m[1];
    // FIRST wins, as in review-report-freshness.js: a later stray occurrence
    // should not override the real field, and "later" is the half an author is
    // least likely to be looking at.
    if (entry[key] !== null) continue;
    const v = scalarValue(m[2]);
    if (v === "") {
      entry[key] = null;
      continue;
    }
    entry[key] = CASE_INSENSITIVE_KEYS.has(key) ? v.toLowerCase() : v;
  }
}

/**
 * The `nfr_validation` sub-block statuses a gate carries, lowercased.
 *
 * `[]` when the block is absent — which is NOT a signal of a defect, per the
 * condition-3 note in the header. `null` when there is no gate to read.
 */
function readNfrStatuses(gateContent) {
  if (typeof gateContent !== "string") return null;
  const lines = splitLines(gateContent);
  let inBlock = false;
  const out = [];
  for (const line of lines) {
    if (!inBlock) {
      if (/^nfr_validation[ \t]*:/.test(line)) inBlock = true;
      continue;
    }
    if (line.trim() === "") continue;
    if (indentOf(line) === 0) break;
    const m = line.match(/^[ \t]+status[ \t]*:[ \t]*(.+)$/);
    if (m) {
      const v = scalarValue(m[1]).toLowerCase();
      if (v !== "") out.push(v);
    }
  }
  return out;
}

// ── the verdict ────────────────────────────────────────────────────────────

const VERDICTS = Object.freeze({ EXIT: "exit", CONTINUE: "continue" });

const CYCLE_FLOOR = 3; // evaluated from cycle 3 onward — two full adversarial passes

/**
 * Should the QA loop take the diminishing-returns exit?
 *
 * @param {object} input
 * @param {number} input.cycle             the cycle that just produced a gate (1-based)
 * @param {number[]} input.highCounts      HIGH_N per cycle, index 0 = cycle 1, as
 *   recorded in QA Iteration History by the Convergence check. NOT recomputed here
 *   — see property 2.
 * @param {string|null} input.latestGateContent  full text of this cycle's gate
 * @param {string[]} input.testArtifactGlobs     resolved `qa.testArtifactGlobs`;
 *   default `[]`, which matches nothing and therefore never exits
 * @returns {{verdict: string, reason: string, detail: string,
 *            findings: Array<{file: string|null, matched: boolean}>}}
 */
function classifyDiminishingReturns(input) {
  let cycle;
  let highCounts;
  let latestGateContent;
  let testArtifactGlobs;
  try {
    cycle = input && input.cycle;
    highCounts = input && input.highCounts;
    latestGateContent = input && input.latestGateContent;
    testArtifactGlobs = input && input.testArtifactGlobs;
  } catch {
    return no("input-unreadable", "the inputs could not be read");
  }

  if (!Number.isInteger(cycle) || cycle < CYCLE_FLOOR) {
    return no(
      "below-cycle-floor",
      `cycle ${describe(cycle)} is below the cycle-${CYCLE_FLOOR} floor — the rule needs two full adversarial passes behind it`,
    );
  }

  // Condition 1 — two consecutive gates with no blocker.
  if (!Array.isArray(highCounts) || highCounts.length < cycle) {
    return no(
      "high-counts-missing",
      "the HIGH sequence from QA Iteration History is absent or shorter than the cycle count, so condition 1 cannot be established",
    );
  }
  const hN = highCounts[cycle - 1];
  const hPrev = highCounts[cycle - 2];
  if (!Number.isInteger(hN) || !Number.isInteger(hPrev)) {
    return no(
      "high-counts-missing",
      "the HIGH sequence carries a non-integer reading, so condition 1 cannot be established",
    );
  }
  if (hN !== 0 || hPrev !== 0) {
    return no(
      "high-findings-remain",
      `HIGH is ${hPrev} then ${hN} — condition 1 needs two consecutive zero-HIGH gates. A run whose HIGH count is non-zero and flat is the Convergence check's, not this one's`,
    );
  }

  // Conditions 2 and 3 both read the latest gate.
  const issues = readTopIssues(latestGateContent);
  if (issues === null) {
    return no(
      "gate-unreadable",
      "no gate content was supplied, so conditions 2 and 3 could not be evaluated",
    );
  }
  if (issues.length === 0) {
    // Property 3. Not an exit — a clean gate leaves through 5c on the PASS path.
    return no(
      "no-residue",
      "the gate raises no findings at all; there is no residue to classify, and a clean gate exits through 5c on the ordinary path",
    );
  }

  // Condition 3 first, because it is the one that can be true of a finding that
  // also satisfies condition 2 — a product defect filed against a test file is
  // exactly the case this ordering surfaces.
  const nfr = readNfrStatuses(latestGateContent) || [];
  const failingNfr = nfr.filter((s) => s !== "pass");
  if (failingNfr.length > 0) {
    return no(
      "product-defect-signal",
      `nfr_validation reports ${failingNfr.join(", ")} — product behaviour is implicated, so condition 3 fails`,
      issues.map((e) => ({
        file: e.file,
        matched: matchesAnyGlob(e.file, testArtifactGlobs),
      })),
    );
  }
  for (const e of issues) {
    if (e.category === "bug" && !matchesAnyGlob(e.file, testArtifactGlobs)) {
      return no(
        "product-defect-signal",
        `a finding is declared \`category: bug\` against ${e.file === null ? "no file" : e.file}, which is not machinery — condition 3 fails`,
        issues.map((x) => ({
          file: x.file,
          matched: matchesAnyGlob(x.file, testArtifactGlobs),
        })),
      );
    }
  }

  // Condition 2 — EVERY entry names a file, and every one of them is machinery.
  const findings = issues.map((e) => ({
    file: e.file,
    matched: matchesAnyGlob(e.file, testArtifactGlobs),
  }));
  const unfiled = findings.filter((f) => f.file === null);
  if (unfiled.length > 0) {
    return no(
      "finding-without-file",
      `${unfiled.length} of ${findings.length} findings carry no \`file:\` — condition 2 is opt-in on positive evidence, so a finding that names nothing fails it`,
      findings,
    );
  }
  const offGlob = findings.filter((f) => !f.matched);
  if (offGlob.length > 0) {
    return no(
      "non-test-finding",
      `${offGlob.length} of ${findings.length} findings sit outside \`qa.testArtifactGlobs\` (${offGlob.map((f) => f.file).join(", ")}) — the residue is not entirely machinery`,
      findings,
    );
  }

  return {
    verdict: VERDICTS.EXIT,
    reason: "diminishing-returns",
    detail: `HIGH is 0 for cycles ${cycle - 1} and ${cycle}, and all ${findings.length} remaining findings are in test machinery — the loop has finished working rather than stopped working`,
    findings,
  };
}

function no(reason, detail, findings) {
  return {
    verdict: VERDICTS.CONTINUE,
    reason,
    detail,
    findings: findings || [],
  };
}

function describe(v) {
  return v === undefined || v === null ? "(absent)" : String(v);
}

/**
 * One line for the QA Iteration History entry and the implementation report.
 *
 * A reader six months later must be able to tell this exit from a stall, and
 * that is the entire reason it is a function rather than a sentence assembled at
 * the call site: a message written inline can only be tested by grepping the
 * prose that describes it.
 */
function describeDiminishingReturns(result) {
  if (!result || typeof result !== "object") {
    return "diminishing-returns exit: no verdict was produced";
  }
  if (result.verdict === VERDICTS.EXIT) {
    return `Diminishing-returns exit taken — ${result.detail}. This is a CLEAN exit, not a stall: nothing was blocked and nothing is being accepted over. The residue is recorded in the gate's \`recommendations.future\`.`;
  }
  return `Diminishing-returns exit not taken (${result.reason}) — ${result.detail}.`;
}

// ── the loop's route classifier (task.123) ─────────────────────────────────

const ROUTES = Object.freeze({
  DIMINISHING_RETURNS: "diminishing-returns", // route 2  — obs #100's sibling, pre-existing
  COSMETIC_RESIDUE: "cosmetic-residue", //       route 2b — obs #100
  GATE_THE_LAST_FIX: "gate-the-last-fix", //     route 2c — obs #112
  CONTINUE: "continue", //                       5b, or the escalation as written
});

// The 5b Action row 5a writes on the road to a fix cycle. Route 2c reads the LAST
// budgeted cycle's row to establish that a fix exists on the head which no gate
// has read; a cycle that reached 5c has its gate already, and a fix driven by
// 5c's REQUEST CHANGES is outside the gate sequence the route reasons over.
const RUNNING_QA_FIX_RE = /^Running qa-fix\b/;

/**
 * The gate's verdict token — `PASS`, `CONCERNS`, `FAIL`, `WAIVED` — read from the
 * top-level `gate:` key, upper-cased. `null` when the input is not a string or the
 * key is absent; a malformed gate is the caller's HALT, never a route.
 */
function readGateToken(gateContent) {
  if (typeof gateContent !== "string") return null;
  for (const line of splitLines(gateContent)) {
    const m = /^gate[ \t]*:[ \t]*(.*)$/.exec(line);
    if (m) {
      const v = scalarValue(m[1]);
      return v === "" ? null : v.toUpperCase();
    }
  }
  return null;
}

/**
 * How many `top_issues[]` entries the gate RAISED at MEDIUM and at LOW — the same
 * "count what was raised, do not exclude `status: closed`" rule the Convergence
 * check's awk applies to HIGH. `null` when the input is not a string.
 *
 * MEDIUM_N comes from here and nowhere else. HIGH is deliberately NOT counted:
 * property 2 makes the HIGH count an input, and group 7 of the test suite reads
 * this file's source to make sure no second implementation of it appears. The
 * orchestrator records the awk's HIGH and this function's MEDIUM on separate rows
 * of the cycle entry, and `classifyLoopRoute` takes both sequences as input.
 */
function countRaised(gateContent) {
  const issues = readTopIssues(gateContent);
  if (issues === null) return null;
  const out = { medium: 0, low: 0 };
  for (const e of issues) {
    if (e.severity === "medium") out.medium += 1;
    else if (e.severity === "low") out.low += 1;
  }
  return out;
}

function isOpen(entry) {
  return entry.status === null || entry.status === "open";
}

function allInts(arr, n) {
  if (!Array.isArray(arr) || arr.length < n) return false;
  for (let i = 0; i < n; i++) if (!Number.isInteger(arr[i])) return false;
  return true;
}

function route(routeName, reason, detail, extra) {
  return Object.assign(
    { route: routeName, reason, detail, findings: [] },
    extra || {},
  );
}

/**
 * Which route does the QA loop take from here?
 *
 * Two moments call this, and `budgetSpent` says which:
 *
 *   budgetSpent: false — after 5a has read cycle N's gate and the Convergence
 *     check did not trip. Evaluates route 2 (Diminishing-returns) and then route
 *     2b (cosmetic residue); `continue` means 5b.
 *   budgetSpent: true  — at the loop-limit trigger, after 5b of the LAST budgeted
 *     cycle and BEFORE the escalation entry is written. Evaluates route 2c only;
 *     `continue` means the escalation as written.
 *
 * @param {object} input
 * @param {number}   input.cycle              the cycle whose gate was last read (1-based)
 * @param {number[]} input.highCounts         HIGH_N per cycle from QA Iteration History (index 0 = cycle 1)
 * @param {number[]} [input.mediumCounts]     MEDIUM_N per cycle from QA Iteration History, same shape;
 *   cycle N's own reading is taken from `latestGateContent` via `countRaised`, so the array
 *   needs only cycles 1..N-1 (a longer array is fine; index N-1 is ignored)
 * @param {string|null} input.latestGateContent  full text of the latest gate
 * @param {string[]} [input.testArtifactGlobs]   resolved `qa.testArtifactGlobs`, default `[]`
 * @param {boolean}  [input.budgetSpent]      true at the loop-limit trigger (N == QA_MAX_CYCLES)
 * @param {string|null} [input.lastCycleAction]  the `**Action**` row of cycle N's entry; route 2c
 *   requires it to read `Running qa-fix …`
 * @returns {{route: string, reason: string, detail: string, findings: Array,
 *            verdict?: string, lowIds?: string[], mediumSequence?: number[]}}
 */
function classifyLoopRoute(input) {
  let cycle;
  let highCounts;
  let mediumCounts;
  let latestGateContent;
  let testArtifactGlobs;
  let budgetSpent;
  let lastCycleAction;
  try {
    cycle = input && input.cycle;
    highCounts = input && input.highCounts;
    mediumCounts = (input && input.mediumCounts) || [];
    latestGateContent = input && input.latestGateContent;
    testArtifactGlobs = (input && input.testArtifactGlobs) || [];
    budgetSpent = Boolean(input && input.budgetSpent);
    lastCycleAction = input && input.lastCycleAction;
  } catch {
    return route(
      ROUTES.CONTINUE,
      "input-unreadable",
      "the inputs could not be read",
    );
  }

  if (!Number.isInteger(cycle) || cycle < 1) {
    return route(
      ROUTES.CONTINUE,
      "cycle-missing",
      `cycle ${describe(cycle)} is not a positive integer`,
    );
  }

  if (budgetSpent) {
    // ── route 2c — gate the last fix (obs #112) ──────────────────────────────
    if (
      typeof lastCycleAction !== "string" ||
      !RUNNING_QA_FIX_RE.test(lastCycleAction.trim())
    ) {
      return route(
        ROUTES.CONTINUE,
        "last-cycle-not-a-fix",
        `cycle ${cycle}'s Action row reads ${describe(lastCycleAction)} — route 2c gates a fix that no gate has read, and only a cycle that routed to 5b from 5a has one; a cycle that reached 5c has its gate, and a fix driven by 5c's REQUEST CHANGES is outside the gate sequence this route reasons over`,
      );
    }
    if (cycle < 3) {
      return route(
        ROUTES.CONTINUE,
        "below-cycle-floor",
        `cycle ${cycle} — three MEDIUM readings are needed to see a strictly falling sequence`,
      );
    }
    if (!allInts(highCounts, cycle)) {
      return route(
        ROUTES.CONTINUE,
        "high-counts-missing",
        "the HIGH sequence from QA Iteration History is absent, shorter than the cycle count, or carries a non-integer reading",
      );
    }
    const nonZero = highCounts.slice(0, cycle).filter((h) => h !== 0);
    if (nonZero.length > 0) {
      return route(
        ROUTES.CONTINUE,
        "high-findings-seen",
        `HIGH was not 0 throughout (${highCounts.slice(0, cycle).join(", ")}) — a loop that raised a blocker at any cycle escalates with its evidence, it is not granted a half-cycle`,
      );
    }
    const raised = countRaised(latestGateContent);
    if (raised === null) {
      return route(
        ROUTES.CONTINUE,
        "gate-unreadable",
        "no gate content was supplied, so MEDIUM_N could not be counted",
      );
    }
    if (!allInts(mediumCounts, cycle - 1)) {
      return route(
        ROUTES.CONTINUE,
        "medium-counts-missing",
        `the MEDIUM sequence from QA Iteration History needs cycles 1..${cycle - 1} and does not have them`,
      );
    }
    const mN = raised.medium;
    const m1 = mediumCounts[cycle - 2];
    const m2 = mediumCounts[cycle - 3];
    const seq = [m2, m1, mN];
    if (!(mN < m1 && m1 < m2)) {
      return route(
        ROUTES.CONTINUE,
        "medium-not-falling",
        `MEDIUM reads ${seq.join(", ")} over cycles ${cycle - 2}–${cycle} — route 2c needs it strictly falling, which is the evidence that one more gate would clear`,
        { mediumSequence: seq },
      );
    }
    return route(
      ROUTES.GATE_THE_LAST_FIX,
      "gate-the-last-fix",
      `the ${cycle}-cycle budget is spent with HIGH 0 throughout and MEDIUM falling ${seq.join(" → ")}; cycle ${cycle}'s fix has landed and no gate has read it, so one ordinary 5a (review + gate, no 5b) runs on that head before any escalation entry is written`,
      { mediumSequence: seq },
    );
  }

  // ── route 2 — the Diminishing-returns exit, unchanged ────────────────────
  const dr = classifyDiminishingReturns({
    cycle,
    highCounts,
    latestGateContent,
    testArtifactGlobs,
  });
  if (dr.verdict === VERDICTS.EXIT) {
    return route(ROUTES.DIMINISHING_RETURNS, dr.reason, dr.detail, {
      verdict: dr.verdict,
      findings: dr.findings,
    });
  }

  // ── route 2b — cosmetic residue (obs #100) ───────────────────────────────
  // PASS only, stated as an exclusion: a CONCERNS token is a reservation 5c must
  // see raised, not carried, so a CONCERNS gate whose queue is all LOW still
  // goes to 5b.
  const token = readGateToken(latestGateContent);
  if (token !== "PASS") {
    return route(
      ROUTES.CONTINUE,
      "not-a-pass-gate",
      `the gate reads ${describe(token)} — route 2b is PASS-only; a CONCERNS token is a reservation 5c must see raised, not carried (and route 2 declined: ${dr.reason})`,
      { verdict: dr.verdict },
    );
  }
  if (cycle < 2 || !allInts(highCounts, cycle)) {
    return route(
      ROUTES.CONTINUE,
      "high-counts-missing",
      `route 2b needs HIGH readings for cycles ${Math.max(cycle - 1, 1)} and ${cycle}, and the sequence does not carry both`,
      { verdict: dr.verdict },
    );
  }
  if (highCounts[cycle - 1] !== 0 || highCounts[cycle - 2] !== 0) {
    return route(
      ROUTES.CONTINUE,
      "high-findings-remain",
      `HIGH is ${highCounts[cycle - 2]} then ${highCounts[cycle - 1]} — route 2b needs two consecutive zero-HIGH gates`,
      { verdict: dr.verdict },
    );
  }
  const issues = readTopIssues(latestGateContent);
  const open = issues.filter(isOpen);
  if (open.length === 0) {
    // A PASS with no open entry is route 1's, and it never reaches this
    // classifier — but the arm is stated so the rule cannot fire on absence.
    return route(
      ROUTES.CONTINUE,
      "no-open-residue",
      "the gate has no open entry — that is route 1's clean gate, not a cosmetic residue",
      { verdict: dr.verdict },
    );
  }
  const notLow = open.filter((e) => e.severity !== "low");
  if (notLow.length > 0) {
    return route(
      ROUTES.CONTINUE,
      "residue-not-all-low",
      `${notLow.length} of ${open.length} open findings are not LOW (${notLow.map((e) => (e.severity === null ? "unset" : e.severity)).join(", ")}) — the residue is not cosmetic`,
      { verdict: dr.verdict },
    );
  }
  const lowIds = open
    .map((e) => e.id)
    .filter((id) => typeof id === "string" && id !== "");
  return route(
    ROUTES.COSMETIC_RESIDUE,
    "cosmetic-residue",
    `PASS gate at cycle ${cycle} with HIGH 0 for cycles ${cycle - 1} and ${cycle}; all ${open.length} open findings are LOW and are carried to the gate's recommendations.future by id`,
    {
      verdict: dr.verdict,
      lowIds,
      findings: open.map((e) => ({
        file: e.file,
        matched: matchesAnyGlob(e.file, testArtifactGlobs),
      })),
    },
  );
}

/**
 * One line per route for the cycle entry's `**Loop exit**` row. The
 * Diminishing-returns text is delegated verbatim so the pins on that message hold.
 */
function describeLoopRoute(result) {
  if (!result || typeof result !== "object") {
    return "loop route: no verdict was produced";
  }
  switch (result.route) {
    case ROUTES.DIMINISHING_RETURNS:
      return describeDiminishingReturns({
        verdict: VERDICTS.EXIT,
        reason: result.reason,
        detail: result.detail,
        findings: result.findings,
      });
    case ROUTES.COSMETIC_RESIDUE:
      return `Cosmetic-residue exit taken — ${result.detail}${
        Array.isArray(result.lowIds) && result.lowIds.length > 0
          ? ` (${result.lowIds.join(", ")})`
          : ""
      }. This is a CLEAN exit, not a stall: nothing is blocked and nothing is being accepted over; a full qa-fix cycle for cosmetic findings is what this route exists to avoid.`;
    case ROUTES.GATE_THE_LAST_FIX:
      return `Gate-the-last-fix half-cycle granted — ${result.detail}. This is NOT an exit and NOT an escalation: it is one review + gate on the last fix's head, and its gate decides between 5c and the escalation.`;
    default:
      return `Loop route: continue (${result.reason}) — ${result.detail}.`;
  }
}

module.exports = {
  // read
  readTopIssues,
  readNfrStatuses,
  readGateToken,
  countRaised,
  matchesAnyGlob,
  // classify
  classifyDiminishingReturns,
  classifyLoopRoute,
  VERDICTS,
  ROUTES,
  CYCLE_FLOOR,
  // report
  describeDiminishingReturns,
  describeLoopRoute,
};
