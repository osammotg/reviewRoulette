import { createHash } from "crypto";

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hashFingerprint(fingerprintToken: string, salt = ""): string {
  return sha256(`fp:${fingerprintToken}:${salt}`);
}

export function hashIp(ip: string, salt = ""): string {
  return sha256(`ip:${ip}:${salt}`);
}

/** Returns the last N chars of a UUID-style string, uppercased — used for short claim codes */
export function shortToken(token: string, length = 8): string {
  return token.replace(/-/g, "").slice(-length).toUpperCase();
}
