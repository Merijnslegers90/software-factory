// The eslint settings every product shares (F-0002). A project's
// eslint.config.js calls this and can add its own blocks after it:
//
//   import path from 'node:path';
//   import factory from '@merijnslegers/config/eslint';
//   import svelteConfig from './svelte.config.js';
//
//   export default factory({
//     gitignorePath: path.resolve(import.meta.dirname, '.gitignore'),
//     svelteConfig
//   });
import prettier from 'eslint-config-prettier';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

export default function factoryEslint({ gitignorePath, svelteConfig }) {
	return defineConfig(
		includeIgnoreFile(gitignorePath),
		js.configs.recommended,
		ts.configs.recommended,
		svelte.configs.recommended,
		prettier,
		svelte.configs.prettier,
		{
			languageOptions: { globals: { ...globals.browser, ...globals.node } },
			rules: {
				// typescript-eslint advises against no-undef in TypeScript projects:
				// the type checker already catches undefined names.
				'no-undef': 'off',

				// This rule wants every href to go through resolve(). That is for
				// sites under a base path; our products run at the root of their
				// domain and set no paths.base.
				'svelte/no-navigation-without-resolve': 'off'
			}
		},
		{
			files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
			languageOptions: {
				parserOptions: {
					projectService: true,
					extraFileExtensions: ['.svelte'],
					parser: ts.parser,
					svelteConfig
				}
			}
		}
	);
}
