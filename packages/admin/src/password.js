// Passwords for the HTTP Basic login (F-0020), hashed with scrypt from
// node:crypto, so no extra dependency. Server-only.
//
// A hash looks like `scrypt.<salt>.<key>`, both in base64url. It has no `$`,
// so a .env file never reads part of it as a variable. The cost is fixed
// here; a stronger cost later gets a new prefix, and old lines keep working.

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { isPasswordHash } from './rules.js';

export { isPasswordHash };

const PREFIX = 'scrypt';
const KEY_LENGTH = 32;
const COST = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function derive(password, salt) {
	return new Promise((resolve, reject) => {
		scrypt(String(password).normalize('NFC'), salt, KEY_LENGTH, COST, (error, key) =>
			error ? reject(error) : resolve(key)
		);
	});
}

/** A new hash for a password, with a random salt. */
export async function hashPassword(password) {
	const salt = randomBytes(16);
	const key = await derive(password, salt);
	return [PREFIX, salt.toString('base64url'), key.toString('base64url')].join('.');
}

// Checked when an address is not on the list, so a wrong address takes as
// long as a wrong password and the answer time gives away nothing.
const DUMMY = `${PREFIX}.${'A'.repeat(22)}.${'A'.repeat(43)}`;

/**
 * Whether the password belongs to the hash. A hash that is missing or has the
 * wrong shape is checked against a dummy, so it costs the same time, and
 * never matches.
 */
export async function verifyPassword(password, hash) {
	const valid = isPasswordHash(hash);
	const [, salt, key] = (valid ? hash : DUMMY).split('.');
	const expected = Buffer.from(key, 'base64url');
	const actual = await derive(password, Buffer.from(salt, 'base64url'));
	return valid && expected.length === actual.length && timingSafeEqual(expected, actual);
}
