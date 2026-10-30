// Reads the command line and the environment of run-migrations. Pure, so the
// rules of F-0003 (when to run, which connection) are tested without a
// database.

/** The variables a connection can come from, in order. Vercel's integrations create the last three. */
export const CONNECTION_VARIABLES = [
	'SUPABASE_DB_URL',
	'POSTGRES_URL_NON_POOLING',
	'POSTGRES_URL',
	'DATABASE_URL'
];

export function parseOptions(argv, env) {
	const options = { dir: 'supabase/migrations', allowWithoutDatabase: false };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--dir') options.dir = argv[++i];
		else if (arg.startsWith('--dir=')) options.dir = arg.slice('--dir='.length);
		else if (arg === '--allow-without-database') options.allowWithoutDatabase = true;
		else throw new Error(`[migrations] Unknown option: ${arg}`);
	}
	if (!options.dir) throw new Error('[migrations] --dir needs a folder.');

	// Only on a production deploy, or when asked for explicitly.
	options.shouldRun = env.RUN_MIGRATIONS === '1' || env.VERCEL_ENV === 'production';

	const name = CONNECTION_VARIABLES.find((n) => env[n]);
	options.connection = name ? { name, value: env[name] } : null;
	return options;
}

/** user@host/database, never the password, for the build log. */
export function describeConnection(value) {
	try {
		const url = new URL(value);
		return `${url.username}@${url.host}${url.pathname}`;
	} catch {
		return '(could not parse the connection string)';
	}
}
