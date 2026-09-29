-- En skiss kan vara ett förslag: vännen tycker att en bild skulle hjälpa, men
-- användaren har inte bett om den. Den görs först när hon trycker på knappen.
alter table public.skiss drop constraint skiss_status_check;
alter table public.skiss add constraint skiss_status_check
  check (status in ('forslag', 'ny', 'pagar', 'klar', 'fel'));
