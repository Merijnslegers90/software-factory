# F-0004: De database alleen vanaf de server, met service_role

- **Status:** aangenomen
- **Datum:** september 2026, aangevuld met RLS op 21 oktober 2026

## Context

Supabase zet het schema `public` open via een Data API, en de anon-sleutel
die daarbij hoort is bedoeld om in de browser te staan. Wie die route gebruikt,
moet elke tabel met policies afschermen, en een vergeten policy is een lek.

Sinds 30 oktober 2026 geeft Supabase een nieuwe tabel in `public` geen rechten
meer vanzelf. Zonder grant geeft supabase-js "permission denied", en dat merk
je pas in productie. Een tabel zonder RLS levert de melding
`rls_disabled_in_public` op, een functie zonder vaste `search_path` de melding
`function_search_path_mutable`.

## Besluit

- De site praat alleen vanaf de server met de database (`+page.server.ts`,
  `+server.ts` en server-only modules), met de `service_role`-sleutel. De
  browser praat nooit zelf met de database.
- Een migratie die een tabel aanmaakt, zet eronder:
  `grant select, insert, update, delete on table public.<naam> to service_role;`
  en `alter table public.<naam> enable row level security;`.
- `anon` en `authenticated` krijgen niets. RLS zonder policies is het tweede
  slot: komt er toch een grant aan `anon` bij, dan geeft de tabel nog geen rij
  prijs. `service_role` slaat RLS over.
- Een functie in `public` krijgt `set search_path = ''` en noemt elke tabel
  met schemanaam (`public.orders`).
- Wie wat mag, regelt de code op de server (de hook en de serveracties), niet
  een policy in de database.

## Gevolgen

- De `service_role`-sleutel komt nooit in de browser: alleen via
  `$env/dynamic/private` of `$env/static/private`.
- Een inlog via Supabase Auth gebruikt de anon-sleutel, maar alleen op de
  server en alleen voor het inloggen; de tabellen blijven dicht voor die rol.
- Afbeeldingen die buitenstaanders moeten kunnen laden (de site, een
  mailclient) staan in een publieke bucket. Al het andere blijft privé.
- Een project dat nog tabellen zonder RLS heeft, zet het aan met één
  migratie over alle bestaande tabellen.

## In de code

- `src/lib/migraties.test.ts` in elk project laat de tests falen als een
  nieuwe tabel geen grant of geen RLS krijgt. Die test gaat mee in
  `packages/migraties`.
- De skill `nieuwe-migratie`.
