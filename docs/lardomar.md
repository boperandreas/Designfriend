# Lärdomar

Det vi har lärt oss, oftast av misstag, så att det inte upprepas. Läs den här filen innan du börjar arbeta i repot.

**Lägg till en post** när något gick fel, tog oväntat lång tid eller överraskade. Nyast överst inom varje avsnitt. Skriv kort: vad hände, varför, vad gjorde vi, vad gäller framåt. När samma sak dyker upp igen, gör regeln till en regel i `AGENTS.md`.

Format:

```
### ÅÅÅÅ-MM-DD · Kort rubrik
**Hände:** …
**Orsak:** …
**Åtgärd:** …
**Regel:** …
```

---

## Rådgivaren och prompten

### 2026-09-27 · Påhittat sakfel i exempelsamtalet
**Hände:** Första versionen av exempelsamtalet rekommenderade bouclé som tåligt mot hundklor.
**Orsak:** Påståendet lät rimligt och kontrollerades inte. Bouclé har öglor som fastnar i klor.
**Åtgärd:** Rättat till pigmenterat läder. Kriteriet R6 (sakfel) finns i `evals/kriterier.md`.
**Regel:** Sakpåståenden om material, färgning och byggteknik i prompt, exempel och testfall kontrolleras innan de läggs in.

### 2026-09-27 · Exempelsamtal som bara ser bra ut
**Hände:** Första exempelsamtalet lät bra vid en läsning men bröt mot flera av våra egna regler: vännen styrde allt estetiskt, användaren höll alltid med, svaren var långa och en lärdom om arbetssättet kom utan tillräckligt underlag.
**Orsak:** Samtalet granskades inte mot kriterierna.
**Åtgärd:** Omskrivet och granskat mot `evals/kriterier.md` i flera varv.
**Regel:** Varje ändring i prompt eller exempel granskas mot kriterierna, inte bara läses igenom.

### 2026-09-27 · Otydlig formulering i prompten
**Hände:** "Du pratar svenska, säger du, och …" gick att läsa på två sätt.
**Åtgärd:** Omformulerat till "säger du till personen".
**Regel:** Läs prompten högt efter ändringar. Varje mening ska bara gå att förstå på ett sätt.

## Claude API

### 2026-09-27 · Långsamma svar, cachen missade varje gång
**Hände:** Första versionen av appen svarade långsamt.
**Orsak:** Två fel gjorde att promptcachen aldrig träffade. Systemprompten innehöll projektminnet och tiden sedan förra meddelandet, som ändras varje tur. Fotona skickades som nya signerade adresser varje gång, så Anthropic hämtade dem på nytt och början av anropet blev aldrig identisk.
**Åtgärd:** Statisk systemprompt. Minne och tid skickas med senaste användarmeddelandet. Foton laddas upp en gång till Files API och refereras med id. Cache med en timmes livslängd. Loggraden `chat_timing` visar cacheträffar och tider.
**Regel:** Början av varje anrop (tools, system, foton, historik) ska vara identisk mellan turer. Kontrollera `cache_read_tokens` i loggen efter ändringar i anropet. Regel 9 i `AGENTS.md`.

### 2026-09-27 · Sonnet 5 tänker länge innan första ordet
**Hände:** Röktestet visade att cachen fungerade, men det tog 6 till 23 sekunder till första ordet och 7 till 18 sekunder mellan att Claude började och att text kom. Första svaret var 1 668 tokens trots att prompten ber om korta svar.
**Orsak:** Claude Sonnet 5 har adaptivt tänkande påslaget som standard med effort `high`. Tänkandet sker före texten och räknas som output.
**Åtgärd:** `output_config.effort` sätts till `low` (inställbart med `ANTHROPIC_EFFORT`). Loggen visar `thinking_tokens` och `thinking_start_ms`. Vid 400 faller anropet tillbaka till en enkel fråga utan verktyg och effort.
**Regel:** Kontrollera modellens standardinställningar för tänkande och effort innan den används i ett samtal där svarstiden känns. Mät med röktestet efter varje byte av modell eller inställning.

### 2026-09-27 · Identity federation i stället för API-nyckel
**Hände:** Konsolen föreslog identity federation när nyckeln skapades.
**Orsak:** Det fungerar bara från GCP, AWS, Azure och GitHub Actions, inte från Supabase Edge Functions.
**Regel:** Använd API-nyckel som hemlighet i Supabase. Förbetalt saldo utan automatisk påfyllning fungerar som utgiftstak.

## Supabase

### 2026-09-27 · Mejlmallar går inte att ändra på gratisnivån
**Hände:** Planen var inloggning med engångskod via mejl. Mallarna gick inte att redigera.
**Orsak:** Supabase kräver egen SMTP för att ändra mejlmallar, och standardmejlet innehåller en länk, inte en kod.
**Åtgärd:** Inloggning med e-post och lösenord som utvecklaren sätter. Inga mejl skickas.
**Regel:** Kontrollera vad gratisnivån tillåter innan en funktion byggs på den. Kod via mejl först när egen SMTP finns.

### 2026-09-27 · Nya projekt har publishable key, inte alltid anon key
**Orsak:** Nya Supabase-projekt använder nya nyckeltyper. Det är inte säkert att `SUPABASE_ANON_KEY` finns i funktionernas miljö, och JWT-kontrollen i gatewayen kan krångla med nya signeringsnycklar.
**Åtgärd:** Funktionerna använder `SUPABASE_ANON_KEY` om den finns, annars `apikey`-headern från appen. `verify_jwt = false` i `config.toml` och kontroll med `auth.getUser()` i funktionen.
**Regel:** Förutsätt inte gamla nyckelnamn. Kontrollera användaren i funktionen.

### 2026-09-27 · Tabeller exponeras inte automatiskt
**Orsak:** Projektet skapades med "Automatically expose new tables" avstängt och automatisk RLS påslagen, vilket är det säkra valet.
**Regel:** Varje ny tabell behöver RLS-policy och uttryckliga `grant` till `authenticated` i migreringen, annars syns den inte i appen.

## Webbappen

### 2026-09-27 · Inloggningslänkar fungerar inte i en app på iPhones hemskärm
**Orsak:** En webbapp på hemskärmen har egen lagring, skild från Safari. En länk i mejlet öppnas i Safari och loggar in där.
**Regel:** Ingen inloggning via länk. Regel 6 i `AGENTS.md`.

### 2026-09-27 · StrictMode körde effekten två gånger
**Hände:** Risk för två "Mitt rum" vid första inloggningen i utvecklingsläge.
**Åtgärd:** En `useRef`-spärr runt effekten som skapar första projektet.
**Regel:** Effekter som skapar data ska tåla att köras två gånger.

### 2026-09-27 · Vitest föll på import av Supabase-klienten
**Orsak:** Testet importerade en modul som skapar Supabase-klienten, och miljövariablerna saknas i testmiljön.
**Åtgärd:** Rena hjälpfunktioner i egna moduler (`storlek.ts`, `text.ts`).
**Regel:** Logik som ska testas ligger i moduler utan sidoeffekter vid import.

### 2026-09-27 · `.env.production` ignorerades av git
**Orsak:** `.gitignore` ignorerade `.env.*`.
**Åtgärd:** Undantag för `web/.env.production`, som bara innehåller publika värden.
**Regel:** Hemliga värden läggs aldrig i en `.env`-fil i repot. Publika värden får ligga i `web/.env.production`.

## Drift och arbetsflöde

### 2026-09-27 · Vercel: konto först, sedan GitHub
**Hände:** "Continue with GitHub" ledde tillbaka till inloggningen.
**Orsak:** Inget Vercel-konto fanns. Registrera först, välj Hobby, koppla sedan GitHub.
**Regel:** Root Directory ska vara `web`, annars byggs fel mapp.

### 2026-09-27 · CI körs på pull request, inte på push till gren
**Regel:** Öppna en pull request för att få CI att köra. Driftsättning av Supabase sker bara när `main` ändras.

### 2026-09-27 · Utvecklaren fick kopiera loggrader åt agenten
**Hände:** Agenten bad utvecklaren öppna loggar i Supabase och klistra in dem.
**Orsak:** Agentens arbetsyta når inte Supabase direkt.
**Åtgärd:** Supabase-connectorn ansluten i claude.ai. Agenten läser loggar, funktioner och migreringar själv.
**Regel:** Be aldrig utvecklaren kopiera något agenten kan läsa via en connector. Leta efter en connector först.

### 2026-09-27 · Commits efter sammanslagning följde inte med
**Hände:** Lärdomar, plan och dagsavslut lades på grenen `snabbare-svar` efter att pull requesten redan slagits ihop, och hamnade aldrig i `main`.
**Åtgärd:** Togs in via grenen `supabase-koppling`.
**Regel:** Kontrollera att pull requesten är öppen innan fler commits läggs på grenen. Efter sammanslagning: ny gren från `main`.

### 2026-09-27 · Agentens miljö når inte Supabase direkt
**Hände:** Försök att anropa funktionerna från agentens arbetsyta nekades av nätverksspärren. Samma för JSR-paket i Deno-tester.
**Åtgärd:** Kontroll via GitHub Actions och loggarna i Supabase. `node:assert` i stället för `jsr:@std/assert`.
**Regel:** Verifiera driftsättning via Actions och `chat_timing`-loggen. Be användaren klistra in loggrader när det behövs.
