# Plan

Var vi står och vad som är nästa steg. **Läs den här filen först i varje ny session**, tillsammans med `AGENTS.md` och `docs/lardomar.md`. Uppdatera den i samma pull request som ändrar läget: bocka av, flytta upp nästa steg, skriv datum.

Designen och skälen finns i `docs/design.md` och `docs/beslut.md`. Den här filen handlar bara om ordning och status.

Senast uppdaterad: 2026-09-29

---

## Läget just nu

- **Etapp 1a är i drift.** Webbappen på Vercel, serverfunktionerna i Supabase (EU, Irland). Utvecklaren, testanvändaren och röktestets testanvändare. Inloggning med e-post och lösenord.
- **Idéskisser i drift sedan 2026-09-29.** Vännen beställer en skiss med verktyget `gor_skiss` när användaren ber om det. SAM 3 och Nano Banana 2 via fal.ai gör den på 12 till 33 s. Appen lägger tillbaka originalets pixlar utanför masken. På röktestets fotorealistiska foto hittade SAM fåtöljen med 96 % säkerhet i alla körningar.
- **Prompt 0.2.6.** Högst 60 ord och ett förslag per svar, ingen uppräkning av fotot, skiss bara på begäran, egna antaganden blir aldrig användarens beslut. Två röktester i rad: 33 till 55 ord, inga skisserbjudanden, inga påhittade beslut. Kvar: "Bra att veta" som inledning ibland.
- **Nytt utseende, varmt papper.** Fraunces och Inter, cognac som accent, mörkt läge som mörk vägg. NCS-koder i svaren visas som ungefärliga färgprov. Utlagt 2026-09-29.
- **Svarstid:** första ordet efter cirka 2 s, 5 till 8 s för första svaret i ett nytt samtal.
- **Testanvändarens data är skild från utvecklarens.** Kontrollerat 2026-09-27: varje konto har egna rum, bilder och minne. "Bild 1 (samma som bild 13)" berodde på att hon laddade upp samma bilder två gånger; det är rättat i appen.
- **Agenten läser loggar och testar själv** via Supabase-connectorn och röktestet, se `AGENTS.md`.

## Nästa steg, i ordning

1. **Testanvändaren provar igen.** Skisser på hennes riktiga foto (fåtöljen och pallen), det nya utseendet och NCS-proven. Agenten läser `skiss_timing` och `chat_timing`. Utvecklaren samlar hennes reaktioner (H1–H3 i `evals/kriterier.md`): känns det som en vän, hjälper skisserna, stämmer färgproven.
2. **Prova prompten innan den slås ihop.** I dag krävde varje prompträttelse en sammanslagning, sju på en dag, eftersom röktestet bara går mot appen i drift. Förslag: `ANTHROPIC_API_KEY` som hemlighet i GitHub och ett arbetsflöde som spelar upp röktestets meddelanden och `evals/fall/` mot prompten i grenen, två gånger, och räknar ord, frågor och skisserbjudanden. En separat bedömarmodell kan läggas till sedan. Ersätter det gamla steget om automatisk testsvit.
3. **Tak per användare och dag i `chat`.** Skisserna har redan ett tak (`SKISS_PER_DYGN`), samtalet saknar det.
4. **Jämför bildmodellerna på riktiga rum.** Byt `FAL_MODELL` mellan Nano Banana 2, gpt-image-2 och FLUX.2 pro edit, samma begäran, färgtrohet väger tyngst. Resultatet i `docs/beslut.md`. Ersätter bildtestet i etapp 0.
5. **Resten av etapp 1b** efter testanvändarens reaktioner: markering genom tryck (Behåll, Byt, Ta bort), Töm rummet, jämför skisser sida vid sida.
6. **Prompt v0.3** efter testanvändarens reaktioner. Granska mot `evals/kriterier.md` och testfall 001 och 002.

## Etapper

Ordning enligt `docs/design.md`, avsnitt 17. Bocka av när klart.

### Etapp 0 · Bevisa kärnan
- [x] Designdokument, systemprompt v0.1, testsvit med kriterier och testfall 001
- [ ] Samtalstest med testanvändaren (görs i appen i stället för i ett Claude-projekt)
- [ ] Bildtest och val av bildmodell (görs i appen, steg 4 ovan)

### Etapp 1a · Samtalet i webbappen
- [x] Webbapp på hemskärmen, inloggning, chatt med strömmade svar
- [x] Foton av rummet och moodboard, nedskalade och utan platsdata
- [x] Projektminne och Var vi är, flera rum, radera konto
- [x] Driftsättning via GitHub Actions och Vercel
- [x] Mikrofonknapp för diktering på svenska
- [ ] Diktering provad på iPhone, både i Safari och som app på hemskärmen
- [x] Svarstid mätt (första ordet 2 till 5 s med effort low)
- [ ] Tak per användare och dag (steg 3 ovan)

### Etapp 1b · Idéskisser i Utforska-läget
- [x] Bildmodell anropad från Edge Function som bakgrundsjobb, resultat via Realtime (provat i röktestet)
- [x] SAM-mask från text och återställning av originalets pixlar utanför masken
- [ ] Jämföra Nano Banana 2, gpt-image-2 och FLUX.2 pro edit på verkliga rum (ersätter bildtestet i etapp 0)
- [ ] Markering av föremål genom tryck: Behåll, Byt, Ta bort
- [ ] Töm rummet
- [ ] Gilla och ogilla delar av en skiss, spår och versioner, jämför sida vid sida
- [x] NCS-koder i svaren som färgprov, märkta ungefärliga
- [ ] Palett för rummet med NCS- och hex-koder, uppskattade koder ur foto märkta

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
- Testsviten körs för hand, och promptändringar kan bara provas i drift (steg 2 ovan).
- NCS-färgproven är en approximation (w3color). Ingen omräkning är exakt; testanvändaren kan bedöma hur fel den är.
- Testanvändarens första samtal har långa svar från prompt 0.1 och dubbla bilder. Hon kan börja ett nytt rum under Mer.
- Vännen ser inte skisserna den beställt, bara att de finns. Den kan inte kommentera detaljer i dem.
- Skisser sparas omonterade och monteras i telefonen varje gång de visas. Går inte att dela eller spara som färdig bild än.
- Webbsökningens verktygsversion (`web_search_20250305`) är den äldsta som stöds. Nyare versioner finns.

## Så börjar en ny session

1. Läs `AGENTS.md`, den här filen och `docs/lardomar.md`.
2. Kontrollera öppna pull requests och grenar i repot.
3. Fråga om det finns nya loggrader, reaktioner från testanvändaren eller idéer sedan sist.
4. Föreslå nästa steg utifrån listan ovan, eller det som ändrats.

När dagen är slut gör agenten ett dagsavslut enligt `AGENTS.md` och uppdaterar den här filen.
