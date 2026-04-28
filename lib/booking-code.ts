/**
 * Generates a unique booking code scoped to a tenant.
 * Format: <PREFIX>-<AAA>-<1234>
 *   PREFIX = first 3 alpha chars of tenant slug, uppercased (e.g. "RUK" for rukatraro)
 *   AAA    = 3 random uppercase letters (excluding ambiguous chars I/O)
 *   1234   = 4 random digits
 *
 * Examples:
 *   rukatraro → RUK-KVT-3821
 *   cacagual  → CAC-XNM-5047
 *   trinidad  → TRI-BPL-1293
 */
export function generateBookingCode(tenantSlug: string): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const prefix = tenantSlug
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X")
  const part1 = Array.from({ length: 3 }, () =>
    letters[Math.floor(Math.random() * letters.length)]
  ).join("")
  const part2 = Math.floor(1000 + Math.random() * 9000).toString()
  return prefix + "-" + part1 + "-" + part2
}
