import ExcelJS from 'exceljs';

const file = "번호 ^^ 26수발거인(원본) ^^ 배관(필립) ^^ 품목(수량) ^^ 거래처명 ^^ 현장명 ^^ 요일(발주일)  ^^ 요일(납품일) ^^ 작성자 이니셜.xlsx";

const TARGET_SHEETS = ['고정구단가산출', '견적서', '거래명세서', '발주서'];

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);

wb.eachSheet((sheet) => {
  if (!TARGET_SHEETS.includes(sheet.name)) return;
  console.log(`\n===== 시트: ${sheet.name} =====`);
  sheet.eachRow((row, rowNum) => {
    if (rowNum > 60) return;
    const vals: string[] = [];
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const v = cell.value;
      let display: string;
      if (v === null || v === undefined) return;
      if (typeof v === 'object' && 'richText' in (v as any)) {
        display = (v as any).richText.map((r: any) => r.text).join('');
      } else if (typeof v === 'object' && 'formula' in (v as any)) {
        display = `formula(${(v as any).result})`;
      } else if (typeof v === 'object' && 'error' in (v as any)) {
        display = `err`;
      } else {
        display = String(v);
      }
      vals.push(`[${col}]${display}`);
    });
    if (vals.length > 0) console.log(`  R${rowNum}: ${vals.join(' | ')}`);
  });
});
