-- Idéskisser får plats för nya saker och förlagor.
-- platser: rutor i procent av fotot där något nytt får ritas, till exempel
--   ett bord framför soffan: [{"x": 30, "y": 55, "bredd": 30, "hojd": 20}].
-- forlagor: bilder (oftast moodboard) som bildmodellen får som förlaga.
alter table public.skiss add column platser jsonb not null default '[]'::jsonb;
alter table public.skiss add column forlagor uuid[] not null default '{}';
