import { createHash, randomBytes } from "crypto";

/** A signing link token: 32 random bytes, base64url (43 characters, 256 bits). */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only a token shaped like ours reaches the database (base64url, 32 to 64 characters). */
export function tokenLooksValid(token: string | null | undefined): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{32,64}$/.test(token);
}

export function sha256Hex(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}
