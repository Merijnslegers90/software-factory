import type { Component } from 'svelte';
import type { Field } from '../content-form.js';
import type { ContentData, ContentFormData, ProposalsData, SaveResult } from '../content-form-server.js';
import type {
	CONTENT_TEXT as ContentText,
	FORM_TEXT as FormText,
	PROPOSALS_TEXT as ProposalsText
} from './text.js';

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

/** The Content page of #37: the tabs and the form of the active section. */
export const AdminContent: Component<{
	/** The page's `data`, from the load of defineContent. */
	data: ContentData;
	/** The page's `form`, the result of the action of defineContent. */
	form?: SaveResult | null;
	text?: Partial<typeof ContentText>;
	/** Passed to the form of each section. */
	formText?: DeepPartial<typeof FormText>;
}>;

export { PROPOSALS_TEXT, FORM_TEXT, CONTENT_TEXT, proposalsTodo } from './text.js';
