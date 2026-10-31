// The prettier settings every product shares (F-0002). A project's
// prettier.config.js spreads this and adds what is its own, such as the
// stylesheet for the Tailwind plugin:
//
//   import config from '@merijnslegers/config/prettier';
//   export default { ...config, tailwindStylesheet: './src/app.css' };
export default {
	useTabs: true,
	singleQuote: true,
	trailingComma: 'none',
	printWidth: 100,
	plugins: ['prettier-plugin-svelte', 'prettier-plugin-tailwindcss'],
	overrides: [
		{
			files: '*.svelte',
			options: {
				parser: 'svelte'
			}
		}
	]
};
