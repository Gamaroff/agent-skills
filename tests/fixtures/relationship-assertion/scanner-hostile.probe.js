// SCANNER PROBE — task 89, gate 1 finding CY1-1.
//
// Not a rule fixture: this file exists to desync the SCANNER, not to exercise a
// rule. Each line below puts a regex literal in a position the value-position
// test once rejected, with an ODD number of quote characters inside it. Scanned
// as code, each opens a phantom string that runs to end of file — and every
// assertion after it becomes invisible to every rule, with the analyser
// reporting the file as clean.
//
// The bait assertion at the bottom is a textbook rule-A defect. If the scanner
// is healthy it is found; if any line above desyncs the mask, it is not, and the
// reachability guard names the failure instead of swallowing it.
//
// Deliberately named `.probe.js`, not `.fixture.js`, so it stays out of the
// corpus-completeness assertion that pins the eight rule fixtures.
"use strict";

const a = 1,
  b = 2,
  doc = "";

const afterArrow = (l) => /it's here/.test(l);
const afterCompare = a > /don't/.test(b);
const afterBacktick = (l) => /a`b/.test(l);
const afterEscapedSlash = (l) => /a\/b'c/.test(l);
function afterReturn(x) {
  return /it's/.test(x);
}
const afterTypeof = typeof /won't/.source;

// The bait. Rule A must find this, or the scanner went blind above.
assert.match(doc, /ALPHA[^|]*BRAVO/, "ALPHA must route to BRAVO");
