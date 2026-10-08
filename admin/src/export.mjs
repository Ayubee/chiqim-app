import ExcelJS from "exceljs";
export async function buildWorkbook(
  rows,
  { storeName, from, to, sellerNames },
) {
  const active = rows.filter((row) => !row.deleted_at);
  const total = active.reduce((sum, row) => sum + BigInt(row.amount_uzs), 0n);
  if (total > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("XLSX_SAFE_INTEGER_LIMIT");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Chiqim";
  const sheet = workbook.addWorksheet("Chiqimlar", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });
  sheet.columns = [
    { width: 16 },
    { width: 12 },
    { width: 26 },
    { width: 25 },
    { width: 52 },
    { width: 22 },
  ];
  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = `${storeName} — Chiqimlar`;
  sheet.getCell("A1").font = {
    size: 18,
    bold: true,
    color: { argb: "FF202124" },
  };
  sheet.getRow(1).height = 34;
  sheet.mergeCells("A2:F2");
  sheet.getCell("A2").value =
    `Davr: ${from} — ${to} • Vaqt mintaqasi: Asia/Tashkent`;
  sheet.getCell("A2").font = { size: 10, color: { argb: "FF666666" } };
  const header = sheet.getRow(4);
  header.values = [
    "Sana",
    "Vaqt",
    "Magazin",
    "Sotuvchi",
    "Izoh",
    "Summa (so‘m)",
  ];
  header.height = 28;
  header.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF3F4F6" },
    };
    cell.font = { bold: true, color: { argb: "FF333333" } };
    cell.alignment = { vertical: "middle" };
  });
  for (const row of active) {
    const amount = BigInt(row.amount_uzs);
    if (amount < 1n || amount > BigInt(Number.MAX_SAFE_INTEGER))
      throw new Error("XLSX_SAFE_INTEGER_LIMIT");
    const localTime = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tashkent",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(row.occurred_at));
    const added = sheet.addRow([
      row.expense_date,
      localTime,
      storeName,
      sellerNames[row.seller_id] ?? "Noma’lum sotuvchi",
      row.note,
      Number(amount),
    ]);
    added.alignment = { vertical: "top", wrapText: true };
    added.getCell(6).numFmt = "#,##0";
    // Strings are literal Excel values, including notes beginning with =, +, - or @.
    added.height = Math.max(24, Math.ceil(row.note.length / 48) * 15);
  }
  const last = 4 + active.length;
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: Math.max(last, 4), column: 6 },
  };
  const totals = sheet.addRow(["Jami", "", "", "", "", Number(total)]);
  totals.height = 30;
  totals.font = { bold: true };
  totals.getCell(6).numFmt = "#,##0";
  totals.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFCEDEC" },
    };
  });
  sheet.printOptions = { horizontalCentered: true };
  sheet.pageSetup.printTitlesRow = "1:4";
  return workbook;
}
export async function downloadWorkbook(rows, options) {
  const workbook = await buildWorkbook(rows, options);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `chiqimlar_${options.from}_${options.to}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
