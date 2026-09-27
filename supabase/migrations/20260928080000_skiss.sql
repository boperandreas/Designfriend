-- Etapp 1b: idéskisser. En skiss är ett rumsfoto som bildmodellen ändrat,
-- till exempel med en möbel borttagen. Masker (från SAM) visar vilka delar
-- som fick ändras; appen lägger tillbaka originalets pixlar utanför dem.

create table public.skiss (
  id uuid primary key default gen_random_uuid(),
  projekt_id uuid not null references public.projekt (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kalla_bild_id uuid references public.bild (id) on delete set null,
  beskrivning text not null,
  instruktion text not null,
  omraden text[] not null default '{}',
  status text not null default 'ny' check (status in ('ny', 'pagar', 'klar', 'fel')),
  sokvag text,
  masker text[] not null default '{}',
  modell text,
  fel text,
  ms integer,
  skapad timestamptz not null default now(),
  klar timestamptz
);

create index skiss_projekt_idx on public.skiss (projekt_id, skapad);
create index skiss_user_dag_idx on public.skiss (user_id, skapad);

alter table public.skiss enable row level security;

create policy "egna skisser" on public.skiss
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.projekt p where p.id = projekt_id and p.user_id = (select auth.uid()))
  );

grant select, insert, update, delete on public.skiss to authenticated;

-- Appen får veta via Realtime när en skiss blir klar.
alter publication supabase_realtime add table public.skiss;
