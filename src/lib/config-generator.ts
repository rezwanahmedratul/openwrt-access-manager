import crypto from 'crypto';

/**
 * Base firewall rules template exactly matching the OpenWrt firewall configuration specification.
 */
const FIREWALL_BASE_TEMPLATE = `config defaults
	option input 'REJECT'
	option output 'ACCEPT'
	option forward 'REJECT'
	option flow_offloading '1'
	option flow_offloading_hw '1'
	option fullcone '1'
	option synflood_protect '1'

config zone
	option name 'lan'
	option input 'ACCEPT'
	option output 'ACCEPT'
	option forward 'ACCEPT'
	list network 'lan'

config rule
	option name 'Allow-DHCP-Renew'
	option src 'wan'
	option proto 'udp'
	option dest_port '68'
	option target 'ACCEPT'
	option family 'ipv4'
	option enabled '1'

config rule
	option name 'Allow-Ping'
	option src 'wan'
	option proto 'icmp'
	option icmp_type 'echo-request'
	option family 'ipv4'
	option target 'ACCEPT'
	option enabled '1'

config rule
	option name 'Allow-IGMP'
	option src 'wan'
	option proto 'igmp'
	option family 'ipv4'
	option target 'ACCEPT'
	option enabled '1'

config rule
	option name 'Allow-DHCPv6'
	option src 'wan'
	option proto 'udp'
	option dest_port '546'
	option family 'ipv6'
	option target 'ACCEPT'
	option enabled '1'

config rule
	option name 'Allow-MLD'
	option src 'wan'
	option proto 'icmp'
	option src_ip 'fe80::/10'
	list icmp_type '130/0'
	list icmp_type '131/0'
	list icmp_type '132/0'
	list icmp_type '143/0'
	option family 'ipv6'
	option target 'ACCEPT'
	option enabled '1'

config rule
	option name 'Allow-ICMPv6-Input'
	option src 'wan'
	option proto 'icmp'
	list icmp_type 'echo-request'
	list icmp_type 'echo-reply'
	list icmp_type 'destination-unreachable'
	list icmp_type 'packet-too-big'
	list icmp_type 'time-exceeded'
	list icmp_type 'bad-header'
	list icmp_type 'unknown-header-type'
	list icmp_type 'router-solicitation'
	list icmp_type 'neighbour-solicitation'
	list icmp_type 'router-advertisement'
	list icmp_type 'neighbour-advertisement'
	option limit '1000/sec'
	option family 'ipv6'
	option target 'ACCEPT'
	option enabled '1'

config rule
	option name 'Allow-ICMPv6-Forward'
	option src 'wan'
	option dest '*'
	option proto 'icmp'
	list icmp_type 'echo-request'
	list icmp_type 'echo-reply'
	list icmp_type 'destination-unreachable'
	list icmp_type 'packet-too-big'
	list icmp_type 'time-exceeded'
	list icmp_type 'bad-header'
	list icmp_type 'unknown-header-type'
	option limit '1000/sec'
	option family 'ipv6'
	option target 'ACCEPT'
	option enabled '1'

config rule
	option name 'Allow-IPSec-ESP'
	option src 'wan'
	option dest 'lan'
	option proto 'esp'
	option target 'ACCEPT'
	option enabled '1'

config rule
	option name 'Allow-ISAKMP'
	option src 'wan'
	option dest 'lan'
	option dest_port '500'
	option proto 'udp'
	option target 'ACCEPT'
	option enabled '1'

config zone
	option name 'wan'
	option input 'REJECT'
	option output 'ACCEPT'
	option forward 'DROP'
	option masq '1'
	option mtu_fix '1'
	list network 'wan'
	list network 'wan6'`;

export interface UserConfigInput {
  name: string;
  mac_address: string;
  is_no_internet?: boolean;
}

/**
 * Deterministically generates firewall configuration.
 * - Allowed users are added to "Allow Internet Access" (target ACCEPT, proto all).
 * - No-Internet tagged users are added to "Block Internet" (target DROP, proto all).
 * - Forwarding section:
 *    - When macAuthEnabled is true (MAC authentication ON): forwarding section is removed completely
 *    - When macAuthEnabled is false (MAC authentication OFF): config forwarding src 'lan' dest 'wan' is added
 * Users sorted by MAC address for complete reproducibility.
 */
export function generateFirewallConfig(users: UserConfigInput[], macAuthEnabled: boolean = true): string {
  const allowed = users.filter((u) => !u.is_no_internet);
  const blocked = users.filter((u) => Boolean(u.is_no_internet));

  const sortedAllowed = [...allowed].sort((a, b) => a.mac_address.localeCompare(b.mac_address));
  const sortedBlocked = [...blocked].sort((a, b) => a.mac_address.localeCompare(b.mac_address));

  let config = FIREWALL_BASE_TEMPLATE;

  // Blocked internet access rule (evaluated first: explicit DROP takes priority)
  if (sortedBlocked.length > 0) {
    config += `\n\nconfig rule\n\toption src 'lan'\n\toption dest 'wan'\n\toption name 'Block Internet'\n\toption target 'DROP'\n\toption enabled '1'\n\tlist proto 'all'`;
    for (const user of sortedBlocked) {
      config += `\n\tlist src_mac '${user.mac_address}'`;
    }
  }

  // Allowed internet access rule
  config += `\n\nconfig rule\n\toption src 'lan'\n\toption dest 'wan'\n\toption name 'Allow Internet Access'\n\toption target 'ACCEPT'\n\toption enabled '1'\n\tlist proto 'all'`;
  for (const user of sortedAllowed) {
    config += `\n\tlist src_mac '${user.mac_address}'`;
  }

  // Forwarding section:
  // Turning on MAC authentication removes 'config forwarding' entirely (nothing is added).
  // Turning off MAC authentication adds 'config forwarding' with src 'lan' and dest 'wan'.
  if (!macAuthEnabled) {
    config += `\n\nconfig forwarding\n\toption src 'lan'\n\toption dest 'wan'`;
  }

  config += `\n`;
  return config;
}

/**
 * Deterministically generates ethers configuration
 * Format: MAC_ADDRESS NAME
 * Users sorted deterministically by normalized name, then MAC.
 */
export function generateEthersConfig(users: UserConfigInput[]): string {
  const sorted = [...users].sort((a, b) => {
    const nameCmp = a.name.localeCompare(b.name);
    if (nameCmp !== 0) return nameCmp;
    return a.mac_address.localeCompare(b.mac_address);
  });

  const lines = sorted.map((u) => `${u.mac_address} ${u.name}`);
  return lines.length > 0 ? lines.join('\n') + '\n' : '';
}

/**
 * Compute sha256 hash of configuration (combined deterministic representation)
 */
export function computeConfigHash(firewallContent: string, ethersContent: string): string {
  const combined = `firewall:\n${firewallContent}\n---\nethers:\n${ethersContent}`;
  return crypto.createHash('sha256').update(combined, 'utf8').digest('hex');
}
