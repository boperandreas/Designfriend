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

### 2026-09-27 · Konfliktmarkeringar checkades in
**Hände:** En sammanslagning av `main` in i en gren gav en konflikt i `plan.md`, men nästa steg i samma kommando checkade in allt med `git add -A`, inklusive konfliktmarkeringarna.
**Orsak:** Kommandon kedjades utan att kontrollera att sammanslagningen lyckades.
**Åtgärd:** Konflikten löstes i en ny commit.
**Regel:** Kör aldrig `git add -A` efter en sammanslagning utan att först kontrollera `git status` och söka efter `<<<<<<<`. Kedja inte merge och commit i samma kommando.

### 2026-09-27 · Röktestet ställde samma frågor i samma samtal
**Hände:** Andra körningen fortsatte samtalet från den första. Vännen svarade "samma svar som sist" och lät irriterad.
**Orsak:** Testrummet återanvändes med historik och projektminne.
**Åtgärd:** Röktestet tömmer samtal och projektminne i testrummet innan varje körning. Fotot behålls.
**Regel:** Ett test som upprepas ska börja från samma läge varje gång.

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

### 2026-09-27 · Agenten kunde inte testa appen själv
**Hände:** Utvecklaren fick skicka testmeddelanden för att agenten skulle kunna mäta.
**Orsak:** Agentens arbetsyta når inte Supabase, och connectorn kan inte anropa funktioner som inloggad användare.
**Åtgärd:** Arbetsflödet Röktest i GitHub Actions, med en egen testanvändare och ett påhittat foto. Agenten startar det med en push till grenen `rooktest`.
**Regel:** Allt agenten behöver för att verifiera sitt arbete ska den kunna starta själv.

### 2026-09-27 · Commits efter sammanslagning följde inte med
**Hände:** Lärdomar, plan och dagsavslut lades på grenen `snabbare-svar` efter att pull requesten redan slagits ihop, och hamnade aldrig i `main`.
**Åtgärd:** Togs in via grenen `supabase-koppling`.
**Regel:** Kontrollera att pull requesten är öppen innan fler commits läggs på grenen. Efter sammanslagning: ny gren från `main`.

### 2026-09-27 · Agentens miljö når inte Supabase direkt
**Hände:** Försök att anropa funktionerna från agentens arbetsyta nekades av nätverksspärren. Samma för JSR-paket i Deno-tester.
**Åtgärd:** Kontroll via GitHub Actions och loggarna i Supabase. `node:assert` i stället för `jsr:@std/assert`.
**Regel:** Verifiera driftsättning via Actions och `chat_timing`-loggen. Be användaren klistra in loggrader när det behövs.

### 2026-09-27 · Uppladdade men oskickade foton försvann ur vyn
**Hände:** Testanvändaren laddade upp rumsfotot och elva moodboardbilder men skickade inget meddelande. När hon öppnade appen igen syntes inga bilder, så hon laddade upp samma bilder en gång till. Rådgivaren såg båda omgångarna och skrev "bild 1 (samma som bild 13)". Utvecklaren trodde att hans egna tester hade blandats in i hennes konto.
**Orsak:** Bilder visades bara i skrivfältet tills de skickades. Men de sparades direkt i projektet och följde med till rådgivaren oavsett.
**Kontroll:** Via connectorn, bara antal, tider och filstorlekar. Varje konto har eget rum, eget minne och egna bilder. Inga bilder eller minnen hör till fel konto. Dubbletterna hade identisk filstorlek.
**Åtgärd:** Oskickade bilder visas igen i skrivfältet när rummet öppnas. Samma foto två gånger i ett rum stoppas med en kontrollsumma (`bild.hash`).
**Regel:** Det användaren har sparat ska synas i appen. Visar gränssnittet mindre än rådgivaren ser, blir svaren obegripliga.
### 2026-09-27 · Prompten lovade bilder som appen inte kan göra
**Hände:** Testanvändaren bad vännen ta bort en fåtölj och en pall ur fotot och väntade sig en bild. Hon fick en lång textbeskrivning.
**Orsak:** Prompten från etapp 0 sa "säg att den i appen kommer som en bild". I appen finns ingen bildredigering än, så beskedet blev otydligt.
**Åtgärd:** Prompt 0.1.2: säg i första meningen att fotot inte kan ändras än, beskriv kort, lova ingen tidpunkt. Testfall 002.
**Regel:** När appen byter miljö eller funktioner, läs prompten efter löften om sådant som inte finns.

### 2026-09-28 · Bildtjänster sparar bilder öppet om man inte säger annat
**Hände:** fal.ai:s standard är att genererade filer ligger kvar för alltid och kan läsas av alla som har adressen.
**Åtgärd:** Varje anrop skickar huvuden för radering efter tio minuter och för att inte spara anropen. Resultatet kopieras till vår egen lagring.
**Regel:** Läs lagringsvillkoren för varje ny extern tjänst som får användarnas foton, och skriv in valet i `docs/beslut.md`.

### 2026-09-29 · SAM hittade inget i röktestets påhittade foto
**Hände:** Första skissen i drift blev klar på 12,6 s, men SAM 3 gav ingen mask för "dark grey armchair" i röktestets foto, som är platta färgfält. Då visades bildmodellens bild rakt av, och resten av rummet kunde ha ändrats.
**Orsak:** Troligen att SAM är tränad på riktiga foton. Loggen visade inte vad SAM svarade.
**Åtgärd:** `skiss_timing` loggar nu antal masker och poäng per område. Hittar SAM inget jämför appen skissen med fotot i liten skala och lägger tillbaka originalet utanför det som tydligt ändrats.
**Regel:** Varje steg i en kedja av modeller ska logga vad det fick tillbaka, inte bara om det lyckades.

### 2026-09-29 · "Kort" i prompten gav 100 till 150 ord
**Hände:** Med prompt 0.2.0 blev röktestets svar 153, 95 och 103 ord, trots "två till fyra meningar". Första svaret räknade upp allt i fotot. Flera svar hade två förslag och en extra poäng på slutet. Agenten rapporterade dessutom längden i tokens men kallade det ord.
**Åtgärd:** Prompt 0.2.1: högst 60 ord, ett förslag per svar, ingen uppräkning av fotot. Kriterium S5 skärpt och S11 nytt.
**Regel:** Skriv mätbara gränser i prompten (antal ord) i stället för bara "kort". Rapportera längd i ord, räknade i svaren, inte tokens från loggen.

### 2026-09-29 · Vännen erbjöd skiss två gånger och gjorde den ändå
**Hände:** I röktestet frågade vännen "Vill du se…?" två svar i rad utan att få svar, och beställde sedan en skiss som ingen bett om. Samma körning hade "Grönt soffa" och ett svar som började med "Bra".
**Orsak:** Prompten tillät skisser "när en bild säger mer än ord", och regeln om att inte upprepa frågor gällde inte tydligt erbjudanden.
**Åtgärd:** Prompt 0.2.2: skiss bara när hon ber om det eller tackar ja, erbjudandet högst en gång. Inget "Bra" som inledning. Korrekt böjning. Kriterier S12 och S13. Röktestet räknar skisserna.
**Regel:** En skiss kostar pengar och tid. Allt som kostar görs bara när användaren bett om det.

### 2026-09-29 · Röktestets foto gick inte att använda för SAM
**Hände:** SAM hittade varken fåtölj eller matta i röktestets foto av platta färgfält, två körningar i rad.
**Åtgärd:** Röktestet gör en gång om fotot till ett fotorealistiskt rum med skissfunktionen och använder det sedan. SAM försöker igen med bara huvudordet ("armchair") om frasen inte ger träff.
**Regel:** Testdata för bildmodeller ska likna det användarna laddar upp.

### 2026-09-29 · Längdregeln följdes ena körningen men inte nästa, och prompten hade en trasig mening
**Hände:** Med 0.2.1 blev svaren 45 till 56 ord, med 0.2.2 och ett fotorealistiskt foto 82 och 98 ord. Ett svar började "Visst, säger du till". Den frasen kom från promptens första mening: "Du pratar svenska, säger du till personen".
**Åtgärd:** Prompt 0.2.3: längdgränsen står överst med ett exempel på 38 ord. Den trasiga meningen är omskriven.
**Regel:** Det viktigaste om formen står överst i prompten, med ett exempel. När vännen skriver en udda fras, sök efter den i prompten först. Bedöm längd över flera körningar, inte en.

### 2026-09-29 · Två körningar med samma prompt gav olika fel
**Hände:** Prompt 0.2.3 höll längden i båda körningarna (44 till 53 ord). I den ena erbjöd vännen ändå en skiss tre gånger i rad med olika ord. I båda beställdes skissen utan en enda mening till användaren.
**Åtgärd:** Prompt 0.2.4: ett erbjudande en enda gång oavsett formulering, de flesta svar utan fråga, alltid en mening före skissen. Samma sak i verktygets beskrivning.
**Regel:** Kör röktestet minst två gånger efter en promptändring. Ett fel som syns en gång av två kommer att nå användaren.

### 2026-09-29 · Att räkna erbjudanden gick inte att styra med prompten
**Hände:** Med 0.2.2, 0.2.3 och 0.2.4 erbjöd vännen skiss två eller tre gånger i rad i hälften av körningarna, trots allt skarpare regler om "högst en gång".
**Åtgärd:** Prompt 0.2.5: vännen erbjuder inte skisser alls. Appen visar i stället i introtexten och i skrivfältet att man kan be om en skiss.
**Regel:** En regel som kräver att modellen räknar sina egna tidigare svar är svag. Gör om den till en enkel regel och flytta upptäckbarheten till gränssnittet.

### 2026-09-29 · Vännen gjorde sitt eget antagande till användarens beslut
**Hände:** I ett röktest skrev vännen "om du vill behålla mattan" och behandlade i nästa svar mattan som en fast punkt, trots att testanvändaren aldrig sagt det.
**Åtgärd:** Prompt 0.2.6: bara det hon sagt är bestämt. Regeln om "du i stället för ni" togs bort; utvecklaren anser att "ni" kan vara ett artigt du.
**Regel:** Läs röktestets svar i följd, inte ett och ett. Fel i resonemanget syns först mellan svaren.

### 2026-09-29 · Sju prompträttelser krävde sju sammanslagningar
**Hände:** Varje promptändring kunde bara provas efter att utvecklaren slagit ihop den, eftersom röktestet går mot appen i drift. Det blev sju pull requests för prompten under en dag, och utvecklaren fick vänta på varje runda.
**Orsak:** Ingen väg att köra prompten från en gren mot Claude före sammanslagning.
**Åtgärd:** Föreslaget som steg 2 i `plan.md`: ett arbetsflöde med egen API-nyckel i GitHub som provar prompten i grenen.
**Regel:** Samla alla rättelser av samma slag i en pull request, och bygg ett sätt att prova före sammanslagning när samma slags ändring återkommer.

### 2026-09-29 · Utseendet var neutralt tills utvecklaren frågade
**Hände:** Appen byggdes med ett kallt standardutseende för en chatt. Först när utvecklaren frågade om det passade testanvändaren, en grafisk formgivare med varm smak, gjordes ett eget utseende.
**Regel:** Utforma gränssnittet för den som ska använda det från början. Ta skärmbilder av appen i telefonformat, ljust och mörkt, innan något visas för användaren.

### 2026-09-29 · Grenar som byggde på varandra syntes som en pull request
**Hände:** Agenten byggde `prompt-0.2.1` på `skiss-reservmask` och bad utvecklaren slå ihop dem i ordning. Utvecklaren såg bara den senare och slog ihop den; båda ändringarna kom med.
**Regel:** Bygg helst varje gren från `main`. Bygger en gren på en annan, säg att det räcker att slå ihop den sista.

### 2026-09-29 · pkill stängde agentens eget skal
**Hände:** `pkill -f "vite preview"` i samma kommando som commit avbröt hela kommandot.
**Regel:** Stoppa bakgrundsprocesser i ett eget kommando.

### 2026-09-29 · Skisser där något läggs till blev trasiga
**Hände:** Testanvändaren bad om ett soffbord framför soffan i stället för fåtöljen och pallen. Skisserna visade ett halvt bord, en avhuggen fäll och mörka fläckar, och bordet liknade inte hennes bild.
**Orsak:** Tre fel i agentens bygge. (1) Masken täckte bara det som togs bort. Ytan där bordet skulle stå fanns inte med, så bara bitar av bordet syntes. Vännen försökte med "rug area in front of sofa", men SAM hittar föremål, inte ytor. (2) Nytt försök med sista ordet gjorde frasen till "sofa", så soffan ritades om. (3) Bildmodellen fick aldrig bordsbilden, bara vännens beskrivning.
**Åtgärd:** Verktyget har `platser` (rutor för det nya) och `forlagor` (bilder som förlaga). Sista ordet används bara för korta föremålsnamn. Nano Banana i 2K. Prompt 0.2.7. Röktestet ber om ett bord från en förlaga.
**Regel:** Pröva varje ny bildfunktion med användarens typiska begäran (ta bort, lägga till, byta) innan hon får den. Röktestet ska innehålla en begäran av varje slag.
### 2026-09-29 · Vännen verkade hänga sig och dikteringen slutade svara
**Hände:** Testanvändaren upplevde att vännen inte svarade, och vid ett tillfälle gick mikrofonknappen inte att använda. Loggen visade att alla hennes meddelanden fått svar på servern inom 3 till 6 s.
**Orsak:** Appen förlitade sig på den strömmade anslutningen. Bröts den, till exempel när appen gick i bakgrunden, eller var svaret bara en skissbeställning utan text, stod "Tänker…" kvar. iPhone rapporterar inte alltid att taligenkänningen slutat, så knappen fastnade i läget "lyssnar".
**Åtgärd:** Appen läser samtalet och skisserna från servern efter varje svar, när den blir synlig igen och när ett svar tystnat i 45 s. Dikteringen återställs direkt vid stopp och skicka, och efter en minut utan ord.
**Regel:** Servern är sanningen. Allt som strömmas till telefonen ska gå att hämta igen från databasen.

### 2026-09-29 · Verktygets beskrivning styrde mer än prompten
**Hände:** Med en bordsbild i moodboarden erbjöd vännen skiss och gjorde sedan en som ingen bett om, trots promptens "gör en skiss bara när hon ber om det". Verktygsbeskrivningen sa bara vad verktyget gör.
**Åtgärd:** Villkoret står nu också i beskrivningen av `gor_skiss`, med exempel på vad som räknas som en begäran. Prompt 0.2.8 säger att information, som att soffan ska vara kvar, inte är en begäran.
**Regel:** När ett verktyg bara får användas under vissa villkor ska villkoret stå i verktygets egen beskrivning, inte bara i systemprompten.

### 2026-09-29 · Promptregler räckte inte för att stoppa oombedda skisser
**Hände:** Efter fyra promptversioner och en skärpt verktygsbeskrivning erbjöd vännen fortfarande skisser och gjorde skisser ingen bett om, i ungefär varannan körning. Med en bordsbild i moodboarden blev det vanligare.
**Åtgärd:** Vännen får föreslå skisser genom att anropa verktyget. En skiss startar direkt bara när användarens meddelande innehåller en begäran ("visa", "ta bort", "hur skulle det se ut", "ja"). Annars visas den som ett förslag med knappen "Gör skissen". Prompt 0.3.0.
**Regel:** När en regel om modellens beteende bryts gång på gång trots skärpningar, flytta den till gränssnittet: låt modellen föreslå och användaren bestämma. Det som kostar pengar ska användaren sätta igång.

### 2026-09-29 · En push startade röktestet två gånger
**Hände:** Två körningar av röktestet startade samtidigt på samma push och blandade sina samtal i samma testrum.
**Åtgärd:** `concurrency` i arbetsflödet, så att bara en körning går åt gången.
