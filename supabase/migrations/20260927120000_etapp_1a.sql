-- Etapp 1a: samtalet, bilder och projektminne.
-- Varje rad tillhör en användare, och Row Level Security gör att användaren
-- bara kommer åt sina egna rader. Tabeller exponeras inte automatiskt,
-- så åtkomst ges uttryckligen nedan.

create table public.projekt (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  namn text not null default 'Mitt rum',
  skapad timestamptz not null default now()
);

create table public.bild (
  id uuid primary key default gen_random_uuid(),
  projekt_id uuid not null references public.projekt (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  typ text not null check (typ in ('rum', 'moodboard')),
  sokvag text not null,
  favorit boolean not null default false,
  kommentar text,
  skapad timestamptz not null default now()
);

create table public.meddelande (
  id uuid primary key default gen_random_uuid(),
  projekt_id uuid not null references public.projekt (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  roll text not null check (roll in ('user', 'assistant')),
  text text not null,
  bilder uuid[] not null default '{}',
  skapad timestamptz not null default now()
);

create table public.projektminne (
  projekt_id uuid primary key references public.projekt (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  innehall jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  uppdaterad timestamptz not null default now()
);

create index bild_projekt_idx on public.bild (projekt_id, skapad);
create index meddelande_projekt_idx on public.meddelande (projekt_id, skapad);

-- Row Level Security: bara ägaren.
alter table public.projekt enable row level security;
alter table public.bild enable row level security;
alter table public.meddelande enable row level security;
alter table public.projektminne enable row level security;

create policy "egna projekt" on public.projekt
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "egna bilder" on public.bild
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.projekt p where p.id = projekt_id and p.user_id = (select auth.uid()))
  );

create policy "egna meddelanden" on public.meddelande
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.projekt p where p.id = projekt_id and p.user_id = (select auth.uid()))
  );

create policy "eget projektminne" on public.projektminne
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.projekt p where p.id = projekt_id and p.user_id = (select auth.uid()))
  );

-- Uttrycklig åtkomst för inloggade användare. Ingen åtkomst för anonyma.
grant select, insert, update, delete on public.projekt to authenticated;
grant select, insert, update, delete on public.bild to authenticated;
grant select, insert, update, delete on public.meddelande to authenticated;
grant select, insert, update, delete on public.projektminne to authenticated;

-- Privat lagring för foton. Sökvägen börjar alltid med användarens id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bilder', 'bilder', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "läsa egna foton" on storage.objects
  for select to authenticated
  using (bucket_id = 'bilder' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "ladda upp egna foton" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'bilder' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "radera egna foton" on storage.objects
  for delete to authenticated
  using (bucket_id = 'bilder' and (storage.foldername(name))[1] = (select auth.uid())::text);
