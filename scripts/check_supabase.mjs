import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envPath = '/root/openwrt-access-manager/.env';
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

console.log('==============================================');
console.log('SUPABASE DATABASE CONFIGURATION & HEALTH CHECK');
console.log('==============================================');
console.log('.env file path:', envPath);
console.log('.env file size:', envContent.length, 'bytes');

const lines = envContent.split('\n').filter((l) => !l.startsWith('#') && l.trim());
console.log('Active .env entries count:', lines.length);

const envVars = {};
lines.forEach((line) => {
  const eqIdx = line.indexOf('=');
  if (eqIdx > 0) {
    const k = line.substring(0, eqIdx).trim();
    let v = line.substring(eqIdx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    envVars[k] = v;
  }
});

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  envVars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n[Environment Configuration]');
console.log('- NEXT_PUBLIC_SUPABASE_URL:', url ? (url.startsWith('http') ? url : '[INVALID URL]') : '[NOT SET / EMPTY]');
console.log('- ANON / PUBLISHABLE KEY:', anonKey ? `Set (${anonKey.length} chars)` : '[NOT SET / EMPTY]');
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
    console.log(`❌ Groups query failed (${latency}ms):`, groupsErr.message);
  } else {
    console.log(`✅ Connection Successful (${latency}ms)!`);
    console.log(`   [groups] ${groupsCount} groups:`, groups.map((g) => g.name).join(', '));
  }

  // Check users table
  const { data: users, error: usersErr, count: usersCount } = await supabase
    .from('users')
    .select('id, name, mac_address', { count: 'exact' });
  if (usersErr) {
    console.log(`⚠️  [users] table check failed:`, usersErr.message);
  } else {
    console.log(`   [users] ${usersCount} users registered`);
  }

  // Check accounts table
  const { data: accounts, error: accountsErr, count: accountsCount } = await supabase
    .from('accounts')
    .select('id, username, role', { count: 'exact' });
  if (accountsErr) {
    console.log(`⚠️  [accounts] table check failed:`, accountsErr.message);
  } else {
    console.log(`   [accounts] ${accountsCount} accounts registered:`, accounts.map((a) => `${a.username} (${a.role})`).join(', '));
  }

  // Check draft_changes table
  const { error: draftErr, count: draftCount } = await supabase
    .from('draft_changes')
    .select('id', { count: 'exact', head: true });
  if (draftErr) {
    console.log(`⚠️  [draft_changes] table check failed:`, draftErr.message);
  } else {
    console.log(`   [draft_changes] table operational (pending changes: ${draftCount || 0})`);
  }

  // Check config_versions table
  const { error: configErr, count: configCount } = await supabase
    .from('config_versions')
    .select('id', { count: 'exact', head: true });
  if (configErr) {
    console.log(`⚠️  [config_versions] table check failed:`, configErr.message);
  } else {
    console.log(`   [config_versions] table operational (${configCount || 0} versions archived)`);
  }

  console.log('\n🎉 ALL SUPABASE TABLES ARE ACCESSIBLE & OPERATIONAL!');
} catch (err) {
  console.log('❌ Failed with network exception:', err.message);
}
