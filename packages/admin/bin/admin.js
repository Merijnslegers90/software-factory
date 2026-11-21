#!/usr/bin/env node
// Makes a line for ADMIN_USERS (F-0020):
//
//   npx @merijnslegers/admin hash <email>
//
// Asks for the password twice without showing it, and prints
// `<email>:<hash>`. Without a terminal (a pipe), it reads one line from stdin.
// The password itself is never printed and never stored.

import { createInterface } from 'node:readline';
import { hashPassword } from '../src/password.js';
import { normaliseEmail, passwordProblem, PASSWORD_MIN_LENGTH } from '../src/rules.js';

const [command, rawEmail] = process.argv.slice(2);
const email = normaliseEmail(rawEmail);

if (command !== 'hash' || !email.includes('@')) {
	console.error('Use: npx @merijnslegers/admin hash <email>');
	process.exit(1);
}

/** Reads one line; on a terminal without showing what is typed. */
function ask(question) {
	return new Promise((resolve) => {
		const input = process.stdin;
		if (!input.isTTY) {
			const lines = createInterface({ input });
			lines.once('line', (line) => {
				resolve(line);
				lines.close();
			});
			lines.once('close', () => resolve(''));
			return;
		}
		process.stderr.write(question);
		input.setRawMode(true);
		input.resume();
		input.setEncoding('utf8');
		let value = '';
		const onData = (chunk) => {
			for (const char of chunk) {
				if (char === '\r' || char === '\n') {
					input.setRawMode(false);
					input.pause();
					input.off('data', onData);
					process.stderr.write('\n');
					resolve(value);
					return;
				}
				if (char === '\u0003') process.exit(130);
				if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
				else value += char;
			}
		};
		input.on('data', onData);
	});
}

const password = await ask('Password: ');
const repeat = process.stdin.isTTY ? await ask('Again: ') : password;
const problem = passwordProblem(password, repeat);
if (problem === 'password_too_short') {
	console.error(`The password needs at least ${PASSWORD_MIN_LENGTH} characters.`);
	process.exit(1);
}
if (problem === 'passwords_differ') {
	console.error('The two passwords differ.');
	process.exit(1);
}

console.log(`${email}:${await hashPassword(password)}`);
