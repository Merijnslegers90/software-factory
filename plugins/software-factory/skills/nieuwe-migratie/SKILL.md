---
name: nieuwe-migratie
description: Een databasemigratie voor Supabase schrijven volgens de fabriek (F-0003, F-0004). Gebruik dit bij elke wijziging aan de database, een nieuwe tabel, kolom, index, check of functie, voordat je de SQL schrijft.
---

# Een nieuwe migratie

Een migratie draait vanzelf mee bij de volgende productie-deploy (F-0003) en
moet daarom zonder handwerk kunnen draaien. Een tabel is alleen bereikbaar
voor de server, via `service_role` (F-0004).

## 1. Het bestand

- In `supabase/migrations/`, met de naam
  `JJJJMMDDUUMMSS_korte_omschrijving.sql`: de huidige tijd in UTC, en later dan
  de laatste die er al staat. Kijk dat na met `ls supabase/migrations | tail`.
  De bestanden worden op naam toegepast, dus een eerdere tijdstempel draait in
  productie nooit.
- De omschrijving in kleine letters met lage streepjes, in de taal van het
  project.
- Pas nooit een migratie aan die al op `main` staat; die is toegepast. Een fout
  herstel je met een nieuwe migratie.

## 2. Een nieuwe tabel

```sql
create table if not exists public.voorbeeld (
	id uuid primary key default gen_random_uuid(),
	created_at timestamptz not null default now()
);

grant select, insert, update, delete on table public.voorbeeld to service_role;
alter table public.voorbeeld enable row level security;
```

- Beide regels onder elke `create table`, ook voor een kleine koppeltabel. De
  test `migraties.test.ts` van het project faalt zonder.
- Geen grant aan `anon` of `authenticated`, en geen policies. RLS zonder policy
  is met opzet het tweede slot.
- Altijd met schemanaam: `public.voorbeeld`.

## 3. Een functie of trigger

```sql
create or replace function public.voorbeeld_bijwerken()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	new.updated_at := now();
	return new;
end;
$$;
```

`set search_path = ''` in de definitie, en elke tabel en elk type met
schemanaam erin.

## 4. Wat ook meegaat

- Een `check` op een vaste lijst waarden (een status, een soort) moet
  meeveranderen als die lijst in de code verandert. Zoek in de code naar de
  constante die de lijst houdt.
- Een kolom die verplicht wordt op een tabel met rijen, krijgt een
  standaardwaarde of eerst een `update`, anders faalt de deploy.
- Rijen die erbij moeten (een instelling, een startwaarde) gaan in de migratie
  zelf, met `on conflict do nothing`, zodat hij ook op een lege database klopt.
- Gegevens van echte klanten of bedrijven horen niet in een migratie.

## 5. Controleren

- `pnpm run test`: de migratietest kijkt naar grant en RLS.
- Heeft de code de nieuwe migratie nodig, zeg dan in de pull request dat hij
  bij de deploy meegaat, en dat een preview hem nog niet heeft.
- Vraagt de wijziging iets wat lastig terug te draaien is (een kolom weg, een
  tabel samenvoegen), schrijf er dan een projectbesluit bij (skill
  `adr-schrijven`).
