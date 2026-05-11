"use strict";
/**
 * Structural assertions for full-flow scenarios.
 *
 * Never assert prose equality on LLM output. Instead, assert structure:
 *   - sections exist
 *   - frontmatter keys/values are present
 *   - source citations appear
 *   - tracker payload shape matches
 *   - answer queue was fully drained (no skipped prompts)
 *
 * Each assertion returns { ok: bool, reason: string } so the runner can
 * aggregate failures without throwing.
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharedLib = require("../../shared/resources/create-skills-lib.js");

export function fileExists(p) {
  return { ok: fs.existsSync(p), reason: fs.existsSync(p) ? "" : `missing file: ${p}` };
}

export function fileAbsent(p) {
  const exists = fs.existsSync(p);
  return { ok: !exists, reason: exists ? `file should not exist: ${p}` : "" };
}

export function fileMatches(p, re) {
  if (!fs.existsSync(p)) return { ok: false, reason: `missing file: ${p}` };
  const content = fs.readFileSync(p, "utf-8");
  const ok = re.test(content);
  return { ok, reason: ok ? "" : `${p} does not match ${re}` };
}

export function frontmatterHas(p, expectedKeys) {
  if (!fs.existsSync(p)) return { ok: false, reason: `missing file: ${p}` };
  const content = fs.readFileSync(p, "utf-8");
  const { frontmatter } = sharedLib.parseFrontmatter(content);
  const missing = expectedKeys.filter(k => !(k in frontmatter));
  return {
    ok: missing.length === 0,
    reason: missing.length === 0 ? "" : `${p} missing frontmatter keys: ${missing.join(", ")}`,
  };
}

export function frontmatterEquals(p, expected) {
  if (!fs.existsSync(p)) return { ok: false, reason: `missing file: ${p}` };
  const content = fs.readFileSync(p, "utf-8");
  const { frontmatter } = sharedLib.parseFrontmatter(content);
  for (const [k, v] of Object.entries(expected)) {
    if (frontmatter[k] !== v) {
      return {
        ok: false,
        reason: `${p} frontmatter[${k}]: expected ${JSON.stringify(v)}, got ${JSON.stringify(frontmatter[k])}`,
      };
    }
  }
  return { ok: true, reason: "" };
}

export function hasAtLeastNSourceCitations(p, n) {
  if (!fs.existsSync(p)) return { ok: false, reason: `missing file: ${p}` };
  const content = fs.readFileSync(p, "utf-8");
  const citations = sharedLib.extractSourceCitations(content);
  return {
    ok: citations.length >= n,
    reason: citations.length >= n
      ? ""
      : `${p}: expected >= ${n} [Source: …] citations, got ${citations.length}`,
  };
}

export function trackerPayloadMatches(payloadPath, expectedShape) {
  if (!fs.existsSync(payloadPath)) {
    return { ok: false, reason: `tracker payload not written: ${payloadPath}` };
  }
  let payload;
  try {
    payload = JSON.parse(fs.readFileSync(payloadPath, "utf-8"));
  } catch (e) {
    return { ok: false, reason: `tracker payload not valid JSON: ${e.message}` };
  }
  for (const [k, expected] of Object.entries(expectedShape)) {
    const actual = getByPath(payload, k);
    const reMatch = typeof expected === "string" && expected.match(/^\/(.+)\/([gimsuy]*)$/);
    if (reMatch) {
      const re = new RegExp(reMatch[1], reMatch[2]);
      if (typeof actual !== "string" || !re.test(actual)) {
        return { ok: false, reason: `payload.${k}: expected match ${expected}, got ${JSON.stringify(actual)}` };
      }
    } else if (actual !== expected) {
      return { ok: false, reason: `payload.${k}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}` };
    }
  }
  return { ok: true, reason: "" };
}

function getByPath(obj, dotted) {
  return dotted.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

export function answerQueueDrained(remainingAnswers) {
  return {
    ok: remainingAnswers.length === 0,
    reason: remainingAnswers.length === 0
      ? ""
      : `answer queue not drained — ${remainingAnswers.length} unused entries: ${
          remainingAnswers.slice(0, 3).map(a => a.matches).join(", ")
        }${remainingAnswers.length > 3 ? "…" : ""}`,
  };
}

export function aggregate(results) {
  const failures = results.filter(r => !r.ok);
  return {
    ok: failures.length === 0,
    total: results.length,
    passed: results.length - failures.length,
    failed: failures.length,
    failures,
  };
}
