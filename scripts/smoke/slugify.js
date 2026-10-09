"use strict";

// Turn a title into a URL slug: lowercase, non-alphanumeric runs → '-', edges trimmed.
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "");
}

module.exports = { slugify };
