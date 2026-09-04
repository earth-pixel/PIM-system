import ExcelJS from 'exceljs';
import fs from 'fs';

async function updateTemplate() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('public/แพลตฟอร์มนำเข้าสินค้า.xlsx');

  const ws = wb.getWorksheet('ข้อมูลสินค้า');
  if (ws) {
    // Row 2 is headers
    const headerRow = ws.getRow(2);
    const headers = [];
    headerRow.eachCell((cell, colNum) => {
      headers.push({ colNum, val: cell.value });
    });
    console.log("Current headers:", headers);

    // Insert column 6 (หมวดหมู่ย่อย) right after หมวดหมู่ (col 5)
    ws.spliceColumns(6, 0, ['หมวดหมู่ย่อย']);

    // Set styling for header cell
    const cell = ws.getCell(2, 6);
    cell.value = 'หมวดหมู่ย่อย';
    
    // Copy style from cell (2, 5)
    const catCell = ws.getCell(2, 5);
    if (catCell.style) {
      cell.style = JSON.parse(JSON.stringify(catCell.style));
    }
  }

  await wb.xlsx.writeFile('public/แพลตฟอร์มนำเข้าสินค้า.xlsx');
  console.log("Updated public/แพลตฟอร์มนำเข้าสินค้า.xlsx successfully!");
}

updateTemplate().catch(console.error);
