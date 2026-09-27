# Driftsättning

Så blir webbappen tillgänglig. Allt görs i webbläsaren, ingen terminal behövs. Du gör det en gång. Därefter går nya versioner ut automatiskt när en pull request slås ihop.

Hemliga nycklar klistras bara in i respektive tjänst, aldrig i chatten, i koden eller i ett mejl.

## 1. Anthropic: API-nyckel och utgiftstak

1. Gå till platform.claude.com, lägg in betalning.
2. Skapa en API-nyckel under **API keys**. Kopiera den, du behöver den i steg 3.
3. Sätt ett månadstak under **Limits**, till exempel några hundra kronor. Det skyddar mot överraskningar.

## 2. Supabase: inloggning

I Supabase-projektet:

1. **Authentication → Sign In / Providers:** Email ska vara påslaget. Stäng av **Allow new users to sign up**. Då kan bara personer du lagt till logga in.
2. **Authentication → Emails → Templates → Magic link:** ersätt innehållet så att mejlet visar koden. Till exempel:
   - Ämne: `Din kod till Designfriend`
   - Text: `<p>Din kod är <strong>{{ .Token }}</strong></p><p>Den gäller en kort stund.</p>`

   Appen loggar in med kod, eftersom en webbapp på iPhones hemskärm inte kan ta emot en inloggningslänk.
3. **Authentication → Users → Add user → Create new user:** lägg till Susies e-postadress och kryssa i **Auto Confirm User**. Lägg gärna till dig själv också, för att testa.

## 3. Supabase: hemligheten för Claude

**Edge Functions → Secrets → Add new secret:**

| Namn | Värde |
|---|---|
| `ANTHROPIC_API_KEY` | nyckeln från steg 1 |

Valfritt: `ANTHROPIC_MODEL` om du vill byta modell (standard är `claude-sonnet-5`), och `WEB_SEARCH_TOOL` = `off` om vännen inte ska kunna söka på webben efter priser.

## 4. GitHub: så att databasen och funktionerna driftsätts automatiskt

I repot på GitHub, **Settings → Secrets and variables → Actions → New repository secret:**

| Namn | Var du hittar värdet |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com → din profil → **Access Tokens** → Generate new token |
| `SUPABASE_DB_PASSWORD` | databaslösenordet du valde när projektet skapades |

När pull requesten slås ihop kör GitHub arbetsflödet **Deploy Supabase**. Det skapar tabellerna och lägger ut serverfunktionerna. Du ser resultatet under fliken **Actions**. Du kan också starta det för hand där med **Run workflow**.

## 5. Vercel: själva webbappen

1. Gå till vercel.com och logga in med GitHub.
2. **Add New → Project**, välj `boperandreas/designfriend`.
3. Sätt **Root Directory** till `web`. Resten fylls i automatiskt.
4. **Deploy.**

Du får en adress som slutar på `.vercel.app`. Varje gång `main` ändras byggs en ny version.

Tillbaka i Supabase: **Authentication → URL Configuration → Site URL**, lägg in adressen från Vercel.

## 6. Prova

1. Öppna adressen i Safari på telefonen.
2. Tryck på dela-knappen och välj **Lägg till på hemskärmen**.
3. Öppna appen från hemskärmen, skriv e-postadressen och koden från mejlet.
4. Ladda upp ett foto av ett rum och skriv några rader.

Sedan skickar du adressen till Susie.

## Om något inte fungerar

| Det som händer | Troligen |
|---|---|
| "Den här adressen är inte inbjuden" | Adressen finns inte under Authentication → Users |
| Mejlet innehåller en länk men ingen kod | Mejlmallen i steg 2 är inte ändrad |
| "Vännen svarar inte just nu" | `ANTHROPIC_API_KEY` saknas eller är fel, eller modellnamnet stämmer inte. Se Edge Functions → chat → Logs |
| Arbetsflödet i GitHub misslyckas | Någon av hemligheterna i steg 4 saknas |
| Koden kommer inte fram | Supabases inbyggda mejl skickar bara ett fåtal mejl i timmen. Vänta en stund |
