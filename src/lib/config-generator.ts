import crypto from 'crypto';

// Base template exactly matching OpenWrt specification
const FIREWALL_BASE_TEMPLATE = `config defaults
    option syn_flood '1'
    option input 'REJECT'
    option output 'ACCEPT'
    option forward 'REJECT'
    option flow_offloading '1'
    option flow_offloading_hw '1'
    option fullcone '1'
    option fullcone6 '0'

config zone
    option name 'lan'
    option input 'ACCEPT'
    option output 'ACCEPT'
    option forward 'ACCEPT'
    list network 'lan'

config zone
    option name 'wan'
    option input 'REJECT'
    option output 'ACCEPT'
    option forward 'REJECT'
    option masq '1'
    option mtu_fix '1'
    list network 'wan'
    list network 'wan6'
    list network 'wanb'
    list network 'wanc'

config rule
    option name 'Allow-DHCP-Renew'
    option src 'wan'
    option proto 'udp'
    option dest_port '68'
    option target 'ACCEPT'
    option family 'ipv4'

config rule
    option name 'Allow-Ping'
    option src 'wan'
    option proto 'icmp'
    option icmp_type 'echo-request'
    option family 'ipv4'
    option target 'ACCEPT'

config rule
    option name 'Allow-IGMP'
    option src 'wan'
    option proto 'igmp'
    option family 'ipv4'
    option target 'ACCEPT'

config rule
    option name 'Allow-DHCPv6'
    option src 'wan'
    option proto 'udp'
    option dest_port '546'
    option target 'ACCEPT'
    option family 'ipv6'

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

config rule
    option name 'Allow-IPSec-ESP'
    option src 'wan'
    option dest 'lan'
    option proto 'esp'
    option target 'ACCEPT'

config rule
    option name 'Allow-ISAKMP'
    option src 'wan'
    option dest 'lan'
    option dest_port '500'
    option proto 'udp'
    option target 'ACCEPT'`;

export interface UserConfigInput {
  name: string;
  mac_address: string;
  is_no_internet?: boolean;
}

/**
 * Deterministically generates firewall configuration.
 * Groups with the 'no internet' tag have their member MAC addresses placed
 * in a dedicated 'Block No-Internet Access' firewall rule (target REJECT),
 * while permitted users are placed in 'Allow Internet Access' (target ACCEPT).
 * Users sorted by MAC address for complete reproducibility.
 */
export function generateFirewallConfig(users: UserConfigInput[]): string {
  const allowed = users.filter((u) => !u.is_no_internet);
  const blocked = users.filter((u) => Boolean(u.is_no_internet));

  const sortedAllowed = [...allowed].sort((a, b) => a.mac_address.localeCompare(b.mac_address));
  const sortedBlocked = [...blocked].sort((a, b) => a.mac_address.localeCompare(b.mac_address));

  let config = FIREWALL_BASE_TEMPLATE;

  // Dedicated firewall rule to block internet access for no-internet users
  if (sortedBlocked.length > 0) {
    config += `\n\nconfig rule\n    option name 'Block No-Internet Access'\n    option src 'lan'\n    option dest 'wan'\n    option target 'REJECT'`;
    for (const user of sortedBlocked) {
      config += `\n    list src_mac '${user.mac_address}'`;
    }
  }

  // Allowed internet access rule
  config += `\n\nconfig rule\n    option name 'Allow Internet Access'\n    option src 'lan'\n    option dest 'wan'\n    option target 'ACCEPT'`;
  for (const user of sortedAllowed) {
    config += `\n    list src_mac '${user.mac_address}'`;
  }

  config += `\n\nconfig forwarding\n    option src 'lan'\n    option dest 'wan'\n`;
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
