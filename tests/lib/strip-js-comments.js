"use strict";
/**
 * Remove JavaScript comments from source text, leaving strings, template literals and
 * regex literals intact — the tokenizer a comment check needs, because a `//` or `/*`
 * inside a string, a template or a regex (`/[._\/*-]/`) is not a comment.
 *
 * Lifted from tests/test-harness-concurrency.test.js (task.207 QA cycle 2, CR-2) so the
 * doc-id chokepoint test uses the same tokenizer rather than a second, line-based
 * stripper that opened a phantom block comment on a `/*` inside a regex literal. Line
 * breaks inside a block comment are kept, so line numbers survive the strip.
 */
function stripComments(src) {
  const REGEX_OK_AFTER =
    /[(,=:[!&|?{};+\-*%~^<>]$|\b(?:return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/;
  let out = "";
  let i = 0;
  const n = src.length;
  // Trailing significant output, for the regex-vs-division heuristic. A window rather than a scan
  // of `out`: trimming the whole accumulated string on every `/` is quadratic (measured 3.9s on a
  // 1.2MB input, 245ms at 500KB) and the longest keyword here is 10 characters.
  let tail = "";
  const emit = (text) => {
    out += text;
    tail = (tail + text).slice(-16);
  };
  const regexAllowed = () => {
    const before = tail.replace(/\s+$/, "");
    return before === "" || REGEX_OK_AFTER.test(before);
  };

  // Template-literal state. A template's closing backtick ALWAYS returns to code, because a
  // template can only be opened from code — either at the top level or inside a `${}`. What needs
  // a stack is the `${}` substitution: its contents are CODE, and the matching `}` must return to
  // the enclosing template. Without this, a nested template's opening backtick closed the outer
  // one and its contents were scanned as code, so a URL, a glob or a `//` inside it started a
  // comment and deleted the rest of the line — to EOF for a `/*`.
  let inTemplate = false;
  const substitutions = []; // saved brace depth, one entry per open `${`
  let braceDepth = 0;

  while (i < n) {
    const c = src[i];
    const d = src[i + 1];

    if (inTemplate) {
      if (c === "\\") {
        emit(c + (src[i + 1] ?? ""));
        i += 2;
        continue;
      }
      if (c === "`") {
        emit(c);
        i++;
        inTemplate = false;
        continue;
      }
      if (c === "$" && d === "{") {
        emit("${");
        i += 2;
        substitutions.push(braceDepth);
        braceDepth = 0;
        inTemplate = false;
        continue;
      }
      emit(c);
      i++;
      continue;
    }

    // ---- code ----
    if (c === "/" && d === "/") {
      // `\r` terminates a line comment in JS too; stopping only at `\n` ran a CRLF-free comment on.
      while (i < n && src[i] !== "\n" && src[i] !== "\r") i++;
      continue;
    }
    if (c === "/" && d === "*") {
      i += 2;
      // Keep the comment's line breaks: a caller that reports line numbers (the doc-id
      // chokepoint test) must see every following line where it really is.
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") emit("\n");
        i++;
      }
      i += 2;
      continue;
    }
    if (c === '"' || c === "'") {
      emit(c);
      i++;
      while (i < n) {
        if (src[i] === "\\") {
          emit(src[i] + (src[i + 1] ?? ""));
          i += 2;
          continue;
        }
        emit(src[i]);
        if (src[i] === c) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === "`") {
      emit(c);
      i++;
      inTemplate = true;
      continue;
    }
    if (c === "}" && braceDepth === 0 && substitutions.length > 0) {
      emit(c);
      i++;
      braceDepth = substitutions.pop();
      inTemplate = true;
      continue;
    }
    if (c === "{") braceDepth++;
    else if (c === "}") braceDepth--;
    if (c === "/" && regexAllowed()) {
      emit(c);
      i++;
      let inClass = false;
      while (i < n) {
        const ch = src[i];
        if (ch === "\\") {
          emit(ch + (src[i + 1] ?? ""));
          i += 2;
          continue;
        }
        if (ch === "\n") break; // unterminated — not a regex after all; stop rather than run on
        emit(ch);
        i++;
        if (ch === "[") inClass = true;
        else if (ch === "]") inClass = false;
        else if (ch === "/" && !inClass) break;
      }
      continue;
    }
    emit(c);
    i++;
  }
  return out;
}

module.exports = { stripComments };
