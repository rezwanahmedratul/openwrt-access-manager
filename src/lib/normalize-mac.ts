// ============================================================
// MAC Address Normalization
// ============================================================

/**
 * Normalize a MAC address to canonical format: XX:XX:XX:XX:XX:XX
 * Accepts various formats:
 *   0cf346f3cca9
 *   0c:f3:46:f3:cc:a9
 *   0C:F3:46:F3:CC:A9
 *   0c-f3-46-f3-cc-a9
 *   0C F3 46 F3 CC A9
 *   0cf3-46f3-cca9
 *   0cf3.46f3.cca9
 */
export function normalizeMac(input: string): { valid: boolean; normalized: string; error?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, normalized: '', error: 'MAC address is required' };
  }

  // Strip all common separators and whitespace
  const stripped = input.replace(/[\s:\-\.]/g, '').toUpperCase();

  // Must be exactly 12 hex characters
  if (!/^[0-9A-F]{12}$/.test(stripped)) {
    if (stripped.length !== 12) {
      return {
        valid: false,
        normalized: '',
        error: `MAC address must be 6 bytes (12 hex characters). Got ${stripped.length} hex characters.`,
      };
    }
    return {
      valid: false,
      normalized: '',
      error: 'MAC address contains invalid characters. Only hexadecimal (0-9, A-F) is allowed.',
    };
  }

  // Format as XX:XX:XX:XX:XX:XX
  const normalized = stripped.match(/.{2}/g)!.join(':');

  return { valid: true, normalized };
}

/**
 * Validate that a string is already in canonical MAC format
 */
export function isCanonicalMac(mac: string): boolean {
  return /^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/.test(mac);
}
