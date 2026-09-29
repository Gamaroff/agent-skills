/**
 * A control that answers with a RESULT OBJECT rather than throwing or returning
 * false — the `{ ok, problems }` shape report-lint.js#lintReport uses (task.131).
 * Same predicate as engaging-control.mjs, so against the shared CASES it must
 * score `engages`: every hostile answer is `{ ok: false }`, every legitimate
 * answer `{ ok: true }`.
 */
export function validateHost(input) {
  const ok =
    typeof input === "string" &&
    input !== "" &&
    /^[a-z0-9.-]+(:[0-9]+)?$/i.test(input) &&
    !input.includes("..");
  return { ok, problems: ok ? [] : ["refused"] };
}

/**
 * The same predicate with `ok` INHERITED rather than own. The runner reads an
 * own `ok === false` only, so this answer means nothing and every call scores
 * `accepted` — the rule is narrow on purpose.
 */
export function inheritedOk(input) {
  const verdict = validateHost(input);
  return Object.create({ ok: verdict.ok });
}
