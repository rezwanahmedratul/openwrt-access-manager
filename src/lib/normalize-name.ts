// ============================================================
// Name Normalization
// ============================================================

/**
 * Normalizes user names according to application rules:
 * - Leading/trailing whitespace trimmed
 * - Multiple contiguous whitespace replaced with single underscore
 * - Hyphens preserved (e.g. TP-Link-Anik)
 * - Words capitalized appropriately if lowercase or mixed, or preserving hyphens and underscores
 * - Disallowed special characters removed/cleaned
 * 
 * Examples:
 *   "ratul" -> "Ratul"
 *   "ratul ahmed" -> "Ratul_Ahmed"
 *   "RATUL AHMED" -> "Ratul_Ahmed"
 *   "  ratul   ahmed  " -> "Ratul_Ahmed"
 *   "TP-Link-Anik" -> "TP-Link-Anik"
 *   "D-Link-Salman" -> "D-Link-Salman"
 */
export function normalizeName(input: string): { valid: boolean; normalized: string; error?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, normalized: '', error: 'Name is required' };
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { valid: false, normalized: '', error: 'Name cannot be empty' };
  }

  // Split into whitespace tokens
  const tokens = trimmed.split(/\s+/);

  const formattedTokens = tokens.map((token) => {
    // Preserve hyphens within token, e.g. TP-Link-Anik
    const hyphenParts = token.split('-');
    const formattedHyphenParts = hyphenParts.map((sub) => {
      // Also handle underscores inside
      const underscoreParts = sub.split('_');
      const formattedUnderscoreParts = underscoreParts.map((part) => {
        // Strip out any characters not alphanumeric or basic allowable characters
        const clean = part.replace(/[^a-zA-Z0-9]/g, '');
        if (!clean) return '';
        // If entirely uppercase and longer than 1 char, capitalize nicely (e.g. RATUL -> Ratul),
        // except known acronyms or mixed case: let's do Title Case if all uppercase or all lowercase
        if (clean === clean.toUpperCase() && clean.length > 2) {
          return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
        }
        if (clean === clean.toLowerCase()) {
          return clean.charAt(0).toUpperCase() + clean.slice(1);
        }
        // If mixed case (like TP or Mi or Archer or iPhone), preserve capitalization
        return clean;
      });
      return formattedUnderscoreParts.filter(Boolean).join('_');
    });
    return formattedHyphenParts.join('-');
  });

  const normalized = formattedTokens.filter(Boolean).join('_');

  if (!normalized) {
    return { valid: false, normalized: '', error: 'Name contains no valid alphanumeric characters' };
  }

  return { valid: true, normalized };
}
