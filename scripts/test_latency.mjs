import { getServiceSupabase } from '/root/openwrt-access-manager/src/lib/supabase.ts';
import { resolveDefaultGroup, validateGroupCompatibility, checkSubadminProtection, checkMacConflict, checkNameConflict } from '/root/openwrt-access-manager/src/lib/draft-service.ts';

const session = { id: 'admin-id', username: 'admin', role: 'admin' };
const supabase = getServiceSupabase();

async function benchmark() {
  console.log('Testing 1 item validation time:');
  const t0 = Date.now();
  const resolved = await resolveDefaultGroup([], supabase, true);
  const compat = await validateGroupCompatibility(resolved, supabase, true);
  const subadmin = await checkSubadminProtection('ADD', resolved, undefined, session, supabase, true);
  const mac = await checkMacConflict('ADD', '00:11:22:33:44:55', undefined, supabase, true);
  const name = await checkNameConflict('ADD', 'Test_Device', undefined, supabase, true);
  const elapsed1 = Date.now() - t0;
  console.log(`1 item validation took: ${elapsed1}ms`);
  console.log(`Extrapolated for 23 items: ${(elapsed1 * 23) / 1000} seconds!`);
}

await benchmark();
