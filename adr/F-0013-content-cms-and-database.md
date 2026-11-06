# F-0013: Content in code, a CMS when the customer edits, a database when money is involved

- **Status:** accepted
- **Date:** 6 November 2026
- **Supersedes:** F-0012

## Context

F-0012 said the content in code is a fallback for when Sanity cannot be
reached. Once the site is prerendered and rebuilt on every publish, that
fallback does harm: a build during a Sanity outage would publish the launch
texts over what the customer changed since. A failed build is the better
fallback, because Vercel keeps the previous deployment live. This decision is
F-0012 with that rule changed, and with the place of the Studio settled;
the rest is unchanged.

Not every product needs the same parts. One site hardly changes after launch.
Another has a customer who wants to change texts and images without asking
anyone. A third sells products, takes payments and runs the business behind
it. Without a rule, each new product gets the parts of the previous one, or
whatever is quickest at the time.

What the first products showed:

- A database costs money and attention. The free plan has a limit on active
  projects (F-0009) and pauses a free project after a week without activity.
  On a paid plan every extra project adds compute costs, whatever it does.
- The first product with a shop keeps everything about a product in the
  database, edited in its admin: name, texts, photos, prices, stock and SKU.
  The stories and pages are in code. That works, and a shop needs the
  database anyway.
- Earlier sites for customers used a hosted CMS, each in an account in the
  customer's name, on its free plan.
- A CMS whose content model lives in a web interface is a second place to
  keep in step with the code. Sanity keeps its schema in TypeScript, in the
  repo, and gives every free project its own quota within one account.

## Decision

Every product is one of three kinds. The kind is chosen when the product
starts and named in its `CLAUDE.md`.

| Kind                                        | Content               | Database                 | Admin                           |
| ------------------------------------------- | --------------------- | ------------------------ | ------------------------------- |
| A site that hardly changes                  | In code               | None                     | None                            |
| A site the customer edits                   | A CMS                 | None                     | None                            |
| A product with a shop or business behind it | In code, CMS optional | Its own project (F-0009) | `@merijnslegers/admin` (F-0011) |

"None" in the admin column means the product has no `/admin` route at all.
A product gets the login of F-0011 when it becomes the third kind, together
with its database.

- **Content starts in code.** Texts and pages sit in the repo, and a change
  goes through a commit and a preview. A CMS is added only when the customer
  asks to edit themselves.
- **The CMS is Sanity**, the one external service F-0010 adds for this kind.
  - The schema sits in the repo next to the site, and the types are generated
    from it.
  - The published content is read on the server, at build time when the site
    is prerendered. A token, read at runtime
    and only on the server, is only for what is not public: drafts and the
    preview. Without it, the site shows published content and the preview is
    off (F-0005).
  - The content the site launched with stays in code, used only while no
    Sanity project exists yet. It is not a second copy that is kept up to date.
  - When Sanity cannot be reached during a build, or a document the site needs
    is missing, the build fails with a message that names it. Vercel keeps the
    previous deployment live.
  - The Studio lives in `studio/` in the same repo and is hosted by Sanity, so
    the SvelteKit app gets no React. The skill `add-sanity` sets it up.
- **Images in the CMS** go to Sanity's asset store and are scaled by its image
  service. F-0008 holds for uploads through our own admin.
- **The CMS account is in the customer's name.** The customer owns the
  organization and the content; the builder is a member. When the work ends,
  the customer keeps everything without a transfer.
- **Whatever money or an order depends on lives in the database:** name,
  price, stock, SKU, orders and payment status. A CMS may show a product and
  tell its story, but refers to it by its product code and never holds a price
  or a name of its own.
- A form on a site without a database (contact, sign up) sends a mail and
  stores nothing.

## Consequences

- Most sites cost nothing beyond hosting: no database, and a CMS on the
  customer's free plan.
- Moving a site from "in code" to "a CMS" is a known step: the texts become a
  schema, the site reads them from Sanity. A skill makes that step the same
  every time.
- Sites that already run on another CMS stay on it. This decision is for new
  products and for a site that gets a CMS for the first time.
- An existing product names its kind in its `CLAUDE.md`. A product that does
  not fit one yet, such as a site whose own admin still works as a CMS while
  its content moves to code, writes a project decision with "Deviates from:
  F-0013" until it does.
- A shop is built from the parts of the first product with a shop: the
  product screens, the order totals and the cart pricing. When they come back
  in a second product, they become a package.
- A product that does not fit one of the three kinds needs a project decision
  that says "Deviates from: F-0013".

## In the code

- The skill `add-sanity`: the step from content in code to Sanity, with the
  Studio in `studio/`, prerendering and a rebuild on publish.
- Planned: a package for the shop.
- Every project's `CLAUDE.md` names its kind.
