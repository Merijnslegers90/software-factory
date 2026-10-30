export interface MigrationProblem {
	/** The migration file. */
	file: string;
	/** The table it creates, lower case and without schema. */
	table: string;
	/** What is missing below its `create table`. */
	missing: 'grant' | 'rls';
}

export interface CheckOptions {
	/** Only check grants in files whose name sorts after this one. */
	grantsAfter?: string;
	/** Only check RLS in files whose name sorts after this one. */
	rlsAfter?: string;
}

export function createdTables(sql: string): string[];
export function grantsServiceRole(sql: string, table: string): boolean;
export function enablesRls(sql: string, table: string): boolean;
export function checkMigrations(dir: string, options?: CheckOptions): MigrationProblem[];
