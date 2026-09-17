import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

async function trimLazadaTemplate() {
  const sourcePath = 'C:/PIM-system/ข้อมูล/Lazada_advancedPublish7636export1781678299435_0617-14-38-19.xlsx';
  console.log(`Loading workbook from ${sourcePath}...`);
  console.time('Load');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(sourcePath);
  console.timeEnd('Load');

  const visibleSheets = wb.worksheets.filter(
    (w) =>
      !w.name.endsWith('_hide') &&
      w.name !== 'สถานะ' &&
      w.name !== 'INDEX' &&
      w.name !== 'global_hide'
  );

  for (const ws of visibleSheets) {
    const wsHide = wb.getWorksheet(`${ws.name}_hide`);
    const colCount = ws.columnCount;
    const reqRow = ws.getRow(2);

    const colsToDelete = [];
    for (let c = 1; c <= colCount; c++) {
      const reqVal = String(reqRow.getCell(c).value || '').trim();
      if (reqVal !== 'บังคับการกรอกข้อมูล') {
        colsToDelete.push(c);
      }
    }

    const mandCount = colCount - colsToDelete.length;
    console.log(`\nProcessing [${ws.name}]:`);
    console.log(`  Initial columns: ${colCount}`);
    console.log(`  Columns to delete (non-mandatory): ${colsToDelete.length}`);
    console.log(`  Mandatory columns remaining: ${mandCount}`);

    // Delete non-mandatory columns right-to-left
    for (let i = colsToDelete.length - 1; i >= 0; i--) {
      const c = colsToDelete[i];
      ws.spliceColumns(c, 1);
      if (wsHide) {
        wsHide.spliceColumns(c, 1);
      }
    }

    if (ws.columns) {
      ws.columns = ws.columns.slice(0, mandCount);
    }
    if (wsHide && wsHide.columns) {
      wsHide.columns = wsHide.columns.slice(0, mandCount);
    }

    const r1 = ws.getRow(1);
    const r2 = ws.getRow(2);
    const remainingHeaders = [];
    for (let c = 1; c <= mandCount; c++) {
      remainingHeaders.push({
        col: c,
        header: r1.getCell(c).value,
        req: r2.getCell(c).value,
      });
    }
    console.log(`  Remaining columns in [${ws.name}]:`);
    remainingHeaders.forEach((h) =>
      console.log(`    Col ${h.col}: ${h.header} [${h.req}]`)
    );
  }

  // Target paths to update
  const targetPaths = [
    'C:/PIM-system/ข้อมูล/Lazada_advancedPublish7636export1781678299435_0617-14-38-19.xlsx',
    'D:/PIM-system/ข้อมูล/Lazada_advancedPublish7636export1781678299435_0617-14-38-19.xlsx',
    'D:/PIM-system/public/แพลตฟอร์ม/Lazada_advancedPublish7636export1781678299435_0617-14-38-19.xlsx',
    'D:/PIM-system/dist/แพลตฟอร์ม/Lazada_advancedPublish7636export1781678299435_0617-14-38-19.xlsx',
    'C:/PIM-system/public/แพลตฟอร์ม/Lazada_advancedPublish7636export1781678299435_0617-14-38-19.xlsx',
    'C:/PIM-system/dist/แพลตฟอร์ม/Lazada_advancedPublish7636export1781678299435_0617-14-38-19.xlsx',
  ];

  console.log('\nWriting modified workbook...');
  console.time('Write');
  const tempOut = 'C:/PIM-system/ข้อมูล/temp_trimmed_lazada.xlsx';
  await wb.xlsx.writeFile(tempOut);
  console.timeEnd('Write');

  // Copy to all target paths
  for (const target of targetPaths) {
    const dir = path.dirname(target);
    if (fs.existsSync(dir)) {
      fs.copyFileSync(tempOut, target);
      console.log(`✓ Updated: ${target}`);
    }
  }

  // Remove temp file
  if (fs.existsSync(tempOut)) {
    fs.unlinkSync(tempOut);
  }

  console.log('\n🎉 Successfully trimmed all non-mandatory columns from Lazada template!');
}

trimLazadaTemplate().catch((err) => {
  console.error('Error trimming template:', err);
  process.exit(1);
});
