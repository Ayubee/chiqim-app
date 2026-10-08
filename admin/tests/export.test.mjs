import { test } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { buildWorkbook } from "../src/export.mjs";
const options = {
  storeName: "Chilonzor",
  from: "2026-10-01",
  to: "2026-10-08",
  sellerNames: { a: "Ali", b: "Vali" },
};
const row = (amount, extra = {}) => ({
  amount_uzs: String(amount),
  expense_date: "2026-10-08",
  occurred_at: "2026-10-07T19:05:00Z",
  seller_id: "a",
  note: "Yo‘l xarajati",
  deleted_at: null,
  ...extra,
});
test("XLSX round-trip preserves numeric money, total, timezone, headings and filter", async () => {
  const book = await buildWorkbook(
    [
      row(12000),
      row(3500, { seller_id: "b", note: '=HYPERLINK("https://example.com")' }),
      row(9999, { deleted_at: "2026-10-08T00:00:00Z" }),
    ],
    options,
  );
  const bytes = await book.xlsx.writeBuffer();
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(bytes);
  const sheet = restored.getWorksheet("Chiqimlar");
  assert.equal(sheet.getCell("A1").value, "Chilonzor — Chiqimlar");
  assert.equal(sheet.getCell("B5").value, "00:05");
  assert.equal(sheet.getCell("F5").type, ExcelJS.ValueType.Number);
  assert.equal(sheet.getCell("F5").value, 12000);
  assert.equal(sheet.getCell("F7").value, 15500);
  assert.equal(sheet.getCell("A7").value, "Jami");
  assert.equal(sheet.getCell("D6").value, "Vali");
  assert.equal(sheet.getCell("E6").type, ExcelJS.ValueType.String);
  assert.equal(sheet.autoFilter, "A4:F6");
  assert.equal(sheet.views[0].ySplit, 4);
  assert.equal(sheet.rowCount, 7);
});
test("XLSX refuses imprecise aggregate instead of rounding money", async () => {
  await assert.rejects(
    buildWorkbook([row(Number.MAX_SAFE_INTEGER), row(1)], options),
    /XLSX_SAFE_INTEGER_LIMIT/,
  );
});
test("empty XLSX has headers and numeric zero total", async () => {
  const book = await buildWorkbook([], options);
  const sheet = book.getWorksheet("Chiqimlar");
  assert.equal(sheet.getCell("F5").value, 0);
  assert.equal(sheet.getCell("A5").value, "Jami");
});
