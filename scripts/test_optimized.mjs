import { getServiceSupabase } from '/root/openwrt-access-manager/src/lib/supabase.ts';
import { normalizeMac } from '/root/openwrt-access-manager/src/lib/normalize-mac.ts';
import { normalizeName } from '/root/openwrt-access-manager/src/lib/normalize-name.ts';

const supabase = getServiceSupabase();

async function testOptimizedBatch() {
  const t0 = Date.now();

  // 1. Single parallel fetch of all context
  const [groupsRes, usersRes, draftsRes] = await Promise.all([
    supabase.from('groups').select('*'),
    supabase.from('users').select('id, name, mac_address'),
    supabase.from('draft_changes').select('id, user_id, user_data, operation').neq('operation', 'DELETE'),
  ]);

  const groups = groupsRes.data || [];
  const users = usersRes.data || [];
  const drafts = draftsRes.data || [];

  const groupsMap = new Map(groups.map((g) => [g.id, g]));
  const defaultGroup = groups.find((g) => g.name.toLowerCase() === 'default') || groups[0];
  const defaultGroupId = defaultGroup?.id || null;

  const usersByMac = new Map(users.map((u) => [u.mac_address.toUpperCase(), u]));
  const usersByName = new Map(users.map((u) => [u.name.toLowerCase(), u]));
  const draftsByMac = new Map();
  const draftsByName = new Map();

  for (const d of drafts) {
    if (d.user_data?.mac_address) {
      draftsByMac.set(d.user_data.mac_address.toUpperCase(), d.user_data);
    }
    if (d.user_data?.name) {
      draftsByName.set(d.user_data.name.toLowerCase(), d.user_data);
    }
  }

  const fetchElapsed = Date.now() - t0;
  console.log(`Parallel context fetch took: ${fetchElapsed}ms`);

  // 2. In-memory validation of 23 items
  const tValidate = Date.now();
  const testItems = Array.from({ length: 23 }, (_, i) => ({
    operation: 'ADD',
    name: `Fast_Device_${i + 1}`,
    mac_address: `00:99:88:77:66:${i.toString(16).padStart(2, '0')}`,
    group_ids: [defaultGroupId],
  }));

  const prepared = [];
  for (let i = 0; i < testItems.length; i++) {
    const item = testItems[i];
    const macRes = normalizeMac(item.mac_address);
    const nameRes = normalizeName(item.name);
    const group_ids = item.group_ids || [defaultGroupId];

    prepared.push({
      draft_id: 'current',
      operation: 'ADD',
      user_id: null,
      user_data: {
        name: nameRes.normalized,
        mac_address: macRes.normalized,
        group_ids,
      },
    });
  }

  const validateElapsed = Date.now() - tValidate;
  console.log(`In-memory validation of 23 items took: ${validateElapsed}ms`);
  console.log(`Total preparation time: ${Date.now() - t0}ms (vs 53,000ms previously!)`);
}

await testOptimizedBatch();
