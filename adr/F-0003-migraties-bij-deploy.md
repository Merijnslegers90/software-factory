# F-0003: Migraties draaien mee bij de productie-deploy

- **Status:** aangenomen
- **Datum:** september 2026

## Context

Wijzigingen aan de database werden met de hand in de SQL-editor van Supabase
geplakt. Dat werd vergeten, of gebeurde op een ander moment dan de deploy van
de code die erop rekende.

Het script dat dat oploste, is van het eerste naar het tweede product
gekopieerd en daarna uit elkaar gelopen. Het grootste verschil: zonder
databaseverbinding faalt het ene, en slaat het andere de migraties over.

## Besluit

- Migraties staan in `supabase/migrations/`, met een tijdstempel voorop
  (`20261030120000_korte_omschrijving.sql`), en worden op naam gesorteerd
  toegepast.
- `vercel-build` draait het migratiescript vóór de build. Alleen bij een
  productie-deploy (`VERCEL_ENV=production`), of als `RUN_MIGRATIONS=1` is
  gezet; lokaal en bij een preview doet het niets.
- Elk bestand gaat in een eigen transactie en wordt bijgehouden in
  `public._migrations`. Een migratie die faalt, laat de build falen, en de
  vorige versie blijft draaien.
- De verbinding komt uit `SUPABASE_DB_URL`, of uit de namen die de
  integraties van Vercel aanmaken. Gebruik de Session pooler van Supabase:
  de directe verbinding is alleen IPv6, en Vercel bouwt zonder IPv6.
- Is er bij een productie-deploy geen verbinding ingesteld, dan faalt de
  build. Een product dat bewust ook zonder database live kan, legt dat vast
  in een projectbesluit ("Wijkt af van: F-0003"), en dan slaat het script
  over.
- Niets aan de database gaat meer met de hand.

## Gevolgen

- Code en database gaan in één deploy live.
- Een migratie moet zonder handwerk kunnen draaien en mag niet afhangen van
  iets wat in de editor is gedaan.
- Een toegepaste migratie wordt nooit meer aangepast. Een fout herstel je met
  een nieuwe migratie.
- Een preview past geen migraties toe. Code die op een nieuwe migratie rekent,
  werkt in een preview pas als de database van die preview hem al heeft.

## In de code

- `scripts/run-migrations.mjs` en `vercel-build` in elk project. Dat script
  wordt het pakket `packages/migraties`.
- De skill `nieuwe-migratie` schrijft een migratie volgens dit besluit en
  F-0004.
