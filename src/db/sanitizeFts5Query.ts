/**
 * Sanitize user input for FTS5 MATCH queries.
 *
 * FTS5 has special syntax for operators (AND, OR, NOT, NEAR, -, *, :, etc.)
 * If the user's query contains special characters but isn't using operators,
 * we quote it to avoid syntax errors.
 *
 * Examples:
 * - "safe-Parse" -> '"safe-Parse"' (quoted to prevent "-" being treated as NOT)
 * - "hello AND world" -> "hello AND world" (operators preserved)
 * - "hello" -> "hello" (no special chars, no change)
 * - '"exact phrase"' -> '"exact phrase"' (already quoted, no change)
 */
export function sanitizeFts5Query(query: string): string {
  // Already quoted - user knows what they want
  if (query.startsWith('"') && query.endsWith('"')) {
    return query;
  }

  // Contains FTS5 operators - user is using advanced syntax
  const hasOperators = /\b(AND|OR|NOT|NEAR)\b/i.test(query);
  if (hasOperators) {
    return query;
  }

  // Contains special FTS5 characters that could cause syntax errors
  // - : minus/NOT operator
  // * : prefix match
  // : : column filter
  // ^ : start-of-column match
  // ( ) : grouping
  // " : phrase delimiter
  const hasSpecialChars = /[-:^*()"]/.test(query);
  if (hasSpecialChars) {
    // Escape any quotes by doubling them, then wrap in quotes
    const escaped = query.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  // Simple query - no sanitization needed
  return query;
}
