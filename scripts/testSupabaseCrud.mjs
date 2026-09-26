import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function testCrud() {
  console.log('--- 1. Testing Product CRUD ---');
  const testProduct = {
    SKU: 'TEST-SKU-001',
    barcode: '885000000001',
    name: 'สินค้าทดสอบ ระบบ PIM',
    wholesale_price: 150,
    retail_price: 250,
    cap_cost: 10,
    status: 'Active',
    description: 'ทดสอบบันทึกลง Supabase',
    category: 'ทั่วไป',
    brand: 'แบรนด์ทดสอบ'
  };

  const { data: inserted, error: insertErr } = await supabase
    .from('products')
    .insert([testProduct])
    .select()
    .single();

  if (insertErr) {
    console.error('Insert error:', insertErr);
    return;
  }
  console.log('✅ Inserted product:', inserted.id, inserted.name);

  // Update
  const { data: updated, error: updateErr } = await supabase
    .from('products')
    .update({ retail_price: 300 })
    .eq('id', inserted.id)
    .select()
    .single();

  if (updateErr) {
    console.error('Update error:', updateErr);
  } else {
    console.log('✅ Updated product retail_price to:', updated.retail_price);
  }

  // Delete
  const { error: delErr } = await supabase
    .from('products')
    .delete()
    .eq('id', inserted.id);

  if (delErr) {
    console.error('Delete error:', delErr);
  } else {
    console.log('✅ Deleted test product successfully!');
  }

  console.log('--- 2. Testing Quotation CRUD ---');
  const testQuotation = {
    quotation_number: 'TEST-QT-0001',
    doc_type: 'quotation',
    date: '2026-09-12',
    customer_info: { name: 'ลูกค้าทดสอบ', companyName: 'บริษัท ทดสอบ จำกัด' },
    items: [{ name: 'สินค้า A', quantity: 2, price: 500, total: 1000 }],
    subtotal: 1000,
    total_amount: 1070,
    status: 'draft'
  };

  const { data: qInserted, error: qErr } = await supabase
    .from('quotations')
    .insert([testQuotation])
    .select()
    .single();

  if (qErr) {
    console.error('Quotation insert error:', qErr);
  } else {
    console.log('✅ Inserted quotation:', qInserted.quotation_number);
    // Cleanup
    await supabase.from('quotations').delete().eq('id', qInserted.id);
    console.log('✅ Cleaned up test quotation.');
  }

  console.log('All CRUD tests passed!');
}

testCrud();
