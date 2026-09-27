-- Photos are uploaded once to Anthropic's Files API and referenced by id.
-- That keeps each request small and identical between turns, so the prompt
-- cache can serve the photos instead of re-reading them every message.
alter table public.bild add column anthropic_file_id text;
