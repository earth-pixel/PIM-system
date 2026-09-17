import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', url);

const supabase = createClient(url, key);

async function testConnection() {
  try {
    const { data, error } = await supabase.from('products').select('*').limit(1);
    if (error) {
      console.error('❌ Connection error:', error.message);
      return false;
    }
    console.log('✅ Supabase connected successfully! Table "products" is reachable.');
    console.log('Sample query returned rows:', data ? data.length : 0);

    const { data: buckets, error: bError } = await supabase.storage.listBuckets();
    if (bError) {
      console.warn('⚠️ Storage list error:', bError.message);
    } else {
      console.log('✅ Storage buckets found:', buckets.map(b => b.name).join(', '));
    }
    return true;
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return false;
  }
}

testConnection();
