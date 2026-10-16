const RELATIONSHIP_PREFIX = /^\s*(?:s\s*\/\s*o|w\s*\/\s*o|d\s*\/\s*o|c\s*\/\s*o|son\s+of|wife\s+of|daughter\s+of|care\s+of)\s*[:.,-]?\s*/i;

export function nameWithoutRelationshipPrefix(value: unknown): string {
  return String(value ?? '').replace(RELATIONSHIP_PREFIX, '').trim();
}
