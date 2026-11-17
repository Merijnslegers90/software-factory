/** Whether a string has the shape of a hash from `hashPassword`: `scrypt.<salt>.<key>`. */
export function isPasswordHash(value: string | null | undefined): boolean;
/** A new scrypt hash for a password, with a random salt. Server-only. */
export function hashPassword(password: string): Promise<string>;
/** Whether the password belongs to the hash. A missing or malformed hash takes the same time and never matches. */
export function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean>;
