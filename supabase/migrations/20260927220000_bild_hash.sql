-- SHA-256 of the original file, computed in the browser before upload.
-- Lets the app notice when the same photo is added to a project twice.
-- Older rows have no hash and are never treated as duplicates.
alter table public.bild add column hash text;
create unique index bild_projekt_hash_idx on public.bild (projekt_id, hash) where hash is not null;
