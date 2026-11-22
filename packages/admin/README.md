# @merijnslegers/admin

The admin login of the software factory and the building blocks of its
screens (F-0020), and image resizing in the
browser (F-0008). Each person signs in to `/admin` with their own email address
and password, in one of two ways, chosen by the settings:

- **Supabase Auth**, for a product with a database. Who may enter is an allow
  list, checked on every request. This is the rest of this README, up to
  [HTTP Basic](#http-basic-for-a-product-without-a-database).
- **HTTP Basic**, for a product without a database: the browser's own login
  window, with a password per person in an environment variable. See
  [HTTP Basic](#http-basic-for-a-product-without-a-database).

The package holds the login, the access rules and the headers, and the
building blocks for the screens: the frame, the overview, the open proposals
and a form block for content in the repo. See
[The admin blocks](#the-admin-blocks). The navigation, special editors and the
refusals of the login stay in the project.

```bash
pnpm add @merijnslegers/admin @supabase/ssr @supabase/supabase-js
```

A product with HTTP Basic only needs `@merijnslegers/admin`: the Supabase
packages are loaded only for Supabase Auth. Its build then warns that
`@supabase/ssr` cannot be found. That is expected and harmless; do not install
it to silence the warning.

| Import                        | What it holds                                                            | Where it runs |
| ----------------------------- | ------------------------------------------------------------------------ | ------------- |
| `@merijnslegers/admin/server` | `createAdmin`: the hook and the functions for the login screens          | server only   |
| `@merijnslegers/admin/rules`  | The pure rules: allow list, return path, Origin check, headers, password | anywhere      |
| `@merijnslegers/admin/password` | `hashPassword` and `verifyPassword` for HTTP Basic, with scrypt        | server only   |
| `@merijnslegers/admin/github` | `createContentRepo`: content changes through a pull request (F-0018)     | server only   |
| `@merijnslegers/admin/resize` | `resizeImage` and `resizeFormFiles`                                      | browser       |
| `@merijnslegers/admin/ui`     | `AdminShell`, `AdminOverview`, `AdminMessage`, `AdminCard`, `AdminField` | Svelte        |
| `@merijnslegers/admin/github/ui` | `AdminProposals` and the form block `AdminContentForm`                | Svelte        |
| `@merijnslegers/admin/content-form-server` | `loadContentForm`, `contentFormAction`, `loadProposals`     | server only   |
| `@merijnslegers/admin/content-form` | The pure rules of the form: fields, prices, checks                 | anywhere      |

## Connecting a project

**The settings.** Four variables, declared in `src/env.ts` and read at runtime
(F-0005). The package reads none of them itself.

| Variable                    | What it is                                                              |
| --------------------------- | ----------------------------------------------------------------------- |
| `SUPABASE_URL`              | The project's Supabase address (F-0009)                                 |
| `SUPABASE_ANON_KEY`         | Only for logging in; it reads or writes no table                        |
| `SUPABASE_SERVICE_ROLE_KEY` | Already there for the database (F-0004); here only to create a new user |
| `ADMIN_EMAILS`              | Who may enter: addresses separated by commas, spaces or new lines       |

Without one of them nobody gets in, the build still works, and
`missingSettings()` names what is missing so the login screen can show it.
A project whose variables are named differently passes `settingNames`.

**One module**, `src/lib/server/admin.ts`:

```ts
import { createAdmin } from '@merijnslegers/admin/server';
import {
	ADMIN_EMAILS,
	SUPABASE_ANON_KEY,
	SUPABASE_SERVICE_ROLE_KEY,
	SUPABASE_URL
} from '$app/env/private';

export const admin = createAdmin({
	supabaseUrl: SUPABASE_URL,
	anonKey: SUPABASE_ANON_KEY,
	serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
	allowList: ADMIN_EMAILS,
	// Optional: a project in Dutch names its screens in Dutch.
	paths: { login: '/admin/inloggen', password: '/admin/wachtwoord' },
	// Optional: the hook's 401 and 403 in the project's own words.
	responses: {
		unauthorized: 'U bent niet ingelogd.',
		forbidden: 'Dit verzoek kwam niet van onze eigen site.'
	}
});
```

**The hook**, in `src/hooks.server.ts`. With other hooks, combine them with
`sequence`.

```ts
import { admin } from '#lib/server/admin.js';

export const handle = admin.handle;
```

For everything under the admin path it:

- lets the login and password screens through without a session;
- sends a page, a link from a mail or a form without a session to the login
  screen, and back to where it was afterwards (only within the admin path);
- answers any other request without a session with a 401;
- answers a request that can change something with a 403 when it does not come
  from the site's own origin, even when SvelteKit's own check is off for a
  webhook;
- gives that 401 or 403 the text from `responses` as plain text, or an empty
  body without it, so the package chooses no words of its own;
- puts `ADMIN_HEADERS` on every response: no framing, `noindex`, `no-store`,
  a referrer that stays on the site.

Someone signed in is in `event.locals.admin` (`{ email }`). Declare it in
`src/app.d.ts`:

```ts
declare global {
	namespace App {
		interface Locals {
			admin?: import('@merijnslegers/admin/server').Admin;
		}
	}
}
```

A webhook belongs under `/api`, never under the admin path.

**Remote functions** are called at `/_app/remote/...`, outside the admin path,
so the hook does not guard them. An admin remote function checks
`admin.currentAdmin(cookies)` itself, first thing.

**The screens.** The login and password screens use `+page@.svelte`, so they do
not hang under the admin layout, which belongs to someone signed in. Their
actions call the package and turn its outcome into the project's own words:

```ts
// src/routes/admin/inloggen/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { safeReturnPath } from '@merijnslegers/admin/rules';
import { admin } from '#lib/server/admin.js';

const TEXT = {
	invalid_credentials: 'Dit e-mailadres en wachtwoord horen niet bij elkaar.',
	rate_limited: 'Te veel pogingen. Wacht een paar minuten.',
	missing_setting: 'Dit e-mailadres en wachtwoord horen niet bij elkaar.'
};

export const load = async ({ cookies, url }) => {
	const to = safeReturnPath(url.searchParams.get('to'), admin.paths);
	if (await admin.currentAdmin(cookies)) redirect(303, to);
	return { to, missing: admin.missingSettings() };
};

export const actions = {
	signIn: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '');
		const outcome = await admin.signIn(cookies, email, String(data.get('password') ?? ''));
		if (outcome !== 'ok')
			return fail(outcome === 'rate_limited' ? 429 : 400, { email, error: TEXT[outcome] });
		redirect(303, safeReturnPath(String(data.get('to') ?? ''), admin.paths));
	}
};
```

| Function                                   | Outcomes                                                                                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `signIn(cookies, email, password)`         | `ok`, `invalid_credentials`, `rate_limited`, `missing_setting`                                                                     |
| `sendPasswordLink(cookies, email, origin)` | `ok`, `invalid_email`, `rate_limited`, `send_failed`                                                                               |
| `setPassword(cookies, input)`              | `ok`, `password_too_short`, `passwords_differ`, `link_invalid`, `not_signed_in`, `weak_password`, `save_failed`, `missing_setting` |
| `signOut(cookies)`                         | nothing                                                                                                                            |

Some outcomes say nothing on purpose:

- An address that is not on the list gets `invalid_credentials`, just like a
  wrong password, and Supabase is not called.
- `sendPasswordLink` answers `ok` for every valid address, and only one on the
  list gets a mail.

So no screen gives away who has access.

**A password link** works for a first password and a forgotten one alike:

- `sendPasswordLink` creates the user if they do not exist yet. You never create
  one by hand.
- On the password screen, `readPasswordLink(url)` reads the link in `load` and
  puts it in the form.
- `setPassword` uses the link only once the password is saved, because mail
  programs and virus scanners open links in advance.
- Both kinds of link work: `token_hash` (your own mail template, any browser)
  and `code` (Supabase's default template, only in the browser that asked for
  it).
- Someone signed in sets a new password on the same screen, without a link.
- A password is at least `PASSWORD_MIN_LENGTH` (10) characters.

## HTTP Basic, for a product without a database

The browser asks for the email address and password in its own window. There
is no login screen, no cookie and no Supabase.

**The setting.** One variable, `ADMIN_USERS`, declared in `src/env.ts` and
read at runtime (F-0005): one entry per person, `email:hash`, separated by new
lines, commas or spaces. Make an entry with:

```bash
npx @merijnslegers/admin hash <email>
```

It asks for the password twice (at least 10 characters) and prints the line.
Put that in Vercel's environment variables; the password itself is stored
nowhere. A plain password instead of a hash does not count. Removing a line
locks that person out, changing one changes their password, both from the next
deploy.

**One module**, `src/lib/server/admin.ts`:

```ts
import { createAdmin } from '@merijnslegers/admin/server';
import { ADMIN_USERS } from '$app/env/private';

export const admin = createAdmin({
	users: ADMIN_USERS,
	// Optional: the name in the browser's login window.
	realm: 'Beheer',
	// Optional: the refusals in the project's own words.
	responses: {
		unauthorized: 'U bent niet ingelogd.',
		forbidden: 'Dit verzoek kwam niet van onze eigen site.',
		loggedOut: 'U bent uitgelogd.',
		rateLimited: 'Te veel pogingen. Probeer het over een kwartier opnieuw.',
		closed: 'De admin is dicht. Deze instelling ontbreekt:'
	}
});
```

The hook and `event.locals.admin` (`{ email }`) are the same as for Supabase
Auth. For everything under the admin path the hook:

- answers without a valid password with a 401 that makes the browser ask;
- answers a request that can change something with a 403 when it does not come
  from the site's own origin;
- remembers a checked password for five minutes per server instance, by its
  SHA-256, so not every request pays for scrypt;
- after ten wrong passwords from one IP address answers with a 429 for a
  quarter of an hour, per server instance;
- answers `/admin/logout` (`paths.logout`) with a 401, which makes most
  browsers forget the password. Some keep it until the browser is closed;
- puts `ADMIN_HEADERS` on every response.

Without `ADMIN_USERS` nobody gets in, and the 401 names the missing setting
after `responses.closed`.

**What it cannot do:**

- `currentAdmin`, `signIn`, `sendPasswordLink`, `setPassword` and `signOut`
  are for Supabase Auth; with HTTP Basic they do nothing. Read
  `event.locals.admin` instead.
- **No remote functions.** The browser sends the password only under the
  admin path, and a remote function runs at `/_app/remote/...`. An admin
  screen uses form actions and endpoints under the admin path.
- No password link: a new password is a new line in Vercel and a deploy.

**Which login a product gets.** With `supabaseUrl` or `anonKey` filled it is
Supabase Auth, even if `users` is filled too (a warning goes to the log).
Otherwise, with `users` filled, it is HTTP Basic. A half Supabase setup never
falls back to HTTP Basic: the admin stays closed and names what is missing.
`admin.method` says which one is in use.

## Changing content through a pull request

For content that lives in the repo (F-0017), in any kind of product. The
admin writes one commit on a branch `admin/<key>` and opens a pull request.
It never merges: the owner does, after the preview and the checks (F-0018).
This does not replace the database: name, price, stock and orders of a
product with a shop stay there.

**The token.** A fine-grained personal access token in GitHub (Settings,
Developer settings, Fine-grained tokens):

- Repository access: only this one repository.
- Permissions: Contents and Pull requests, read and write. GitHub adds
  Metadata, read.
- Expiration: a year at most. When it has expired, the module answers
  `key-refused` and the screen says so.

Put it in Vercel as `ADMIN_GITHUB_TOKEN`, next to `ADMIN_GITHUB_REPO`
(`owner/name`), read at runtime in `src/env.ts` (F-0005), and list both,
empty, in `.env.example`.

**One module**, for example `src/lib/server/repo.ts`:

```ts
import { createContentRepo } from '@merijnslegers/admin/github';
import { ADMIN_GITHUB_REPO, ADMIN_GITHUB_TOKEN } from '$app/env/private';

export const repo = createContentRepo({
	token: ADMIN_GITHUB_TOKEN,
	repo: ADMIN_GITHUB_REPO,
	// Where the admin may write; anything else is refused before GitHub.
	allowedPaths: ['src/content/notes/', 'src/lib/content/site.json']
});
```

**In a form action** under the admin path:

```ts
const result = await repo.propose({
	key: `note/${slug}`,
	title: `Note: ${title}`,
	files: [{ path: `src/content/notes/${slug}.md`, content: markdown }],
	changedBy: locals.admin?.email
});
if (result.outcome !== 'ok') return fail(503, { outcome: result.outcome });
// result.proposal.url is the pull request; result.changed is false when nothing changed.
```

- The same key saved again adds a commit to the same pull request. After a
  merge or close, the key starts again from the base branch. The branch is
  flat: `note/a` becomes `admin/note-a`.
- **Branches starting with `admin/` belong to the admin.** One without an
  open pull request is reset when its key is saved, so nobody works on such a
  branch by hand.
- Every path is checked, for reads too: a path with `..` never reaches
  GitHub.
- `changedBy` puts the address in git history. In a public repo it becomes
  public; pass a name there instead.
- `content: null` deletes a file. All files of one call are one commit.
- `readFile(path)` and `listFiles(dir)` read the base branch;
  `readFile(path, { ref: proposal.branch })` reads an open proposal, so a
  second save starts from the first instead of from `main`;
  `openProposals()` lists the open pull requests from `admin/` branches.
- Every call returns an outcome code, never throws for GitHub's sake:
  `ok`, `no-key`, `key-refused`, `not-allowed`, `conflict`, `unavailable`,
  and `not-found` for `readFile`. `propose` can also give `no-write` (the
  token reads but may not write: give Contents and Pull requests read and
  write) and `branch-blocked` (see below). The words belong to the project.
- Each refusal is logged with GitHub's status, the method and the path,
  never the token, so it can be traced in the logs of the host.
- **Never name a branch `admin`.** Git cannot have `admin/<key>` next to it,
  so every proposal would fail with `branch-blocked` until it is deleted.
- Without the token or the repo, `enabled` is false, nothing goes to GitHub,
  and `missingSettings()` names what is missing.
- A file over 1 MB is refused: the module is for text.
- A pull request opened with a personal token starts the workflows and the
  Vercel preview.

## The admin blocks

The screens of every admin come from here (F-0020): Svelte components that
the product's SvelteKit 3 compiles, with their own scoped CSS, in Dutch by
default. A product passes its brand colour and logo, and its own words where
it wants other ones through the `text` prop of a block.

**The frame**, in `src/routes/admin/+layout.svelte`:

```svelte
<script lang="ts">
	import { AdminShell } from '@merijnslegers/admin/ui';
	import { theme } from '#lib/admin/theme';
	let { children, data } = $props();
</script>

<AdminShell
	name="Frietwagen Someren"
	logo="/images/logo.png"
	{theme}
	nav={[
		{ href: '/admin', label: 'Overzicht' },
		{ href: '/admin/prijzen', label: 'Prijzen' },
		{ href: '/admin/bezoekers', label: 'Bezoekers' }
	]}
	message={data.message}
>
	{@render children()}
</AdminShell>
```

**The theme.** A product sets its own look in one place, through `theme`
on `AdminShell`: colours, fonts and rounding. What it leaves out keeps the
calm default. The layout of the blocks is shared; there is no way to restyle
one block, and what a product misses becomes a new key here, for every
product.

```ts
// src/lib/admin/theme.ts
export const theme = {
	scheme: 'dark', // 'auto' follows the device (the default), 'light' or 'dark' fixes one
	accent: '#f2b705',
	onAccent: '#000',
	headingFont: "'Oswald Variable', sans-serif",
	headingTransform: 'uppercase',
	dark: { bg: '#000', surface: '#141414', text: '#fff', muted: '#c4c4c4', border: '#333' }
};
```

| Key                       | What it sets                                               |
| ------------------------- | ---------------------------------------------------------- |
| `bg`, `surface`           | The page and the cards                                     |
| `text`, `muted`           | Text, and the lighter text of hints and labels             |
| `border`, `inputBorder`   | Lines, and the edge of an input (3:1 against its background) |
| `accent`, `onAccent`      | Buttons, the current page, bars; and the text on them      |
| `headerBg`, `headerText`  | The bar at the top, for a logo that needs its own colour   |
| `error`, `errorBg`, `warningBg`, `okBg` | Messages                                     |
| `font`, `headingFont`, `headingTransform` | The fonts, and capitals for headings       |
| `radius`                  | The rounding of corners                                    |
| `dark`                    | The same keys for the dark version                         |

A value may hold colours, font names and lengths only; anything that could
end the declaration throws. The fonts must be loaded by the product.

**Options.** A block can leave parts out: `AdminShell` takes
`showSiteLink={false}`, `AdminVisitors` takes `show={{ referrers: false }}`
(also `series`, `pages`, `periods`), and a list field takes `fixed: true` to
allow changing its items but not adding, removing or moving them. The server
checks that too.

The product's own styles for headings (a display font, wide letters) stay
out of the blocks.

Check the accent colour: `--admin-on-accent` is the text on it (buttons, the
chosen period) and needs a contrast of 4.5:1 with it; the accent itself is
also the colour of the chart bars and the border of a message, which want
3:1 against the background (`#f6f6f4` light, `#151514` dark). The focus ring
follows the text colour, not the accent. The blocks are meant inside
`AdminShell`, which defines the colours; outside it they fall back to the
light ones.

**The overview**, with the visitors of this month and the open proposals:

```svelte
<AdminOverview facts={[{ label: 'Domein', value: 'www.example.nl' }]} links={[{ label: 'Vercel', href: 'https://vercel.com/...' }]}>
	<AdminVisitorsSummary data={data.visitors} />
	{#if data.proposals.outcome !== 'no-key'}
		<AdminProposals data={data.proposals} />
	{/if}
</AdminOverview>
```

The summary leaves itself out without its settings; the proposals block says
what is missing, which is right on a page of its own but not on the
overview.

**The form block** fills one JSON file in the repo, inside `allowedPaths` of
the content repo (F-0018). The product describes the fields once and uses
them in the load, the action and the component:

```ts
// src/lib/admin/prijzen.ts
import type { Field } from '@merijnslegers/admin/content-form';

export const path = 'src/lib/content/menu.json';
export const fields: Field[] = [
	{
		key: 'kaarten',
		type: 'list',
		label: 'Menukaarten',
		itemLabel: 'Kaart',
		titleKey: 'titel',
		fields: [
			{ key: 'titel', type: 'text', label: 'Naam', required: true },
			{ key: 'prijs', type: 'price', label: 'Prijs per persoon', required: true }
		]
	}
];
```

```ts
// src/routes/admin/prijzen/+page.server.ts
import { contentFormAction, loadContentForm } from '@merijnslegers/admin/content-form-server';
import { repo } from '#lib/server/repo';
import menu from '#lib/content/menu.json';
import { fields, path } from '#lib/admin/prijzen';

const options = { path, key: 'prijzen', fields, current: menu };

export const load = () => loadContentForm(repo, options);
export const actions = {
	default: contentFormAction(repo, {
		...options,
		title: 'Prijzen bijgewerkt',
		changedBy: (event) => event.locals.admin?.email
	})
};
```

```svelte
<!-- src/routes/admin/prijzen/+page.svelte -->
<AdminContentForm {data} {form} {fields} />
```

- Field types: `text`, `longtext`, `price` (shown as `4,50`, saved as a
  number), `toggle`, `link` (a path, an anchor, or an http, mailto or tel
  address) and `list`, whose items have their own `fields`. `required`,
  `maxLength`, `min` and `max` are checked on the server too.
- The form starts from the open proposal for its `key`, and saving again adds
  to it. Keys in the file that the fields do not name are kept.
- A file that no longer matches the fields (a price that became text) is
  refused with the path where it went wrong; nothing is overwritten.
- Without `ADMIN_GITHUB_TOKEN` or `ADMIN_GITHUB_REPO` the form shows `current`
  and says what is missing; saving is off (F-0005).
- A file that is not on GitHub yet starts from `current`, or empty without
  it; saving creates it. On the preview of the pull request that adds the
  file, merge that pull request first: a proposal saved there adds the same
  file, and the second merge then conflicts.
- A key inside a list item that the fields do not name counts as a mismatch,
  because saving would lose it. At the top of the file such keys are kept.
- Call `checkFields(fields)` where the fields are defined: a wrong field
  list then fails at once, in the tests, instead of in the admin.
- One form per page: the ids of the fields come from their keys.

**The Content page** puts the forms together under one nav item, with a tab
per section (#37). The product decides which sections there are; the package
brings the tabs, the form per tab and the saving. Each section is a JSON file
with its fields and saves on its own, as a proposal on `admin/<key>`:

```ts
// src/lib/server/content.ts
import { defineContent } from '@merijnslegers/admin/content-form-server';
import { repo } from '#lib/server/repo';
import menu from '#lib/content/menu.json';
import contact from '#lib/content/contact.json';
import { contactFields, menuFields } from '#lib/admin/velden';

export const content = defineContent(
	repo,
	[
		{ key: 'menu', label: 'Menu', path: 'src/lib/content/menu.json', fields: menuFields, current: menu, title: 'Menu bijgewerkt' },
		{ key: 'contact', label: 'Contactgegevens', path: 'src/lib/content/contact.json', fields: contactFields, current: contact, title: 'Contactgegevens bijgewerkt' }
	],
	{ changedBy: (event) => event.locals.admin?.email }
);
```

```ts
// src/routes/admin/content/[[section]]/+page.server.ts
import { content } from '#lib/server/content';

export const load = content.load;
export const actions = content.actions;
```

```svelte
<!-- src/routes/admin/content/[[section]]/+page.svelte -->
<script lang="ts">
	import { AdminContent } from '@merijnslegers/admin/github/ui';

	let { data, form } = $props();
</script>

<h1>Content</h1>
<AdminContent {data} {form} />
```

- `/admin/content` opens the first section, `/admin/content/<key>` another;
  an unknown key is a 404. Another place or parameter name goes in the
  options: `{ base: '/admin/inhoud', param: 'onderdeel' }`.
- A tab with an open proposal says so. The open proposals are asked once
  per page, not once per tab.
- With one section there is no tab bar, just the form.
- A section whose file no longer matches its fields stops only that tab.
- `defineContent` throws when the server starts if the list has a mistake:
  no sections, a key or file twice, a key that is not `a-z`, `0-9` and `-`,
  no label or title, or fields that `checkFields` refuses.
- The form asks before leaving with changes that are not saved, on this page
  and on a form of its own.
- Put each path in `allowedPaths` of the content repo.

**Accessible:** every block works by keyboard and on a narrow screen, with
touch targets of 44 pixels. Put the admin pages in the product's
accessibility test, after logging in with a test user from `.env.example`.

## Settings in Supabase

Under Authentication:

- **URL Configuration, Redirect URLs:** the password screen on the production
  domain, such as `https://www.<domain>/admin/password`, and on the previews.
  - Mind `www`: the link is built from the address the person is on.
  - Supabase replaces an address that is not listed by the Site URL, and then
    the link does not work.
- **"Allow new users to sign up"** may be off. The package creates users with
  the `service_role` key, which does not look at it.
- **Emails, SMTP Settings:** your own mail server, through Resend
  (`smtp.resend.com`, port 465, user `resend`, an API key of its own as
  password). Without it, Supabase only mails members of its own organisation, a
  few per hour, and you cannot change the templates.
- **Emails, template "Reset password":** the link as
  `{{ .RedirectTo }}?token_hash={{ .TokenHash }}` instead of
  `{{ .ConfirmationURL }}`. It then goes straight to your own screen and is used
  only on saving.

## Resizing images

In the browser, before the upload (F-0008). The project sets the width and the
format per kind of image, in one place:

```ts
import { resizeFormFiles, resizeImage } from '@merijnslegers/admin/resize';

const SCREENSHOT = { maxWidth: 2000 }; // webp, for the site
const MAIL_PHOTO = { maxWidth: 1200, format: 'mail' } as const; // JPEG, PNG kept

await resizeFormFiles(formData, 'images', SCREENSHOT);
const photo = await resizeImage(file, MAIL_PHOTO);
```

- **`webp`** (the default) for images on the site.
- **`mail`** for images in an email. Many mail clients (Outlook) do not show
  webp, so the image becomes JPEG, and a PNG stays PNG because it often holds
  transparency.
- A phone photo stays upright (its EXIF orientation).
- An image that is already narrow enough and under 1 MB is left alone.
- SVG and GIF are never drawn again.
- When the browser cannot do it, or the result is not smaller, the original
  goes and the server decides. With `mail`, a webp or AVIF is always turned
  into JPEG, even when that is larger.
- A browser without `OffscreenCanvas` draws on an ordinary canvas instead.

## Tests

The rules and the resize plan are pure; `npm test` at the repo root runs their
tests. A project's own tests use the same rules without Supabase, for instance
for its own screen names:

```ts
// F-0020
import { adminPaths, safeReturnPath } from '@merijnslegers/admin/rules';

const paths = adminPaths({ login: '/admin/inloggen', password: '/admin/wachtwoord' });

it('never sends you back to the login screen', () => {
	expect(safeReturnPath('/admin/inloggen', paths)).toBe('/admin');
});
```
