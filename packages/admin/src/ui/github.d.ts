import type { Component } from 'svelte';
import type { Field } from '../content-form.js';
import type { ContentFormData, ProposalsData, SaveResult } from '../content-form-server.js';
import type { FORM_TEXT as FormText, PROPOSALS_TEXT as ProposalsText } from './text.js';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? Partial<T[K]> : T[K] };

export const AdminProposals: Component<{ data: ProposalsData; text?: Partial<typeof ProposalsText> }>;

export const AdminContentForm: Component<{
	/** From loadContentForm in the page's load. */
	data: ContentFormData;
	/** The page's `form`, the result of contentFormAction. */
	form?: SaveResult | null;
	/** The same fields as in the load and the action. */
	fields: Field[];
	/** The action to post to, such as `?/menu`; the default action when left out. */
	action?: string;
	text?: DeepPartial<typeof FormText>;
}>;

export { PROPOSALS_TEXT, FORM_TEXT } from './text.js';
