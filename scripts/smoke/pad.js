"use strict";

// Left-pad a value to width with a fill character.
function pad(value, width, fill) {
  let s = String(value);
  while (s.length < width) s = fill + s;
  return s;
}

module.exports = { pad };
