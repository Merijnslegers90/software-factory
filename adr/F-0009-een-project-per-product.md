# F-0009: Elk product een eigen Supabase-project

- **Status:** aangenomen
- **Datum:** 30 oktober 2026

## Context

Met een tweede product dat een database kan krijgen, ligt het voor de hand om
het bestaande Supabase-project te hergebruiken. Eén project is bij Supabase
één database; producten scheiden kan daarbinnen alleen met een schema per
product. Dan delen ze wel alles wat aan het project hangt:

- De `service_role`-sleutel geldt voor het hele project en slaat RLS over
  (F-0004). Lekt de sleutel van het ene product, dan liggen de gegevens van het
  andere ook open.
- Het migratiescript houdt bij wat er is toegepast in `public._migrations`
  (F-0003). Twee producten met elk hun eigen map migraties lopen elkaar daar in
  de weg.
- De inlog (Auth), de opslag en de grenzen van het plan zijn gedeeld. Gaat het
  ene product over de grens van het dataverkeer, dan valt het andere ook stil.

## Besluit

- Elk product dat een database nodig heeft, krijgt een eigen Supabase-project,
  met eigen sleutels.
- De verbinding en de sleutels staan per product in de omgevingsvariabelen van
  Vercel. De repo van het product noemt alleen de namen, met nepwaarden in
  `.env.example` (F-0005); deze repo noemt nooit een project.
- Twee producten in één project, met een schema per product, kan alleen met een
  projectbesluit dat "Wijkt af van: F-0009" zegt, bijvoorbeeld als een eigen
  project per product niet meer te betalen is.

## Gevolgen

- Een nieuw product begint met een nieuw Supabase-project, ook als het eerst
  klein is.
- Het gratis plan van Supabase staat twee actieve projecten toe, over alle
  organisaties heen. Een derde product met een database, of een product dat
  structureel over de grenzen gaat, vraagt een betaald plan. Kijk dan naar de
  actuele prijzen; die staan bewust niet in dit besluit.
- Gegevens van twee producten combineren gaat via de code van een van beide,
  nooit via een gedeelde database.

## In de code

- `.env.example` in elk project noemt de variabelen voor de verbinding en de
  sleutels.
- `scripts/run-migrations.mjs` (straks `packages/migraties`) gaat uit van één
  product per database, met `public._migrations`.
