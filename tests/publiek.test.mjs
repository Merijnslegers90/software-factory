import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tekstbestanden } from './bestanden.mjs';

// Deze repo is publiek. Hier staat de manier van bouwen, nooit gegevens van een
// bedrijf, een klant of een betrokkene, en nooit een sleutel (F-0001).
const VERBODEN = [
	['een API-sleutel van Anthropic', /sk-ant-[\w-]{10,}/],
	['een API-sleutel van Resend', /\bre_[A-Za-z0-9]{16,}/],
	['een API-sleutel van Mollie', /\b(?:live|test)_[A-Za-z0-9]{25,}/],
	['een token van GitHub', /\b(?:ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}/],
	['een JWT, zoals een sleutel van Supabase', /eyJ[\w-]{15,}\.eyJ[\w-]{15,}/],
	['het adres van een Supabase-project', /\b[a-z0-9]{20}\.supabase\.co\b/],
	['een databaseverbinding met wachtwoord', /postgres(?:ql)?:\/\/[^\s:/]+:[^\s@]+@/],
	['een e-mailadres', /[\w.+-]+@[\w-]+\.[a-z]{2,}/i],
	['een telefoonnummer', /\+31[\s\d]{9,}/],
	['een btw-nummer', /\bNL\d{9}B\d{2}\b/],
	['een KVK-nummer', /\bKVK\W{0,3}\d{8}\b/i]
];

const bestanden = tekstbestanden();

for (const [wat, patroon] of VERBODEN) {
	test(`geen ${wat}`, () => {
		const gevonden = bestanden.filter((b) => patroon.test(b.tekst)).map((b) => b.naam);
		assert.deepEqual(gevonden, []);
	});
}

test('geen gedachtestreepjes', () => {
	const gevonden = bestanden.filter((b) => b.tekst.includes('\u2014')).map((b) => b.naam);
	assert.deepEqual(gevonden, []);
});
