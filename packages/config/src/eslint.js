// The eslint settings every product shares (F-0010). A project's
// eslint.config.js calls this and can add its own blocks after it:
//
//   import path from 'node:path';
//   import factory from '@merijnslegers/config/eslint';
//
//   export default factory({
//     gitignorePath: path.resolve(import.meta.dirname, '.gitignore')
//   });
//
// Since SvelteKit 3 the Svelte settings live in vite.config.ts, which eslint
// cannot import by itself. Without svelteConfig this function loads them with
// @sveltejs/load-config, from the folder that holds the .gitignore.
import path from 'node:path';
import prettier from 'eslint-config-prettier';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

export default async function factoryEslint({ gitignorePath, svelteConfig }) {
	svelteConfig ??= await loadSvelteConfig(path.dirname(gitignorePath));

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

async function loadSvelteConfig(root) {
	let loadConfig;
	try {
		({ loadConfig } = await import('@sveltejs/load-config'));
	} catch {
		throw new Error(
			'@merijnslegers/config/eslint: install @sveltejs/load-config, or pass svelteConfig.'
		);
	}
	const loaded = await loadConfig(root, { traverse: false });
	if (!loaded) {
		throw new Error(`@merijnslegers/config/eslint: no vite.config or svelte.config in ${root}.`);
	}
	if ('error' in loaded) throw loaded.error;
	return loaded.config;
}
