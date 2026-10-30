import type { Linter } from 'eslint';

export interface FactoryEslintOptions {
	/** Absolute path to the project's .gitignore; ignored files are not linted. */
	gitignorePath: string;
	/** The project's svelte.config.js, for linting .svelte files with types. */
	svelteConfig: unknown;
}

export default function factoryEslint(options: FactoryEslintOptions): Linter.Config[];
