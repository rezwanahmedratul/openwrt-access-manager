import { getServiceSupabase } from '/root/openwrt-access-manager/src/lib/supabase.ts';
import { parseImportText } from '/root/openwrt-access-manager/src/lib/csv-import.ts';

const csvData = `Name,MAC Address,Status,Groups
"Aria2","BC:24:11:D9:EE:B7","applied","Server"
"Bourani","B0:A1:87:8E:18:07","applied","Default"
"Build_Server","BC:24:11:43:38:E2","applied","Server"
"Docker","BC:24:11:12:DF:A3","applied","Server"
"Github_Action_Runner","BC:24:11:B5:BD:ED","applied","Server"
"Jarin","C8:9B:D7:F6:B6:77","applied","Default"
"Newt","BC:24:11:41:F7:42","applied","Server"
"Proxmox","FC:AA:14:6A:51:E0","applied","Server"
"Ratul_Laptop","E4:C7:67:52:6A:7F","applied","Main"
"Ratul_Phone","6C:00:6B:25:5B:B3","applied","Main"
"Sa-V","78:DB:5C:30:80:FC","applied","Default"
"Sadia","2C:BE:EE:18:A4:56","applied","Default"
"Sagor_Vaiyaa","1C:9F:4E:9D:1E:CC","applied","Default"
"Sarna_Apu","18:4E:CB:5E:24:CD","applied","Default"
"Sayem_Vaiyaa","48:79:4D:93:7F:07","applied","Default"
"Sh","48:02:86:29:3D:B9","applied","Default"
"Sh-C","38:38:4B:AB:6D:5C","applied","Default"
"Sh-Iv","94:54:CE:52:24:F1","applied","Default"
"Sh-V","BC:91:B5:76:C2:FA","applied","Default"
"Shimanto","48:2C:A0:6A:9A:52","applied","Main"
"Shimanto_PC","04:7C:16:3E:84:FD","applied","Main"
"Suwayomi","BC:24:11:79:EB:FC","applied","Server"
"Vpn_Router","BC:24:11:F9:91:0E","applied","Routers"`;

async function run() {
  const supabase = getServiceSupabase();
  const { data: groups } = await supabase.from('groups').select('*');
  const { data: users } = await supabase.from('users').select('*');

  console.log(`Available groups in DB (${groups.length}):`, groups.map(g => g.name).join(', '));
  console.log(`Existing users in DB: ${users.length}`);

  const parsed = parseImportText(csvData, users || [], groups || []);
  console.log(`Parsed ${parsed.length} items from user CSV.`);
  console.log(`Sample item 0 groups:`, parsed[0].groups.map(g => g.name), 'groupIds:', parsed[0].groupIds);

  // Check pending draft_changes currently in DB
  const { data: drafts } = await supabase.from('draft_changes').select('*');
  console.log(`Pending drafts in DB: ${drafts ? drafts.length : 0}`);
}

await run();
