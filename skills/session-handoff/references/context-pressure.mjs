#!/usr/bin/env node
// AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/context-pressure.mjs. Regenerate via `npm run bundle`.
/**
 * context-pressure.mjs — measured context-pressure trigger for session-handoff (task.157).
 *
 * The model cannot see how full its context window is. Claude Code hands that figure only to the
 * status line command, so "hand off when your context is getting full" is a self-assessment, and a
 * self-assessment is least reliable exactly when the context is under load. This engine turns the
 * status line's own measurement into a nudge:
 *
 *   record   (status line, via context-pressure-statusline.sh) — save `used_percentage` per session
 *   check    (UserPromptSubmit hook) — above SOFT / FIRM, inject one note telling the agent to
 *            recommend a session-handoff continuation at the next natural boundary
 *   settings (context-pressure-install.sh) — add or remove the hook and the status-line wrap in a
 *            settings.json, by identity, so the installer's JSON edits live in tested code
 *
 * This file is the only code that reads or writes the state, so its format is defined once:
 *   <state dir>/<session_id>.json = { pct, at, window, band, prompts, emittedAtPrompt }
 *   `record` owns pct/at/window and keeps the rest; `check` owns band/prompts/emittedAtPrompt.
 *
 * The record/check race is accepted, not locked. The status line and the hook can run at the same
 * moment; each write is tmp + rename, so a file is never torn. The worst case is a lost prompt
 * count, a lost percentage until the next refresh, or — when `record`'s read-modify-write straddles
 * a `check` write — a reverted band, which repeats one note on the next prompt. A lock is the wrong fix: a lock that
 * cannot be taken would hang the hook, and the hook runs on every prompt in every repository.
 *
 * Silence is the failure mode, by design. `record` and `check` exit 0 on every input and print
 * nothing unless `check` has a note to give — a broken install costs a missed reminder, never a
 * blocked prompt (exit 2 from a UserPromptSubmit hook blocks the prompt; this file never exits 2
 * from either). A stale, missing or corrupt reading is not guessed around: a wrong number is worse
 * than none (the observe-work-session-start.sh rationale).
 *
 * Env (invalid values fall back to the default; FIRM below SOFT is raised to SOFT):
 *   CONTEXT_PRESSURE_SOFT         60   soft band, percent
 *   CONTEXT_PRESSURE_FIRM         75   firm band, percent
 *   CONTEXT_PRESSURE_MAX_AGE_MIN  15   a reading older than this is ignored
 *   CONTEXT_PRESSURE_REPEAT        5   in the firm band, repeat the note every N prompts
 *   CONTEXT_PRESSURE_STATE_DIR         default ${XDG_STATE_HOME:-~/.local/state}/agent-skills/context-pressure
 *
 * `settings` outcomes, defined once in applySettings and mapped to exit codes in settingsCli:
 *   0 changed       — written to --out
 *   3 unchanged     — already in the requested state; nothing written
 *   4 needs-manual  — something this transform will not touch needs a person (an unparseable wrap,
 *                     a statusLine with no command); --out is written only if something else changed
 *   1 refused (the file is not a JSON object, or its hooks shape cannot be edited), 2 usage.
 *
 * Emits with `process.exitCode = n; return` — never `process.exit()`, which can truncate piped
 * stdout (the select-next.mjs trap).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULTS = Object.freeze({
  soft: 60,
  firm: 75,
  maxAgeMin: 15,
  repeat: 5,
  pruneDays: 7,
});

const RANK = { none: 0, soft: 1, firm: 2 };
const PRUNE_EVERY_MS = 60 * 60 * 1000;

/** Positive integer within [min, max], else undefined. */
function intIn(raw, min, max) {
  if (raw === undefined || raw === null || !/^\d+$/.test(String(raw).trim()))
    return undefined;
  const n = Number(String(raw).trim());
  return n >= min && n <= max ? n : undefined;
}

export function readEnv(env = process.env) {
  const soft = intIn(env.CONTEXT_PRESSURE_SOFT, 1, 100) ?? DEFAULTS.soft;
  const firm = Math.max(
    intIn(env.CONTEXT_PRESSURE_FIRM, 1, 100) ?? DEFAULTS.firm,
    soft,
  );
  return {
    soft,
    firm,
    maxAgeMin:
      intIn(env.CONTEXT_PRESSURE_MAX_AGE_MIN, 1, 24 * 60) ?? DEFAULTS.maxAgeMin,
    repeat: intIn(env.CONTEXT_PRESSURE_REPEAT, 1, 1000) ?? DEFAULTS.repeat,
    pruneDays: DEFAULTS.pruneDays,
  };
}

export function stateDir(env = process.env, home = os.homedir()) {
  if (env.CONTEXT_PRESSURE_STATE_DIR) return env.CONTEXT_PRESSURE_STATE_DIR;
  const base = env.XDG_STATE_HOME || path.join(home, ".local", "state");
  return path.join(base, "agent-skills", "context-pressure");
}

/** The only gate between stdin and a filename: anything else is a silent no-op (no traversal). */
export function validSessionId(id) {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(id);
}

function bandOf(pct, cfg) {
  return pct >= cfg.firm ? "firm" : pct >= cfg.soft ? "soft" : "none";
}

function ageText(ms) {
  const min = Math.floor(Math.max(0, ms) / 60000);
  return min < 1 ? "under a minute" : `${min} min`;
}

/** The ONE template for both notes. */
export function render(band, pct, ageMs) {
  const measured = `Context is ${Math.round(pct)}% full (measured by the status line ${ageText(ageMs)} ago).`;
  if (band === "firm") {
    return `${measured} Recommend a continuation handoff with session-handoff continue mode now in your closing next steps, as the recommended option, and offer to write it before starting any new phase.`;
  }
  return `${measured} At the next natural boundary (a task or phase finished, never mid-edit), include in your closing next steps a recommendation to hand off with session-handoff continue mode, and offer to write it.`;
}

/**
 * Pure. state = { pct, at, window?, band?, prompts?, emittedAtPrompt? } | null.
 * Returns { text: string|null, next: state|null } — `next` is what `check` writes back.
 *
 * Emits on ENTERING a higher band (hysteresis: staying in a band says nothing), and in the firm
 * band again every `repeat` prompts. A lower band is stored too, so a fall (after /compact) followed
 * by a rise re-emits. A stale reading counts the prompt and says nothing, whatever it reads.
 */
export function decide(state, nowMs, cfg = DEFAULTS) {
  if (!state || typeof state !== "object")
    return { text: null, next: state ?? null };
  const pct = state.pct;
  const atMs = Date.parse(state.at);
  if (
    typeof pct !== "number" ||
    !Number.isFinite(pct) ||
    !Number.isFinite(atMs)
  ) {
    return { text: null, next: state };
  }
  const prompts = (Number.isInteger(state.prompts) ? state.prompts : 0) + 1;
  const ageMs = nowMs - atMs;
  if (ageMs > cfg.maxAgeMin * 60000)
    return { text: null, next: { ...state, prompts } };

  const band = bandOf(pct, cfg);
  const prev = RANK[state.band] === undefined ? "none" : state.band;
  let text = null;
  let emittedAtPrompt = state.emittedAtPrompt;
  if (RANK[band] > RANK[prev]) {
    text = render(band, pct, ageMs);
    emittedAtPrompt = prompts;
  } else if (
    band === "firm" &&
    prompts - (Number.isInteger(emittedAtPrompt) ? emittedAtPrompt : prompts) >=
      cfg.repeat
  ) {
    text = render(band, pct, ageMs);
    emittedAtPrompt = prompts;
  }
  const next = { ...state, band, prompts };
  if (emittedAtPrompt !== undefined) next.emittedAtPrompt = emittedAtPrompt;
  return { text, next };
}

function readJson(file) {
  try {
    const v = JSON.parse(fs.readFileSync(file, "utf8"));
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

function writeAtomic(file, obj) {
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(obj) + "\n", { mode: 0o600 });
    fs.renameSync(tmp, file);
  } catch (e) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* never created */
    }
    throw e;
  }
}

/** At most once an hour, delete state files untouched for `days`. */
export function prune(dir, nowMs = Date.now(), days = DEFAULTS.pruneDays) {
  const marker = path.join(dir, ".pruned");
  try {
    if (nowMs - fs.statSync(marker).mtimeMs < PRUNE_EVERY_MS) return;
  } catch {
    /* no marker yet: prune now */
  }
  for (const name of fs.readdirSync(dir)) {
    if (!/\.json$|\.tmp$/.test(name)) continue; // a .tmp is a write that died mid-rename
    const f = path.join(dir, name);
    try {
      if (nowMs - fs.statSync(f).mtimeMs > days * 86400000) fs.unlinkSync(f);
    } catch {
      /* raced with another writer: leave it */
    }
  }
  fs.writeFileSync(marker, "");
}

function parseInput(raw) {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

/** Status-line side. Returns true when a reading was written (for tests); never throws. */
export function record(
  raw,
  { env = process.env, home = os.homedir(), nowMs = Date.now() } = {},
) {
  try {
    const input = parseInput(raw);
    if (!input || !validSessionId(input.session_id)) return false;
    const cw = input.context_window || {};
    const pct = cw.used_percentage;
    if (typeof pct !== "number" || !Number.isFinite(pct)) return false;
    const dir = stateDir(env, home);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const file = path.join(dir, `${input.session_id}.json`);
    const prev = readJson(file) || {};
    const next = { ...prev, pct, at: new Date(nowMs).toISOString() };
    if (typeof cw.context_window_size === "number")
      next.window = cw.context_window_size;
    writeAtomic(file, next);
    try {
      prune(dir, nowMs);
    } catch {
      /* pruning is opportunistic */
    }
    return true;
  } catch {
    return false;
  }
}

/** Hook side. Returns the stdout text ("" or one JSON object + newline); never throws. */
export function check(
  raw,
  { env = process.env, home = os.homedir(), nowMs = Date.now() } = {},
) {
  try {
    const input = parseInput(raw);
    if (!input || !validSessionId(input.session_id)) return "";
    const file = path.join(stateDir(env, home), `${input.session_id}.json`);
    const state = readJson(file);
    if (!state) return "";
    const { text, next } = decide(state, nowMs, readEnv(env));
    if (next && next !== state) {
      try {
        writeAtomic(file, next);
      } catch {
        /* an unwritable state dir costs repeat suppression, not the note */
      }
    }
    if (!text) return "";
    return (
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: text,
        },
      }) + "\n"
    );
  } catch {
    return "";
  }
}

// ── settings.json transforms (used by context-pressure-install.sh) ──────────────────────────────

/** Single-quote a string for sh. Reversible by `unshq`. */
export function shq(s) {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

/** Inverse of shq for a string shq produced (concatenated '…' and \' pieces). null if not one. */
export function unshq(s) {
  let out = "";
  let i = 0;
  if (!s.length) return null;
  while (i < s.length) {
    if (s[i] === "'") {
      const j = s.indexOf("'", i + 1);
      if (j < 0) return null;
      out += s.slice(i + 1, j);
      i = j + 1;
    } else if (s[i] === "\\" && s[i + 1] === "'") {
      out += "'";
      i += 2;
    } else {
      return null;
    }
  }
  return out;
}

export function hookCommand(engine) {
  return `command node ${shq(engine)} check`;
}

export function wrapCommand(wrapper, original) {
  return original === undefined
    ? `sh ${shq(wrapper)}`
    : `sh ${shq(wrapper)} -- sh -c ${shq(original)}`;
}

// The engine / wrapper filename as a whole path segment: preceded by the start, a separator, a quote
// or whitespace, and followed by a closing quote, whitespace or the end. A substring test claimed
// another tool's `my-context-pressure.mjs` as ours, and matched a directory that merely contains the
// wrapper's name (QA cycle 2 CR-2, CR-4).
const HOOK_RE = /(?:^|[\s'"/])context-pressure\.mjs['"]?\s+check(?:\s|$)/;
// The wrap is recognised only in program position — the command STARTS with the wrapper (optionally
// run by sh/bash/zsh), quoted or bare. A whole-segment match anywhere else claimed a user's original
// that merely mentions the name as already wrapped.
const WRAP_RE =
  /^\s*(?:(?:ba|z)?sh\s+)?(?:'[^']*\/context-pressure-statusline\.sh'|"[^"]*\/context-pressure-statusline\.sh"|(?:\S*\/)?context-pressure-statusline\.sh)(?=\s|$)/;
/(?:^|[\s'"/])context-pressure-statusline\.sh(?=['"]?(?:\s|$))/g;

function isHookIdentity(h) {
  return h && typeof h.command === "string" && HOOK_RE.test(h.command);
}

/** Remove every spelling of our hook from UserPromptSubmit. Mutates `s`; returns entries removed. */
function stripHooks(s) {
  const groups =
    s.hooks && Array.isArray(s.hooks.UserPromptSubmit)
      ? s.hooks.UserPromptSubmit
      : null;
  if (!groups) return [];
  const removed = [];
  const kept = [];
  for (const g of groups) {
    if (!g || !Array.isArray(g.hooks)) {
      kept.push(g);
      continue;
    }
    const hooks = g.hooks.filter((h) =>
      isHookIdentity(h) ? (removed.push(h), false) : true,
    );
    if (hooks.length)
      kept.push(hooks.length === g.hooks.length ? g : { ...g, hooks });
  }
  if (!removed.length) return removed; // nothing of ours: leave every container exactly as found
  if (kept.length) s.hooks.UserPromptSubmit = kept;
  else {
    // Our removal emptied it. An empty container the user had BEFORE install is indistinguishable
    // from one install created, and settings.json has no field to record which; dropping it is the
    // equivalent setting either way (accepted residual, task.157 QA cycle 1 CR-3).
    delete s.hooks.UserPromptSubmit;
    if (!Object.keys(s.hooks).length) delete s.hooks;
  }
  return removed;
}

/**
 * Recover the original status line from a wrapped command.
 * { wrapped: false } | { wrapped: true, original: string|undefined } | { wrapped: true, unparseable: true }
 */
export function unwrapCommand(cmd) {
  if (typeof cmd !== "string") return { wrapped: false };
  const hit = WRAP_RE.exec(cmd);
  if (!hit) return { wrapped: false };
  const at = hit.index + hit[0].length;
  const rest = cmd.slice(at).replace(/^['"]/, "");
  if (rest.trim() === "") return { wrapped: true, original: undefined };
  const m = /^\s+--\s+sh -c (.+)$/s.exec(rest);
  const original = m ? unshq(m[1]) : null;
  return original === null
    ? { wrapped: true, unparseable: true }
    : { wrapped: true, original };
}

/**
 * Pure. Returns { settings, changed, outcome, notes[] }; outcome is changed | unchanged | needs-manual. `settings` is a deep copy; the input is untouched.
 */
export class SettingsShapeError extends Error {}

/** Refuse a hooks shape this transform cannot edit without losing or mangling data. */
function assertEditableShape(s) {
  const h = s.hooks;
  if (h === undefined) return;
  if (!h || typeof h !== "object" || Array.isArray(h)) {
    throw new SettingsShapeError("`hooks` is not a JSON object");
  }
  const ups = h.UserPromptSubmit;
  if (ups !== undefined && !Array.isArray(ups)) {
    throw new SettingsShapeError("`hooks.UserPromptSubmit` is not an array");
  }
}

export function applySettings(input, mode, { engine, wrapper } = {}) {
  const s = JSON.parse(JSON.stringify(input));
  assertEditableShape(s);
  const notes = [];
  const manual = []; // things this transform will not touch and a person must
  let changed = false;

  if (mode === "install") {
    const want = hookCommand(engine);
    const before = JSON.stringify(s.hooks ?? null);
    const removed = stripHooks(s);
    if (removed.length === 1 && removed[0].command === want) {
      s.hooks = JSON.parse(before); // exactly our one entry was already there: leave it in place
    } else {
      s.hooks = s.hooks && typeof s.hooks === "object" ? s.hooks : {};
      s.hooks.UserPromptSubmit = [
        ...(s.hooks.UserPromptSubmit || []),
        { hooks: [{ type: "command", command: want, timeout: 5 }] },
      ];
      changed = true;
      notes.push(
        removed.length
          ? `hook: replaced ${removed.length} other spelling(s)`
          : "hook: added UserPromptSubmit check",
      );
    }

    const sl = s.statusLine;
    if (sl === undefined) {
      s.statusLine = { type: "command", command: wrapCommand(wrapper) };
      changed = true;
      notes.push(
        "statusLine: none existed — added the recorder alone (prints nothing)",
      );
    } else if (
      !sl ||
      typeof sl !== "object" ||
      typeof sl.command !== "string"
    ) {
      manual.push(
        "statusLine: present but has no command string — left unchanged; give it a command and re-run, or the hook has no reading to act on",
      );
    } else if (unwrapCommand(sl.command).wrapped) {
      const u = unwrapCommand(sl.command);
      const want = wrapCommand(wrapper, u.original);
      if (u.unparseable) {
        manual.push(
          "statusLine: wrapped in a form this installer did not write — left unchanged, check it by hand",
        );
      } else if (sl.command === want) {
        notes.push("statusLine: already wrapped — unchanged");
      } else {
        // Wrapped by another copy of the wrapper (an earlier install from another directory): point
        // it at this one, or deleting that directory blanks the status line (QA cycle 1 CR-1).
        s.statusLine = { ...sl, command: want };
        changed = true;
        notes.push("statusLine: re-pointed an existing wrap at this wrapper");
      }
    } else {
      s.statusLine = { ...sl, command: wrapCommand(wrapper, sl.command) };
      changed = true;
      notes.push("statusLine: wrapped the existing command");
    }
  } else if (mode === "uninstall") {
    if (stripHooks(s).length) {
      changed = true;
      notes.push("hook: removed");
    }
    const sl = s.statusLine;
    if (sl && typeof sl === "object") {
      const u = unwrapCommand(sl.command);
      if (u.unparseable) {
        manual.push(
          "statusLine: wrapped in a form this installer did not write — left unchanged, unwrap it by hand",
        );
      } else if (u.wrapped && u.original === undefined) {
        delete s.statusLine;
        changed = true;
        notes.push("statusLine: removed the recorder (there was no original)");
      } else if (u.wrapped) {
        s.statusLine = { ...sl, command: u.original };
        changed = true;
        notes.push("statusLine: restored the original command");
      }
    }
  } else {
    throw new Error(`unknown mode ${mode}`);
  }
  // One outcome, from one place. A needs-manual result never also claims "already installed" or
  // "not installed": that pairing is what let an uninstall leave a wrap behind and exit 0 (QA cycle 2 CR-1).
  const outcome = manual.length
    ? "needs-manual"
    : changed
      ? "changed"
      : "unchanged";
  if (outcome === "unchanged")
    notes.push(
      mode === "install"
        ? "already installed — no change"
        : "not installed — no change",
    );
  for (const m of manual) notes.push(`ACTION NEEDED — ${m}`);
  return { settings: s, changed, outcome, notes };
}

function settingsCli(args) {
  const opt = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (["--mode", "--file", "--out", "--engine", "--wrapper"].includes(a))
      opt[a.slice(2)] = args[++i];
    else
      return {
        code: 2,
        err: `context-pressure settings: unknown argument ${a}`,
      };
  }
  if (!["install", "uninstall"].includes(opt.mode) || !opt.file || !opt.out) {
    return {
      code: 2,
      err: "usage: context-pressure.mjs settings --mode install|uninstall --file <settings> --out <tmp> [--engine <abs>] [--wrapper <abs>]",
    };
  }
  if (opt.mode === "install" && (!opt.engine || !opt.wrapper))
    return {
      code: 2,
      err: "context-pressure settings: install needs --engine and --wrapper",
    };
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(opt.file, "utf8"));
  } catch (e) {
    return {
      code: 1,
      err: `context-pressure settings: ${opt.file} is not valid JSON (${e.message}) — nothing changed`,
    };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      code: 1,
      err: `context-pressure settings: ${opt.file} is not a JSON object — nothing changed`,
    };
  }
  let r;
  try {
    r = applySettings(parsed, opt.mode, opt);
  } catch (e) {
    if (!(e instanceof SettingsShapeError)) throw e;
    return {
      code: 1,
      err: `context-pressure settings: ${opt.file}: ${e.message} — nothing changed; fix it by hand and re-run`,
    };
  }
  if (r.changed)
    fs.writeFileSync(opt.out, JSON.stringify(r.settings, null, 2) + "\n");
  return {
    code: { changed: 0, unchanged: 3, "needs-manual": 4 }[r.outcome],
    err: r.notes.map((n) => `  ${n}`).join("\n"),
  };
}

function isInvokedDirectly() {
  try {
    return fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

async function main(argv) {
  const [cmd, ...rest] = argv;
  if (cmd === "settings") {
    const r = settingsCli(rest);
    if (r.err) process.stderr.write(r.err + "\n");
    process.exitCode = r.code;
    return;
  }
  // record / check: exit 0 on every path, including an unknown subcommand and a stdin error.
  process.exitCode = 0;
  if (cmd !== "record" && cmd !== "check") return;
  let raw = "";
  try {
    raw = await readStdin();
  } catch {
    return;
  }
  if (cmd === "record") record(raw);
  else {
    const out = check(raw);
    if (out) process.stdout.write(out);
  }
}

if (isInvokedDirectly()) {
  main(process.argv.slice(2)).catch((e) => {
    // record/check stay silent and exit 0 on anything; settings says why it refused.
    if (process.argv[2] === "settings") {
      process.stderr.write(
        `context-pressure settings: ${e && e.message} — nothing changed\n`,
      );
      process.exitCode = 1;
    } else process.exitCode = 0;
  });
}
