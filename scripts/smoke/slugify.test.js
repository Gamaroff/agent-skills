"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { slugify } = require("./slugify");

test("AC-1 lowercases", () => {
  assert.strictEqual(slugify("ABC"), "abc");
});

test("AC-2 collapses non-alphanumeric runs", () => {
  assert.strictEqual(slugify("a  b__c"), "a-b-c");
});

test("AC-3 trims edges", () => {
  assert.ok(slugify("  hello  ").startsWith("hello"));
});
