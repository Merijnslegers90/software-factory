export type FieldType = 'text' | 'longtext' | 'price' | 'toggle' | 'link' | 'list';

/** One field of the form, filling the key of the same name in the JSON file. */
export interface Field {
	key: string;
	type: FieldType;
	/** What the person sees, such as `Prijs`. */
	label: string;
	/** A line under the field, such as `In euro's, bijvoorbeeld 4,50`. */
	hint?: string;
	required?: boolean;
	/** `text` and `longtext`. */
	maxLength?: number;
	/** `list`: the fields of each item. */
	fields?: Field[];
	/** `list`: what one item is called, such as `Prijsregel`. */
	itemLabel?: string;
	/** `list`: the field whose value names an item in the form. */
	titleKey?: string;
	/** `list`: items can be changed, but not added, removed or moved. */
	fixed?: boolean;
	/** `list`. */
	min?: number;
	max?: number;
}

export type Values = Record<string, unknown>;

/** Field path such as `kaarten.0.prijs` to an error code. */
export type FieldErrors = Record<string, FieldError>;

export type FieldError =
	| 'required'
	| 'too-long'
	| 'not-text'
	| 'not-a-price'
	| 'not-a-link'
	| 'not-a-list'
	| 'too-few'
	| 'too-many'
	| 'not-readable'
	| 'fixed-list';

export const FIELD_TYPES: readonly FieldType[];
export function checkFields(fields: Field[], where?: string): Field[];
export function parsePrice(input: unknown): number | null;
export function formatPrice(n: unknown): string;
export function isLink(value: unknown): boolean;
export function emptyItem(field: Field): Values;
export function valuesFromFile(
	fields: Field[],
	data: unknown
): { ok: true; values: Values } | { ok: false; problem: 'mismatch'; at: string };
export function checkValues(
	fields: Field[],
	input: unknown
): { ok: true; values: Values } | { ok: false; errors: FieldErrors };
export function mergeIntoFile(data: unknown, fields: Field[], values: Values): Record<string, unknown>;
export function fileContent(data: unknown): string;
export function toFormValues(fields: Field[], values: Values | null | undefined): Values;
export function fixedListsKept(fields: Field[], before: Values | null | undefined, after: Values): boolean;
