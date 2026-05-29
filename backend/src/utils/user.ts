/**
 * Derive uppercase initials from a full name.
 * "Jane Doe" -> "JD", "madonna" -> "M", "Mary Jane Watson" -> "MW".
 */
export function deriveInitials(fullName: string): string {
  const parts = (fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return `${first}${last}`.toUpperCase();
}

const ALPHABETIC_NAME_PATTERN = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
const PROPER_NAME_PATTERN = /^[A-Z][a-z]+(?: [A-Z][a-z]+)*$/;

export function formatProperName(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function isValidProperName(name: string): boolean {
  const trimmed = name.trim();
  return ALPHABETIC_NAME_PATTERN.test(trimmed) && PROPER_NAME_PATTERN.test(trimmed);
}

/** Resolve display name from Supabase user_metadata (invite / OAuth). */
export function extractFullNameFromMetadata(
  metadata: Record<string, unknown>,
  email: string
): string {
  const fromMeta =
    (metadata.full_name as string) ||
    (metadata.display_name as string) ||
    (metadata.name as string);

  if (fromMeta?.trim()) {
    return formatProperName(fromMeta);
  }

  return email ? email.split('@')[0] : 'New User';
}
