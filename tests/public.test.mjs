import { test } from 'node:test';
import assert from 'node:assert/strict';
import { textFiles } from './files.mjs';

// This repo is public. It holds the way of building, never data about a
// company, a customer or a person involved, and never a key (F-0001).
const FORBIDDEN = [
	['an Anthropic API key', /sk-ant-[\w-]{10,}/],
	['a Resend API key', /\bre_[A-Za-z0-9]{16,}/],
	['a Mollie API key', /\b(?:live|test)_[A-Za-z0-9]{25,}/],
	['a GitHub token', /\b(?:ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}/],
	['a JWT, such as a Supabase key', /eyJ[\w-]{15,}\.eyJ[\w-]{15,}/],
	['the address of a Supabase project', /\b[a-z0-9]{20}\.supabase\.co\b/],
	['a database connection with a password', /postgres(?:ql)?:\/\/[^\s:/]+:[^\s@]+@/],
	['an email address', /[\w.+-]+@[\w-]+\.[a-z]{2,}/i],
	['a phone number', /\+31[\s\d]{9,}/],
	['a Dutch VAT number', /\bNL\d{9}B\d{2}\b/],
	['a Dutch Chamber of Commerce number', /\bKVK\W{0,3}\d{8}\b/i]
];

const files = textFiles();

for (const [what, pattern] of FORBIDDEN) {
	test(`no ${what}`, () => {
		const found = files.filter((f) => pattern.test(f.text)).map((f) => f.name);
		assert.deepEqual(found, []);
	});
}

test('no em dashes', () => {
	const found = files.filter((f) => f.text.includes('\u2014')).map((f) => f.name);
	assert.deepEqual(found, []);
});
