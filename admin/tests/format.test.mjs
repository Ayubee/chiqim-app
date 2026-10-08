import { test } from "node:test";
import assert from "node:assert/strict";
import { money, dateLabel, tashkentDate } from "../src/format.ts";
test("Tashkent day switches at 19:00 UTC regardless of computer timezone", () => {
  assert.equal(tashkentDate(new Date("2026-10-08T18:59:59Z")), "2026-10-08");
  assert.equal(tashkentDate(new Date("2026-10-08T19:00:00Z")), "2026-10-09");
});
test("Uzbek display does not depend on browser CLDR support or round big totals", () => {
  assert.equal(dateLabel("2026-10-09"), "9-oktabr, 2026");
  assert.equal(money("18014398509481982"), "18 014 398 509 481 982");
});
