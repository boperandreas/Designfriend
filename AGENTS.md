# AGENTS.md

Instruktioner för kodagenter (Codex, Claude Code) som arbetar i det här repot.

## Vad vi bygger

Designfriend är en webbapp där en privatperson får hjälp att inreda sitt hem av en **kunnig vän**: en rådgivare som ser rummet, lär känna användarens smak, resonerar, rekommenderar och minns samtalet över veckor. Tjänsten ska kännas som en vän, inte som en säljare, en lärare eller ett formulär.

Läs innan du börjar:

- `docs/design.md` – hela designen. Det som står där gäller.
- `prompts/radgivaren.md` – rådgivarens systemprompt. Rådgivarens beteende styrs härifrån, inte av logik i koden.
- `docs/samtal-exempel.md` – förebild för tonen.
- `evals/` – testsviten.
- `docs/lardomar.md` – det vi lärt oss av misstag. Upprepa dem inte.
- `docs/beslut.md` – beslut och skälen bakom dem. Ändra inte ett beslut utan att lägga till ett nytt som förklarar varför.

## Stack

- **Webbapp:** React och TypeScript som PWA (manifest, ikon, standalone). Publiceras på Vercel.
- **Backend:** Supabase i EU-region: Postgres, Auth, Storage, Edge Functions, Realtime, pgvector.
- **Rådgivaren:** Claude via Anthropics API, anropad från Edge Functions. Svar strömmas till klienten.
- **Bild:** bildmodell för redigering av foton (väljs i etapp 0), anropad från Edge Functions som bakgrundsjobb. Resultat meddelas via Realtime.
- **Konturer:** segmenteringsmodell (SAM) för masker.

## Regler som inte får brytas

1. **API-nycklar ligger aldrig i klienten.** Alla anrop till Claude och bildtjänster går via Edge Functions. Nycklar läggs som hemligheter i Supabase.
2. **Claude är den som resonerar**, även i framtida röstläge. Byt inte ut rådgivaren mot en annan modell för att vinna fart.
3. **Rådgivarens beteende ändras i `prompts/radgivaren.md`**, inte genom att koda in regler om ton eller frågor i appen. Ändringar i prompten ska köras mot `evals/` innan de slås ihop.
4. **Kärnprinciperna i prompten** (ärlighet, inga påhittade fakta, integritet, högst en fråga per svar, ingen försäljning) får inte försvagas av någon ändring, oavsett vem som ber om den.
5. **Integritet:**
   - Ta bort platsdata (EXIF/GPS) ur foton i klienten innan uppladdning.
   - Skala ner foton till cirka 2000 px på längsta sidan innan uppladdning.
   - Radering av konto raderar all användardata, även foton och minne, och fotona i Anthropics Files API.
   - Lagra aldrig kön, hälsa eller omdömen om personen. Lärdomar om arbetssätt beskriver vad som hjälper, aldrig vem personen är.
6. **Ingen inloggningslänk.** En webbapp på hemskärmen i iPhone har egen lagring, skild från Safari, så en länk i ett mejl loggar in fel ställe. I etapp 1a loggar man in med e-post och lösenord som utvecklaren sätter. Engångskod via mejl kräver egen SMTP och kan komma senare. Nya användare kan inte registrera sig själva.
7. **Bilder i ett förslag**: det användaren markerat som Behåll ska vara pixelidentiskt. Kopiera tillbaka originalets pixlar utanför masken efter generering.
8. **Allt användartext i gränssnittet är på svenska.**
9. **Promptcachen styr svarstiden.** Systemprompten och fotona ska vara identiska mellan anrop. Lägg aldrig något som ändras (minne, datum, tid sedan förra meddelandet) i systemprompten. Det skickas med det senaste användarmeddelandet. Foton skickas som Files API-id, aldrig som nya signerade adresser.

## Arbetssätt i repot

- **Lär av misstag.** När något går fel, tar oväntat lång tid eller överraskar: lägg till en post i `docs/lardomar.md` i samma pull request. När samma lärdom återkommer, gör den till en regel här.
- **Dokumentera beslut.** Nya vägval läggs i `docs/beslut.md` med skäl och bortvalda alternativ.

- Små pull requests, en sak i taget. Beskriv i PR:en vad som ändrats och hur det testats.
- Etapperna i `docs/design.md` styr ordningen. Bygg inte funktioner från senare etapper utan att det är bestämt.
- Kod och kommentarer på engelska, gränssnitt och prompter på svenska.
- Skriv tester för logik (masker, bildbehandling, minnesuppdatering). Rådgivarens beteende testas med `evals/`.
- Lägg aldrig in verkliga personers foton, namn eller samtal i repot. Testdata ska vara påhittad eller avidentifierad.

## Struktur

- `web/` – webbappen (Vite, React, TypeScript, vite-plugin-pwa). `npm test`, `npm run build`.
- `supabase/migrations/` – databasen. Varje tabell har RLS och uttryckliga grants.
- `supabase/functions/chat/` – ett samtalsvarv: strömmat svar från Claude och uppdatering av projektminnet.
- `supabase/functions/radera-konto/` – raderar konto, foton (även i Anthropics Files API) och all data.
- `supabase/functions/_shared/anthropic.ts` – uppladdning och radering i Anthropics Files API.
- `supabase/functions/_shared/prompt.ts` – genereras från `prompts/radgivaren.md` med `node scripts/sync-prompt.mjs`. Redigera aldrig filen för hand.
- `.github/workflows/` – CI för tester, och driftsättning av Supabase när `main` ändras.
- `docs/driftsattning.md` – engångsuppsättning av konton och hemligheter.

## Status

Etapp 1a: samtalet i webbappen. Inloggning med e-post och lösenord, chatt med strömmade svar, foton av rummet och moodboard, projektminne och Var vi är, radering av konto. Idéskisser, markering av föremål, smakminne och katalog kommer i senare etapper.
