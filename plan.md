# Plan

Var vi står och vad som är nästa steg. **Läs den här filen först i varje ny session**, tillsammans med `AGENTS.md` och `docs/lardomar.md`. Uppdatera den i samma pull request som ändrar läget: bocka av, flytta upp nästa steg, skriv datum.

Designen och skälen finns i `docs/design.md` och `docs/beslut.md`. Den här filen handlar bara om ordning och status.

Senast uppdaterad: 2026-09-27

---

## Läget just nu

- **Etapp 1a är i drift.** Webbappen ligger på Vercel och serverfunktionerna i Supabase (EU, Irland). Två användare: utvecklaren och första testanvändaren. Inloggning med e-post och lösenord.
- **Snabbare svar i drift sedan 2026-09-27 18:35:** cachebar prompt, foton via Files API, tidsmätning (`chat_timing`). Första versionen tog 26 s för ett helt svar. Nya versionen inte mätt ännu.
- **Agenten läser loggar själv** via Supabase-connectorn, se `AGENTS.md`.

## Nästa steg, i ordning

1. **Svarstiden är mätt (2026-09-27, röktestet).** Effort high: första ordet efter 22,7 s, 9,2 s och 6,4 s. Effort low: 4,6 s, 1,9 s och 4,9 s, svar på cirka 150 tokens i stället för 1 668. Kvar är variation i Anthropics svarstid (1,5 till 4,7 s till första byte) och 0,2 till 0,6 s i databasen. Kör röktestet efter varje ändring som kan påverka tiden.
2. **Testanvändaren börjar använda appen** med sitt vardagsrum och sin moodboard. Samla hennes reaktioner på tonen (H1–H3 i `evals/kriterier.md`) och eventuella idéer.
3. **Prompt 0.1.2 är skriven** efter första kvällen: kortare första svar, ärligt besked om att foton inte kan ändras än, inga bildnummer. Kör röktestet och testfall 002 efter sammanslagning.
   **Prompt v0.2.** Justera `prompts/radgivaren.md` efter reaktionerna. Granska mot `evals/kriterier.md` och testfall 001 innan sammanslagning.
4. **Tak per användare och dag.** Spärr i `chat`-funktionen mot för många anrop, så att en loop eller ett fel inte tömmer saldot. Designen kräver det från start och det saknas i 1a.
5. **Automatisk testsvit.** Skript som spelar upp `evals/fall/` mot prompten via API:et och låter en separat bedömarmodell gå igenom svaren mot kriterierna. Körs i CI när prompten ändras.
6. **Bildtestet i etapp 0, och sedan etapp 1b.** Testanvändaren bad redan första kvällen om att få möbler borttagna ur fotot. Det talar för att ta etapp 1b (Ta bort, Töm rummet) direkt efter taket per dag. Tio rum, fem moodboards, tre bildmodeller (gpt-image-2, Nano Banana 2, FLUX.2 pro edit), tre rum med soffan behållen och bara mattan bytt. Färgtrohet väger tyngst. Resultatet väljer bildmodell och läggs i `docs/beslut.md`.

## Etapper

Ordning enligt `docs/design.md`, avsnitt 17. Bocka av när klart.

### Etapp 0 · Bevisa kärnan
- [x] Designdokument, systemprompt v0.1, testsvit med kriterier och testfall 001
- [ ] Samtalstest med testanvändaren (görs i appen i stället för i ett Claude-projekt)
- [ ] Bildtest och val av bildmodell (steg 6 ovan)

### Etapp 1a · Samtalet i webbappen
- [x] Webbapp på hemskärmen, inloggning, chatt med strömmade svar
- [x] Foton av rummet och moodboard, nedskalade och utan platsdata
- [x] Projektminne och Var vi är, flera rum, radera konto
- [x] Driftsättning via GitHub Actions och Vercel
- [x] Mikrofonknapp för diktering på svenska
- [ ] Diktering provad på iPhone, både i Safari och som app på hemskärmen
- [x] Svarstid mätt (första ordet 2 till 5 s med effort low)
- [ ] Tak per användare och dag (steg 4 ovan)

### Etapp 1b · Idéskisser i Utforska-läget
- [ ] Bildmodell anropad från Edge Function som bakgrundsjobb, resultat via Realtime
- [ ] Markering av föremål: Behåll, Byt, Ta bort, med SAM-mask och återställning av originalets pixlar
- [ ] Töm rummet
- [ ] Gilla och ogilla delar av en skiss, spår och versioner, jämför sida vid sida
- [ ] Palett med NCS- och hex-koder, uppskattade koder märkta

### Etapp 2 · Minnet
- [ ] Smakminne: `preferens_signal`, sammanfattad profil, skärmen Min smak
- [ ] Sökning i samtalsloggen (pgvector)
- [ ] Arbetssättet: signaler från första samtalet, lärdomar som aktiveras vid tillräckligt underlag
- [ ] Mina möbler

### Etapp 3 · Förverkliga
- [ ] Produktkatalog (IKEA, Lanna Möbler plus en kedja)
- [ ] Plan i steg med budget, Det här har jag tänkt på, Hitta närmaste
- [ ] Bygg själv: ritning och materiallista

### Etapp R · Röst
- [ ] Strömmad svensk taligenkänning och talsyntes med Claude som den som resonerar
- [ ] Fördröjning mätt i verklig miljö

### Etapp 4 · Fler användare
- [ ] Egen SMTP och inloggning med engångskod
- [ ] Namn och domän
- [ ] Idéloggen och ändringsförslag från användare
- [ ] Tio testanvändare

## Kända luckor

Saker som saknas eller är tillfälliga i nuvarande version. Flytta upp till Nästa steg när de blir viktiga.

- Webbläsarens taligenkänning är osäker i appar på iPhones hemskärm. Om den inte fungerar där visas tipset om tangentbordets mikrofon. Fungerar det dåligt: egen inspelning och tal till text i etapp R.

- Inget sätt att ta bort eller byta ett enskilt foto i appen. Testanvändarens rum har dubbletter från före 2026-09-27 kväll; de gör ingen skada men kan städas när borttagning finns.
- Rådgivaren ser högst 16 bilder per rum, de äldsta. Senare bilder utelämnas utan att användaren får veta det.
- Användaren kan inte byta sitt lösenord själv, det görs i Supabase.
- Var vi är går inte att läsa utan uppkoppling.
- Supabases gratisprojekt pausas efter en tids inaktivitet.
- Testsviten körs för hand.
- Webbsökningens verktygsversion (`web_search_20250305`) är den äldsta som stöds. Nyare versioner finns.

## Så börjar en ny session

1. Läs `AGENTS.md`, den här filen och `docs/lardomar.md`.
2. Kontrollera öppna pull requests och grenar i repot.
3. Fråga om det finns nya loggrader, reaktioner från testanvändaren eller idéer sedan sist.
4. Föreslå nästa steg utifrån listan ovan, eller det som ändrats.

När dagen är slut gör agenten ett dagsavslut enligt `AGENTS.md` och uppdaterar den här filen.
