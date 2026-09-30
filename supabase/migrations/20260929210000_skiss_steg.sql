-- Skisser steg för steg.
-- kalla_skiss_id: skissen den här bygger vidare på ("ändra i sista skissen").
-- grund_sokvag:   bilden skissen faktiskt utgick från (foto eller tidigare skiss);
--                 appen lägger tillbaka dess pixlar utanför det som fick ändras.
-- visad_sokvag:   den färdiga skissen som den visas, sparad av appen, så att den
--                 kan byggas vidare på, sparas och delas.
alter table public.skiss add column kalla_skiss_id uuid references public.skiss (id) on delete set null;
alter table public.skiss add column grund_sokvag text;
alter table public.skiss add column visad_sokvag text;
