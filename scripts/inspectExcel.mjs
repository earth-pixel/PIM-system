import XLSX from 'xlsx';
import fs from 'fs';

const fileBuf = fs.readFileSync('public/แพลตฟอร์มนำเข้าสินค้า.xlsx');
const wb = XLSX.read(fileBuf);

wb.SheetNames.forEach(name => {
  console.log("=== Sheet:", name);
  const sheet = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log("Rows:", JSON.stringify(data.slice(0, 10), null, 2));
});
