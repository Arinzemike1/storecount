export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Short, unambiguous receipt reference, e.g. "SC-7K4M9Q". */
export function createSaleRef(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let ref = "";
  const random = crypto.getRandomValues(new Uint8Array(6));
  for (const byte of random) {
    ref += alphabet[byte % alphabet.length];
  }
  return `SC-${ref}`;
}
