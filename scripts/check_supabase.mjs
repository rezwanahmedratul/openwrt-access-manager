import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envPath = '/root/openwrt-access-manager/.env';
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

console.log('==============================================');
console.log('SUPABASE DATABASE CONFIGURATION & HEALTH CHECK');
console.log('==============================================');
console.log('.env file path:', envPath);
console.log('.env file size:', envContent.length, 'bytes');

const lines = envContent.split('\n').filter(l => !l.startsWith('#') && l.trim());
console.log('Active .env entries count:', lines.length);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n[Environment Variables]');
console.log('- NEXT_PUBLIC_SUPABASE_URL:', url ? (url.startsWith('http') ? url : '[INVALID URL]') : '[NOT SET / EMPTY]');
console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', anonKey ? `Set (${anonKey.length} chars)` : '[NOT SET / EMPTY]');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? `Set (${serviceKey.length} chars)` : '[NOT SET / EMPTY]');

if (!url || !url.startsWith('http')) {
  console.log('\n[HEALTH DIAGNOSIS]');
  console.log('⚠️  Supabase is currently NOT CONNECTED because NEXT_PUBLIC_SUPABASE_URL is not set.');
  console.log('ℹ️  The application is operating in local mock storage mode (in-memory mock DB).');
  console.log('ℹ️  To connect to a live Supabase project, provide:');
  console.log('    NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co');
  console.log('    NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>');
  console.log('    SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>');
  process.exit(0);
}

console.log('\n[Testing Network & Querying Supabase]');
const key = serviceKey || anonKey;
const supabase = createClient(url, key);

try {
  const start = Date.now();
  const { data: groups, error: groupsErr, count: groupsCount } = await supabase
    .from('groups')
    .select('*', { count: 'exact' });
  const latency = Date.now() - start;

  if (groupsErr) {
    console.log(`❌ Query failed (${latency}ms):`, groupsErr.message);
    console.log('Details:', groupsErr);
  } else {
    console.log(`✅ Connection Successful (${latency}ms)!`);
    console.log(`   Found ${groupsCount} groups in database:`, groups.map(g => g.name).join(', '));
  }
} catch (err) {
  console.log('❌ Failed with network exception:', err.message);
}
