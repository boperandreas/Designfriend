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
