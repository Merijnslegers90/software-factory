import type { Linter } from 'eslint';

export interface FactoryEslintOptions {
	/** Absolute path to the project's .gitignore; ignored files are not linted. */
	gitignorePath: string;
	/**
	 * The project's Svelte settings, for linting .svelte files with types.
	 * Leave it out to load them from vite.config.ts with @sveltejs/load-config.
	 */
	svelteConfig?: unknown;
}

export default function factoryEslint(options: FactoryEslintOptions): Promise<Linter.Config[]>;
