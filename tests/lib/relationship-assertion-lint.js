"use strict";
/**
 * Relationship-assertion lint — flags assertions that CLAIM a relationship
 * while only testing co-occurrence.
 *
 * Motivation (task 89, from task 77's retrospective): six times across eleven
 * gates, an assertion said "X routes to Y" / "X fires at Y" / "X owns Y" and
 * tested only that both names occur in the same slice of prose. Every one
 * passed against the mutation it was written to catch, and TWO of the six were
 * written inside the commit that closed the previous one. The natural fix —
 * widen the regex — is the defect.
 *
 * This analyser is deliberately STRUCTURAL, not textual. It would be absurd for
 * a lint against co-occurrence matching to be implemented as a co-occurrence
 * match, so it does not grep lines: it scans the source with a small state
 * machine that understands strings, template literals, regex literals and
 * comments, extracts each assertion call's arguments at the top level, and
 * reasons about the PATTERN argument and the MESSAGE argument separately.
 *
 * Scope is deliberately narrow — see tests/mutation-call-site-coverage.test.js:
 * "a guard that cries wolf gets disabled". Every rule below requires a
 * conjunction (a shape AND a claim), because either half alone fires on
 * hundreds of perfectly good assertions.
 *
 * Pure: `analyze(source, filename)` reads nothing and writes nothing.
 */

/**
 * Verbs that assert a MAPPING rather than a presence. A message using one of
 * these is claiming "this specific thing goes to that specific place" — which
 * a substring or co-occurrence pattern cannot establish.
 *
 * Kept tight on purpose. "must contain", "must exist", "must name" are NOT here:
 * those claims are honestly satisfied by a containment check.
 */
// `owns` carries the s deliberately: bare `own` is the possessive adjective —
// "keeps its own provenance header" claims no mapping at all, and matching it
// cost a false finding on the first measurement.
const RELATIONSHIP_VERBS =
  /\b(routes?|routing|route back|fires? at|fires? in|owns|owned by|sits? inside|sit inside|points? at|maps? to|mapping|resumes? at|resume action|must route|must exit|must return to|belongs? to|handled by|directional)\b/i;

/** Containment language — what Rules B and C look for in a message. */
const CONTAINMENT_WORDS = /\b(inside|within|contained|contains)\b/i;

/**
 * A message makes a PLACEMENT-OR-MAPPING claim when it says where something
 * goes, not merely that it exists. This conjunction is what keeps every rule
 * below quiet on the hundreds of honest presence checks in this repository:
 * the shape alone is not a defect, the shape *under this claim* is.
 */
function claimsPlacement(message) {
  return RELATIONSHIP_VERBS.test(message) || CONTAINMENT_WORDS.test(message);
}

/**
 * Wildcard gap constructs. Two identifiers joined by one of these are only
 * asserted to CO-OCCUR, in order — not to stand in any relation.
 */
const GAP = /(\.\*|\[\^[^\]]*\]\*|\[\\s\\S\]\*|\.\+|\[\^[^\]]*\]\+)/;

const ASSERTION_CALLS = [
  { name: "assert.match", patternArg: 1, kind: "match" },
  { name: "assert.doesNotMatch", patternArg: 1, kind: "doesNotMatch" },
  { name: "assert.ok", patternArg: 0, kind: "ok" },
];

// ── Source scanning ──────────────────────────────────────────────────────────

/**
 * Classify every character of `src` as code (true) or not-code (false).
 * Not-code = inside a string, template literal, regex literal or comment.
 *
 * This is what makes the analyser structural. Without it, an assertion quoted
 * inside a comment or a fixture string would be indistinguishable from a real
 * call site — and this repository's test files quote assertions in comments
 * constantly, precisely because they document the versions they replaced.
 */
function codeMask(src) {
  const mask = new Uint8Array(src.length); // 1 = code
  let i = 0;
  // Last significant code character, used to decide whether `/` opens a regex.
  let prev = "";
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (c === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i++;
      while (i < src.length) {
        if (src[i] === "\\") {
          i += 2;
          continue;
        }
        if (src[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      prev = quote;
      continue;
    }
    if (c === "/" && regexCanStartAfter(prev)) {
      i++;
      let inClass = false;
      while (i < src.length) {
        if (src[i] === "\\") {
          i += 2;
          continue;
        }
        if (src[i] === "[") inClass = true;
        else if (src[i] === "]") inClass = false;
        else if (src[i] === "/" && !inClass) {
          i++;
          break;
        } else if (src[i] === "\n") break; // unterminated — bail, treat as code
        i++;
      }
      while (i < src.length && /[dgimsuvy]/.test(src[i])) i++;
      prev = "/";
      continue;
    }

    mask[i] = 1;
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return mask;
}

/**
 * A `/` opens a regex literal only where a value may begin. After an
 * identifier, a closing paren/bracket or a numeral it is division instead.
 */
function regexCanStartAfter(prev) {
  if (prev === "") return true;
  return "(,=:[!&|?{};+-*%~^".includes(prev);
}

/**
 * Extract the top-level, comma-separated argument source slices of the call
 * whose `(` sits at `open`. Returns null when the call is unterminated.
 */
function splitArgs(src, mask, open) {
  const args = [];
  let depth = 0;
  let start = open + 1;
  for (let i = open; i < src.length; i++) {
    if (!mask[i]) continue; // inside a string / regex / comment — never a delimiter
    const c = src[i];
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") {
      depth--;
      if (depth === 0) {
        args.push(src.slice(start, i));
        return { args, end: i };
      }
    } else if (c === "," && depth === 1) {
      args.push(src.slice(start, i));
      start = i + 1;
    }
  }
  return null;
}

function lineOf(src, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (src[i] === "\n") line++;
  return line;
}

// ── Argument classification ──────────────────────────────────────────────────

/** The source of a regex literal argument, or null. */
function asRegexLiteral(arg) {
  const t = arg.trim();
  if (!t.startsWith("/")) return null;
  const m = /^\/((?:\\.|\[(?:\\.|[^\]])*\]|[^/\\])*)\/[dgimsuvy]*$/.exec(t);
  return m ? m[1] : null;
}

/** The literal text of a `.includes("…")` / `.includes('…')` argument, or null. */
function asIncludesLiteral(arg) {
  const m = /\.includes\(\s*(["'])((?:\\.|(?!\1)[^\\])*)\1\s*\)/.exec(arg);
  return m ? m[2] : null;
}

/**
 * Concatenate the string literals in a message argument. Messages in this
 * repository are routinely built as `"…" + "…"` across several lines, so a
 * single-literal reader would miss the verb in most of them.
 */
function messageText(arg) {
  if (!arg) return "";
  const out = [];
  const re = /(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g;
  let m;
  while ((m = re.exec(arg)) !== null) out.push(m[2]);
  return out.join(" ");
}

/** True when the regex body is a plain literal — no unescaped metacharacters. */
function isPlainLiteral(body) {
  return !/(^|[^\\])[*+?[\]{}()|^$]/.test(body) && !body.includes("\\");
}

/**
 * Identifier runs of length >= 2 in a regex body.
 *
 * Character-class contents are removed FIRST. `[^|\n]*` is a gap construct, not
 * content, and leaving it in both invents runs that are not identifiers and
 * splits ones that are. Runs may begin with a digit — the destination in the
 * defect this lint was built from is literally `5b`, and requiring a leading
 * letter made instance 3 invisible to rule A.
 */
function identifierRuns(body) {
  const flattened = body
    .replace(/\[(?:\\.|[^\]])*\]/g, " ")
    .replace(/\\(.)/g, "$1");
  return (flattened.match(/[A-Za-z0-9][A-Za-z0-9_ .-]{1,}/g) || [])
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && /[A-Za-z]/.test(s));
}

/** A kebab/snake or `--flag` token — the shape a suffix rename silently satisfies. */
function isRenameableToken(tok) {
  return /^--[\w-]+$/.test(tok) || /^\w+(?:[-_]\w+){1,}$/.test(tok);
}

// ── Rules ────────────────────────────────────────────────────────────────────

/**
 * Rule A — a relationship verb in the message, a co-occurrence or substring
 * test in the pattern. This is instances 1, 2 and 3.
 */
function ruleA(call) {
  // A negative claim is not a mapping claim — and `assert.ok(!x.includes(y))`
  // is a negative claim written without the helper.
  if (call.kind === "doesNotMatch" || call.negated) return null;
  if (!RELATIONSHIP_VERBS.test(call.message)) return null;

  const body = asRegexLiteral(call.pattern);
  if (body !== null) {
    if (body.startsWith("^")) return null; // anchored — pins a position, not a co-occurrence
    const runs = identifierRuns(body);
    if (runs.length >= 2 && GAP.test(body)) {
      return {
        rule: "A",
        detail:
          `pattern joins ${runs.length} identifiers (${runs
            .slice(0, 3)
            .map((r) => JSON.stringify(r))
            .join(", ")}) with a wildcard gap, ` +
          `but the message claims a relationship`,
      };
    }
    return null;
  }

  const lit = asIncludesLiteral(call.pattern);
  if (lit !== null || /\.includes\(/.test(call.pattern)) {
    return {
      rule: "A",
      detail:
        "a substring test backs a message that claims a relationship — " +
        "presence anywhere in the haystack satisfies it",
    };
  }
  return null;
}

/**
 * Rule B — an unbounded literal ending on a renameable token. `--stage
 * ready-for-merge` is a PREFIX of `--stage ready-for-merge-RELOCATED`, so a
 * renamed call satisfies the assertion. This is instance 6, which appeared
 * inside the fix for instance 5.
 *
 * Positive assertions only: for `doesNotMatch` — and for `assert.ok(!x…)`,
 * which is the same claim written differently — matching a prefix is STRICTER,
 * so the same shape is not a defect there.
 *
 * NARROWED after the Phase 3 measurement. The first version required only the
 * unbounded token and reported 52 findings on a clean suite, almost all of them
 * ordinary presence checks like `/current_step/` and `/--dry-run/`. A guard at
 * that rate gets disabled, which is worse than no guard. It now requires the
 * message to claim placement or a mapping, exactly as rule A does: an
 * unbounded token under "must sit inside 5c" is instance 6; the same token
 * under "the hook must read current_step" is an honest presence check.
 */
function ruleB(call) {
  if (call.kind === "doesNotMatch" || call.negated) return null;
  if (!claimsPlacement(call.message)) return null;

  let literal = null;
  const body = asRegexLiteral(call.pattern);
  if (body !== null) {
    if (/\(\?[!=<]/.test(body) || body.endsWith("$") || body.endsWith("\\b"))
      return null; // bounded
    if (!isPlainLiteral(body)) return null;
    literal = body;
  } else {
    literal = asIncludesLiteral(call.pattern);
  }
  if (literal === null) return null;

  const last = literal.trim().split(/\s+/).pop() || "";
  if (!isRenameableToken(last)) return null;

  return {
    rule: "B",
    detail:
      `the pattern ends on the renameable token ${JSON.stringify(last)} with no ` +
      `boundary, so any longer name beginning with it also satisfies the match`,
  };
}

/**
 * Rule C — an ORDERING comparison sold as containment. `indexOf(a) >
 * indexOf(b)` is satisfied by every byte after `b` begins, including bytes in
 * a later section entirely. This is instance 5.
 */
function ruleC(call, indexOfNames) {
  if (call.kind !== "ok") return null;
  if (!CONTAINMENT_WORDS.test(call.message)) return null;
  const m = /^\s*([A-Za-z_$][\w$]*)\s*[<>]\s*([A-Za-z_$][\w$]*)\s*$/.exec(
    call.pattern,
  );
  if (!m) return null;
  if (!indexOfNames.has(m[1]) || !indexOfNames.has(m[2])) return null;
  return {
    rule: "C",
    detail:
      `\`${m[1]}\` and \`${m[2]}\` are both indexOf results, so this asserts ORDER ` +
      `while the message claims containment — every position after the second ` +
      `marker satisfies it, including one in a later section`,
  };
}

/**
 * Rule D — under-enumeration. A non-vacuity guard says the parse yields at
 * least N rows; the enumeration that follows names M < N of them. The rows
 * that fall through get only the generic well-formedness check, so their
 * mapping is unasserted while the surrounding comment claims otherwise. This
 * is instance 4, which is an omission rather than a pattern shape and is
 * reachable by no rule above.
 */
function ruleD(src, mask) {
  const findings = [];
  const guard = /assert\.ok\(\s*([A-Za-z_$][\w$]*)\.length\s*>=?\s*(\d+)\s*,/g;
  let g;
  while ((g = guard.exec(src)) !== null) {
    if (!mask[g.index]) continue;
    const rowsVar = g[1];
    const threshold = Number(g[2]);
    // The enumeration that follows, over an inline array literal.
    // 4000 chars keeps the guard and its enumeration in the same test block;
    // a wider window pairs a guard with an unrelated later loop, which is how
    // the first version reported two string-length checks as under-enumeration.
    const after = src.slice(g.index, g.index + 4000);
    const loop = /for\s*\(\s*const\s+[A-Za-z_$][\w$]*\s+of\s*\[/.exec(after);
    if (!loop) continue;
    const open = g.index + loop.index + loop[0].length - 1;
    const arr = splitArgs(src, mask, open);
    if (!arr) continue;
    const items = arr.args.map((a) => a.trim()).filter((a) => a.length > 0);
    // Only meaningful when the guarded variable is actually a COLLECTION of
    // rows that the loop keys back into. `content.length > 200` on a string is
    // a size check, not a row count, and pairing it with the next unrelated
    // `for (… of […])` produced two false findings on the first measurement.
    const bodyStart = arr.end;
    const body = src.slice(bodyStart, bodyStart + 2000);
    const keysIntoRows = new RegExp(
      `\\b${rowsVar}\\s*\\.\\s*(find|filter|some|every|includes|indexOf)\\s*\\(`,
    ).test(body);
    if (!keysIntoRows) continue;
    if (items.length >= threshold) continue;
    findings.push({
      rule: "D",
      line: lineOf(src, g.index),
      detail:
        `the non-vacuity guard requires ${rowsVar}.length >= ${threshold}, but only ` +
        `${items.length} value${items.length === 1 ? " is" : "s are"} enumerated — ` +
        `the remaining row${threshold - items.length === 1 ? "" : "s"} get only the ` +
        `generic well-formedness check, so ${threshold - items.length === 1 ? "its" : "their"} ` +
        `mapping is unasserted`,
      snippet: `assert.ok(${rowsVar}.length >= ${threshold}, …) + for (… of [${items.length} values])`,
    });
  }
  return findings;
}

const REPLACEMENT = {
  A:
    "Parse the structure and key on the cell that carries the relationship: " +
    "split the table into rows, key on the first cell, and read the destination " +
    "off THAT row's own action cell. A value named anywhere else — including " +
    "inside another row's prose — must not satisfy the assertion.",
  B:
    "Bound the token: add a negative lookahead `(?![-\\w])`, a `\\b`, or anchor " +
    "the match. Otherwise a rename that appends a suffix keeps the test green.",
  C:
    "Ask the containment question directly: slice the section and assert the " +
    "marker is IN it (`section().includes(marker)`), rather than comparing two " +
    "indexOf results.",
  D:
    "Enumerate every value the non-vacuity guard promises, and assert each one's " +
    "own destination. A generic non-empty check on the remainder is not a mapping.",
};

/**
 * Analyse one source file.
 * @returns {Array<{rule,line,detail,snippet,replacement,file}>}
 */
function analyze(source, filename = "<source>") {
  const mask = codeMask(source);
  const findings = [];

  // Local `const NAME = <expr>.indexOf(` bindings, for Rule C.
  const indexOfNames = new Set();
  const bind =
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[^;\n]*\.indexOf\(/g;
  let b;
  while ((b = bind.exec(source)) !== null) {
    if (mask[b.index]) indexOfNames.add(b[1]);
  }

  for (const spec of ASSERTION_CALLS) {
    let from = 0;
    for (;;) {
      const at = source.indexOf(spec.name + "(", from);
      if (at === -1) break;
      from = at + spec.name.length;
      if (!mask[at]) continue;
      const open = at + spec.name.length;
      const parsed = splitArgs(source, mask, open);
      if (!parsed) continue;

      const pattern = parsed.args[spec.patternArg] || "";
      const call = {
        kind: spec.kind,
        pattern,
        // `assert.ok(!x.includes(y), …)` asserts ABSENCE. A prefix match makes
        // an absence claim stricter, not weaker, so the rules below must not
        // read it as the positive form.
        negated: /^\s*!/.test(pattern),
        message: messageText(parsed.args[spec.patternArg + 1]),
        line: lineOf(source, at),
      };
      if (!call.message) continue; // an unmessaged assertion claims nothing

      for (const rule of [ruleA, ruleB]) {
        const hit = rule(call);
        if (hit) {
          findings.push({
            ...hit,
            line: call.line,
            snippet: call.pattern.trim(),
          });
          break; // one finding per call site — the first rule that fires owns it
        }
      }
      const c = ruleC(call, indexOfNames);
      if (c)
        findings.push({ ...c, line: call.line, snippet: call.pattern.trim() });
    }
  }

  findings.push(...ruleD(source, mask));

  return findings
    .map((f) => ({ ...f, file: filename, replacement: REPLACEMENT[f.rule] }))
    .sort((a, b) => a.line - b.line || a.rule.localeCompare(b.rule));
}

module.exports = { analyze, RELATIONSHIP_VERBS, REPLACEMENT };
