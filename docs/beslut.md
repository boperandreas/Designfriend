# Beslut

Varför saker är som de är. Läs innan du ändrar något som står här. Vill du ändra ett beslut, lägg till ett nytt beslut som ersätter det gamla och ange varför. Stryk inte det gamla.

Format:

```
### ÅÅÅÅ-MM-DD · Beslut
**Varför:** …
**Alternativ som valdes bort:** …
**Gäller tills:** … (om det finns ett villkor)
```

---

### 2026-09-27 · Tjänsten ska kännas som en kunnig vän
**Varför:** Bilder och produktlistor finns redan hos många. Samtalet och minnet är det som gör tjänsten värd att återvända till.
**Följder:** Rådgivarens beteende styrs av `prompts/radgivaren.md` och testas med `evals/`. Kärnprinciperna går inte att ändra genom önskemål.

### 2026-09-27 · Webbapp (PWA) i stället för app i appbutiken
**Varför:** En användare till att börja med. Ingen granskning eller utvecklarkonto, uppdateringar når användaren direkt.
**Alternativ som valdes bort:** Expo med TestFlight.
**Gäller tills:** LiDAR, RoomPlan eller liknande behövs. Då läggs webbappen i ett appskal (Capacitor), resten återanvänds.

### 2026-09-27 · Claude resonerar, även i röstläget
**Varför:** Samma vän med samma minne och principer i text och röst.
**Alternativ som valdes bort:** Snabbare realtidsröster från andra leverantörer.

### 2026-09-27 · Supabase i EU (Irland), Vercel för webbappen
**Varför:** Allt i ett för databas, inloggning, lagring och serverfunktioner. Data i EU.

### 2026-09-27 · Inloggning med e-post och lösenord
**Varför:** Mejlmallar kan inte ändras utan egen SMTP på gratisnivån, och länkar fungerar inte i en app på hemskärmen.
**Alternativ som valdes bort:** Engångskod via mejl, inloggningslänk.
**Gäller tills:** Fler användare ska bjudas in. Då egen SMTP och engångskod.

### 2026-09-27 · Foton till Claude via Files API
**Varför:** Samma id varje gång gör att promptcachen träffar, och anropen blir små.
**Följder:** Fotona lagras hos Anthropic tills kontot raderas. `radera-konto` tar bort dem.
**Alternativ som valdes bort:** Signerade adresser (bryter cachen), base64 i varje anrop (stora anrop).

### 2026-09-27 · Webbsökning påslagen för priser
**Varför:** Vännen ska kunna ange pris med källa och datum i stället för att gissa.
**Följder:** Kostar per sökning och tar några sekunder. Kan stängas av med `WEB_SEARCH_TOOL=off`.

### 2026-09-27 · Utgiftstak genom förbetalt saldo
**Varför:** Förbetalt saldo utan automatisk påfyllning begränsar kostnaden om en nyckel läcker eller något går i loop.

### 2026-09-27 · Inga verkliga personer i repot
**Varför:** Repot kan vara publikt. Foton, namn och samtal från testanvändare hålls utanför. Exempel och testfall är påhittade eller avidentifierade.

### 2026-09-27 · Supabase-connectorn för att läsa, repot för att ändra
**Varför:** Agenten ska kunna läsa loggar och status själv utan att utvecklaren kopierar. Ändringar ska fortsatt granskas i pull requests.
**Följder:** Connectorn ger bred åtkomst. Agenten läser inte användarnas samtal, foton eller minne utan uttrycklig begäran.

### 2026-09-27 · Diktering med webbläsarens taligenkänning
**Varför:** Användaren ska kunna prata in sina meddelanden. Webbläsarens inbyggda taligenkänning (Web Speech API) har svenska, kostar inget och kräver inget nytt konto. Texten hamnar i fältet och kan rättas innan den skickas.
**Följder:** Talet tolkas av webbläsarens leverantör (Apple i Safari, Google i Chrome), inte av oss. Inget ljud lagras i appen. Stödet varierar mellan webbläsare; där det saknas visar knappen hur man dikterar med tangentbordets mikrofon.
**Alternativ som valdes bort:** Egen inspelning och tal till text via separat tjänst (KB-Whisper, ElevenLabs). Kan komma med röstläget i etapp R.

### 2026-09-27 · Låg tankenivå (effort low) för samtalet
**Varför:** Standardnivån `high` gav 6 till 23 sekunder till första ordet. I ett samtal som ska kännas som en vän väger svarstiden tungt, och de flesta turer är enkla.
**Följder:** Modellen kan hoppa över tänkandet på enkla frågor och tänker kort på svåra. Om resonemangen blir sämre prövas `medium`. Ändras med hemligheten `ANTHROPIC_EFFORT` utan ny kod.
**Alternativ som valdes bort:** Stänga av tänkandet helt (sämre resonemang), byta till en snabbare modell (Claude ska resonera, och Sonnet ger bättre råd).

### 2026-09-28 · Idéskisser före bildtestet, via fal.ai
**Varför:** Testanvändaren bad första kvällen om att få möbler borttagna ur fotot. Utvecklaren bestämde att bildredigeringen tas nu, före bildtestet i etapp 0. fal.ai har alla tre bildmodellerna från designen (Nano Banana 2, gpt-image-2, FLUX.2 pro edit) och SAM 3 bakom en nyckel. Då kan modellerna jämföras i appen genom att byta hemligheten `FAL_MODELL`, utan tre konton.
**Följder:** Standard är Nano Banana 2, snabb och bra på att ta bort föremål. Bildtestet görs i stället i appen med verkliga rum. Foton skickas till fal i USA som tidsbegränsade adresser. fal behåller annars filer för alltid och öppet, så varje anrop ber om radering efter tio minuter och att anropen inte sparas (`X-Fal-Object-Lifecycle-Preference`, `X-Fal-Store-IO`). Resultatet kopieras genast till vår lagring i EU och raderas med kontot.
**Alternativ som valdes bort:** Ett konto per modelltillverkare (tre nycklar, tre saldon). Black Forest Labs EU-slutpunkt (bara FLUX, ingen SAM).

### 2026-09-28 · Vännen beställer skisser med ett verktyg, masker från SAM 3 via text
**Varför:** Användaren ber om ändringar i vanliga ord ("ta bort fåtöljen"). Claude översätter det till en instruktion och till de områden som får ändras ("dark armchair", "footstool"). SAM 3 hittar områdena från texten, så ingen markering med fingret behövs i första versionen.
**Följder:** Markering genom tryck (Behåll, Byt, Ta bort) kommer senare och använder samma masker. Claude ser inte själva skissen, bara att den är gjord.

### 2026-09-28 · Originalets pixlar läggs tillbaka i appen, inte i serverfunktionen
**Varför:** Bildmodellen ritar om hela fotot. Regel 7 kräver att det som inte ändras är oförändrat. Att avkoda och blanda ett foto på 2000 px i en Edge Function riskerar gratisnivåns gräns för processortid. Telefonens canvas gör det på en bråkdel av en sekund.
**Följder:** Masken växer med 1,5 procent av bildens bredd (skuggor och kanter följer med) och mjukas ut. Utanför den är varje pixel originalets. Skissen sparas omonterad; den monteras varje gång den visas. Hittar SAM inget område visas bildmodellens bild som den är.

### 2026-09-29 · Vännen erbjuder inte skisser, appen visar att de finns
**Varför:** Regeln "erbjud en gång" bröts i hälften av röktesterna och blev tjat. Att be om en skiss är lätt när man vet att det går.
**Följder:** Introtexten och skrivfältets ledtext nämner skisser. Vännen gör skiss bara på begäran.
**Alternativ som valdes bort:** Kod som känner igen erbjudanden i tidigare svar (bryter mot regel 3), fler skärpningar av samma promptregel.

### 2026-09-29 · Varmt papper: nytt utseende för appen
**Varför:** Första versionen hade ett neutralt, kallt chattutseende (grågrönt, systemtypsnitt, bubblor på båda sidor). Testanvändaren är grafisk formgivare med varm, naturlig smak. Utvecklaren valde förslaget "varmt papper".
**Följder:** Varmt ljust underlag och cognac som accent, mörk vägg med varmt ljus i mörkt läge. Fraunces i rubriker och bildtexter, Inter i löptext, båda från npm så att de fungerar utan uppkoppling. Vännens svar står fritt med en tunn linje; bara användarens meddelanden ligger i bubblor. NCS-koder i svaren visas som färgprov märkta "ungefär på skärm" (w3color-approximationen). Foto och moodboard läggs till bakom en plusknapp.
**Alternativ som valdes bort:** Visa två eller tre riktningar för testanvändaren först. Kan göras senare; utseendet ligger i `web/src/styles.css`.

### 2026-09-29 · Plats och förlaga i skisserna
**Varför:** Att lägga till något kräver en yta som får ändras, och SAM kan bara hitta föremål. Claude ser fotot och kan ange en ungefärlig ruta. Bildmodellen behöver se föremålet användaren visat för att det ska likna.
**Följder:** Masken är föremålen från SAM plus rutorna, växta och utmjukade. Förlagor skickas som extra bilder till bildmodellen. Upplösningen är 2K (cirka 1,20 kr per skiss i stället för 0,80 kr).
**Alternativ som valdes bort:** Masken ur skillnaden mellan skiss och foto (fångar allt modellen råkat ändra), låta användaren rita rutan (senare, med markering genom tryck).

### 2026-09-29 · Skissförslag med knapp i stället för förbud
**Varför:** Vännen vill visa skisser, och promptregler stoppade det inte. En skiss kostar pengar och tid. Ett förslag som användaren själv startar ger henne kontrollen, och vännens idé blir en funktion i stället för tjat.
**Följder:** `skiss.status` kan vara `forslag`. `chat` avgör med en ordlista (`bersOmSkiss`) om användaren bett att få se något; det är en kostnadsspärr, inte en regel om tonen, och därför i koden. Förslag räknas inte mot dygnstaket förrän de startas.
**Alternativ som valdes bort:** Fler promptskärpningar; ta bort verktyget när användaren inte bett om bild (då påstår vännen att den inte kan göra skisser); en separat modell som bedömer begäran (fördröjning och kostnad).

### 2026-09-29 · Skisser steg för steg, och rektangulära masker
**Varför:** Man arbetar med en skiss genom att rätta den, inte genom att börja om. En konturmask fungerar för att ta bort men inte för att byta mot något med annan form.
**Följder:** Appen sparar den monterade skissen, och nästa skiss utgår från den när användaren ber om ändringar i skissen. Utanför det som ändras är varje pixel kvar från den förra skissen, så det användaren redan sett ligger kvar. Masken är rektangeln runt föremålet med 5 % marginal, så lite mer än föremålet ritas om.
**Alternativ som valdes bort:** Montera skissen i serverfunktionen (processortid på gratisnivån); låta vännen beskriva alla tidigare ändringar på nytt (varje skiss blev en ny tolkning).
