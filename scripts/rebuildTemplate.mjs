import ExcelJS from 'exceljs';

async function rebuild() {
  const wb = new ExcelJS.Workbook();
  
  // Sheet 1: ข้อมูลสินค้า
  const ws = wb.addWorksheet('ข้อมูลสินค้า');

  // Title Row 1
  ws.mergeCells('A1:R1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'แพลตฟอร์มนำเข้าสินค้า — ระบบ PIM';
  titleCell.font = { name: 'Sarabun', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 35;

  // Header Row 2
  const headers = [
    'รหัสสินค้า', 'รหัสบาร์โค้ด', 'ชื่อสินค้า', 'รูปภาพสินค้า', 'หมวดหมู่', 'หมวดหมู่ย่อย',
    'แบรนด์สินค้า', 'ขนาด', 'น้ำหนัก', 'หมายเลข อย.', 'มอก.', 'ราคาขายส่ง',
    'ราคาขายปลีก', 'ค่าฝา', 'สถานะใช้งาน', 'รายละเอียดสินค้า', 'จุดเด่นสินค้า', 'วิธีใช้'
  ];

  const headerRow = ws.getRow(2);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Sarabun', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB8CCE4' } },
      left: { style: 'thin', color: { argb: 'FFB8CCE4' } },
      bottom: { style: 'thin', color: { argb: 'FFB8CCE4' } },
      right: { style: 'thin', color: { argb: 'FFB8CCE4' } }
    };
  });
  headerRow.height = 28;

  // Set column widths
  const colWidths = [15, 18, 30, 25, 25, 25, 20, 12, 12, 18, 15, 15, 15, 12, 15, 30, 30, 30];
  colWidths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // Sheet 2: คำแนะนำ
  const wsGuide = wb.addWorksheet('คำแนะนำ');
  wsGuide.addRow(['หัวข้อ', 'รายละเอียด']);
  wsGuide.addRow(['วัตถุประสงค์', 'เทมเพลตนี้ใช้สำหรับกรอก/นำเข้าข้อมูลสินค้าให้ตรงกับโครงสร้างระบบ PIM']);
  wsGuide.addRow(['เริ่มกรอกที่แถว', 'แถวที่ 3 ของชีท "ข้อมูลสินค้า"']);
  wsGuide.addRow(['หมวดหมู่ / หมวดหมู่ย่อย', 'กรอกหมวดหมู่หลักในช่องหมวดหมู่ และหมวดหมู่ย่อยในช่องหมวดหมู่ย่อย']);
  wsGuide.addRow(['สถานะใช้งาน', 'กรอก "Active" หรือ "Inactive" (หรือ "เปิดใช้งาน" / "ปิดใช้งาน")']);

  wsGuide.getColumn(1).width = 25;
  wsGuide.getColumn(2).width = 75;

  await wb.xlsx.writeFile('public/แพลตฟอร์มนำเข้าสินค้า.xlsx');
  console.log("Rebuilt public/แพลตฟอร์มนำเข้าสินค้า.xlsx perfectly!");
}

rebuild().catch(console.error);
