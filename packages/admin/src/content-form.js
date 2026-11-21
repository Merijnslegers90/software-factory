// The rules of the form block (F-0020): a product describes the fields of one
// JSON file in its repo, and these functions read the file into values, check
// what was entered, and write the values back without touching other keys.
// Pure, so they can be tested without a browser (F-0006).

export const FIELD_TYPES = Object.freeze(['text', 'longtext', 'price', 'toggle', 'link', 'list']);

/** Throws when a field list is wrong, so a mistake shows up while building, not in use. */
export function checkFields(fields, where = 'fields') {
	if (!Array.isArray(fields) || fields.length === 0) {
		throw new Error(`content-form: ${where} must be a list of fields.`);
	}
	const keys = new Set();
	for (const field of fields) {
		if (!field?.key || typeof field.key !== 'string') {
			throw new Error(`content-form: a field in ${where} has no key.`);
		}
		if (keys.has(field.key)) throw new Error(`content-form: ${where}.${field.key} appears twice.`);
		keys.add(field.key);
		if (!FIELD_TYPES.includes(field.type)) {
			throw new Error(`content-form: ${where}.${field.key} has an unknown type: ${field.type}.`);
		}
		if (!field.label) throw new Error(`content-form: ${where}.${field.key} has no label.`);
		if (field.type === 'list') checkFields(field.fields, `${where}.${field.key}`);
		if (field.fixed && field.type !== 'list') {
			throw new Error(`content-form: ${where}.${field.key} is fixed, but only a list can be.`);
		}
	}
	return fields;
}

/** A price as entered (`4,50`, `4.5`, `€ 4,-`) as a number, or null. */
export function parsePrice(input) {
	if (typeof input === 'number') return Number.isFinite(input) && input >= 0 ? round(input) : null;
	if (typeof input !== 'string') return null;
	const clean = input
		.trim()
		.replace(/^€\s*/, '')
		.replace(/,-$/, '')
		.replace(',', '.');
	if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
	return round(Number(clean));
}

function round(n) {
	return Math.round(n * 100) / 100;
}

/** A price for a field: `4,50`, `12,00`. */
export function formatPrice(n) {
	return typeof n === 'number' && Number.isFinite(n) ? n.toFixed(2).replace('.', ',') : '';
}

/** A link: a path on the site (`/contact`), an anchor, or an http(s), mailto or tel address. */
export function isLink(value) {
	if (typeof value !== 'string' || value.trim() === '') return false;
	// A backslash or a space can turn a path into //host in a browser.
	if (/[\\\s\u0000-\u001f\u007f]/.test(value.replace(/^tel:[+\d][\d\s-]*$/i, ''))) return false;
	if (/^\/(?!\/)/.test(value) || value.startsWith('#')) return true;
	return /^(https?:\/\/[^\s]+|mailto:[^\s]+|tel:[+\d][\d\s-]*)$/i.test(value);
}

function emptyValue(field) {
	if (field.type === 'list') return [];
	if (field.type === 'toggle') return false;
	if (field.type === 'price') return null;
	return '';
}

/** A new, empty item for a list field. */
export function emptyItem(field) {
	return Object.fromEntries(field.fields.map((f) => [f.key, emptyValue(f)]));
}

function readValue(field, raw, path) {
	if (raw === undefined || raw === null) return { ok: true, value: emptyValue(field) };
	switch (field.type) {
		case 'text':
		case 'longtext':
		case 'link':
			return typeof raw === 'string' ? { ok: true, value: raw } : { ok: false, at: path };
		case 'toggle':
			return typeof raw === 'boolean' ? { ok: true, value: raw } : { ok: false, at: path };
		case 'price':
			return typeof raw === 'number' && raw >= 0 ? { ok: true, value: raw } : { ok: false, at: path };
		case 'list': {
			if (!Array.isArray(raw)) return { ok: false, at: path };
			const items = [];
			for (const [i, item] of raw.entries()) {
				const read = readObject(field.fields, item, `${path}.${i}`);
				if (!read.ok) return read;
				items.push(read.values);
			}
			return { ok: true, value: items };
		}
	}
}

function readObject(fields, data, prefix, { strict = true } = {}) {
	if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, at: prefix };
	// Inside a list item a key the fields do not name would be lost on saving,
	// so it counts as a mismatch. At the top of the file such keys are kept.
	if (strict) {
		const known = new Set(fields.map((f) => f.key));
		const extra = Object.keys(data).find((key) => !known.has(key));
		if (extra) return { ok: false, at: prefix ? `${prefix}.${extra}` : extra };
	}
	const values = {};
	for (const field of fields) {
		const path = prefix ? `${prefix}.${field.key}` : field.key;
		const read = readValue(field, data[field.key], path);
		if (!read.ok) return read;
		values[field.key] = read.value;
	}
	return { ok: true, values };
}

/**
 * The values of the fields from the file's data. A file that no longer
 * matches the fields gives `{ ok: false, problem: 'mismatch', at }`, so the
 * form can refuse instead of overwriting what it does not understand.
 */
export function valuesFromFile(fields, data) {
	const read = readObject(fields, data, '', { strict: false });
	return read.ok ? read : { ok: false, problem: 'mismatch', at: read.at || '(file)' };
}

function checkValue(field, input, path, errors) {
	let raw = input;
	const required = field.required === true;
	switch (field.type) {
		case 'text':
		case 'longtext': {
			if (raw === undefined || raw === null) raw = '';
			if (typeof raw !== 'string') return void errors.push([path, 'not-text']);
			const text = field.type === 'text' ? raw.trim() : raw.replace(/\r\n/g, '\n').trim();
			if (required && text === '') return void errors.push([path, 'required']);
			if (field.maxLength && text.length > field.maxLength) {
				return void errors.push([path, 'too-long']);
			}
			return text;
		}
		case 'link': {
			const text = typeof raw === 'string' ? raw.trim() : '';
			if (text === '') return required ? void errors.push([path, 'required']) : '';
			return isLink(text) ? text : void errors.push([path, 'not-a-link']);
		}
		case 'toggle':
			return raw === true || raw === 'on' || raw === 'true';
		case 'price': {
			if (raw === null || raw === undefined || raw === '') {
				return required ? void errors.push([path, 'required']) : null;
			}
			const price = parsePrice(raw);
			return price === null ? void errors.push([path, 'not-a-price']) : price;
		}
		case 'list': {
			if (!Array.isArray(raw)) return void errors.push([path, 'not-a-list']);
			if (field.min !== undefined && raw.length < field.min) errors.push([path, 'too-few']);
			if (field.max !== undefined && raw.length > field.max) errors.push([path, 'too-many']);
			return raw.map((item, i) => checkObject(field.fields, item, `${path}.${i}`, errors));
		}
	}
}

function checkObject(fields, data, prefix, errors) {
	const source = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
	return Object.fromEntries(
		fields.map((field) => {
			const path = prefix ? `${prefix}.${field.key}` : field.key;
			return [field.key, checkValue(field, source[field.key], path, errors)];
		})
	);
}

/**
 * Checks what was entered. Gives the cleaned values (text trimmed, prices as
 * numbers), or the errors per field path, such as `kaarten.0.prijs`.
 */
export function checkValues(fields, input) {
	let data = input;
	if (typeof input === 'string') {
		try {
			data = JSON.parse(input);
		} catch {
			return { ok: false, errors: { '': 'not-readable' } };
		}
	}
	if (!data || typeof data !== 'object' || Array.isArray(data)) {
		return { ok: false, errors: { '': 'not-readable' } };
	}
	const errors = [];
	const values = checkObject(fields, data, '', errors);
	return errors.length === 0 ? { ok: true, values } : { ok: false, errors: Object.fromEntries(errors) };
}

/** The file's data with the fields' values put in; other keys stay as they were. */
export function mergeIntoFile(data, fields, values) {
	const base = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
	const merged = { ...base };
	for (const field of fields) merged[field.key] = values[field.key];
	return merged;
}

/** The text of a JSON file as the form writes it: tabs and a final new line. */
export function fileContent(data) {
	return `${JSON.stringify(data, null, '\t')}\n`;
}

/**
 * The values as the form shows them: a price as text (`4,50`), so the person
 * types in the same form they read. checkValues turns it back into a number.
 */
export function toFormValues(fields, values) {
	return Object.fromEntries(
		fields.map((field) => {
			const value = values?.[field.key];
			if (field.type === 'price') return [field.key, formatPrice(value)];
			if (field.type === 'list') {
				return [field.key, (value ?? []).map((item) => toFormValues(field.fields, item))];
			}
			return [field.key, value ?? emptyValue(field)];
		})
	);
}

/**
 * True when every list marked `fixed` has as many items as before, at every
 * level. A fixed list can be changed but not grown, shrunk or reordered from
 * the admin; the server checks it, because the browser can be changed.
 */
export function fixedListsKept(fields, before, after) {
	for (const field of fields) {
		if (field.type !== 'list') continue;
		const a = before?.[field.key] ?? [];
		const b = after?.[field.key] ?? [];
		if (field.fixed && a.length !== b.length) return false;
		const n = Math.min(a.length, b.length);
		for (let i = 0; i < n; i++) if (!fixedListsKept(field.fields, a[i], b[i])) return false;
	}
	return true;
}
