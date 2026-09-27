# Driftsättning

Så blir webbappen tillgänglig. Allt görs i webbläsaren, ingen terminal behövs. Du gör det en gång. Därefter går nya versioner ut automatiskt när en pull request slås ihop.

Hemliga nycklar klistras bara in i respektive tjänst, aldrig i chatten, i koden eller i ett mejl.

## 1. Anthropic: API-nyckel och utgiftstak

1. Gå till platform.claude.com, lägg in betalning.
2. Skapa en API-nyckel under **API keys**. Kopiera den, du behöver den i steg 3.
3. Sätt ett månadstak under **Limits**, till exempel några hundra kronor. Det skyddar mot överraskningar.

## 2. Supabase: inloggning

I Supabase-projektet:

1. **Authentication → Sign In / Providers:** stäng av **Allow new users to sign up** och klicka på **Save changes**. Email ska stå som Enabled. Då kan bara personer du lagt till logga in.
2. **Authentication → Users → Add user → Create new user:** skriv e-postadress och ett lösenord, och kryssa i **Auto Confirm User**. Gör det för Susie och för dig själv. Lämna lösenordet till Susie muntligt eller i ett sms, inte i ett mejl.

Appen loggar in med e-post och lösenord. Inga mejl skickas, så mejlmallarna behöver inte ändras. En inloggningslänk skulle inte fungera, eftersom en webbapp på iPhones hemskärm har egen lagring skild från Safari.

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
3. Öppna appen från hemskärmen och logga in med e-post och lösenord.
4. Ladda upp ett foto av ett rum och skriv några rader.

Sedan skickar du adressen till Susie.

## Om något inte fungerar

| Det som händer | Troligen |
|---|---|
| "E-postadressen eller lösenordet stämmer inte" | Kontrollera användaren under Authentication → Users, eller sätt ett nytt lösenord där |
| "Vännen svarar inte just nu" | `ANTHROPIC_API_KEY` saknas eller är fel, eller modellnamnet stämmer inte. Se Edge Functions → chat → Logs |
| Arbetsflödet i GitHub misslyckas | Någon av hemligheterna i steg 4 saknas |

## Testanvändare för röktestet

Agenten kan testa appen i drift själv med arbetsflödet **Röktest**. Det behöver en egen testanvändare, aldrig en verklig person:

1. **Supabase → Authentication → Users → Add user → Create new user:** till exempel `rooktest@` följt av din egen domän eller en adress du äger, ett långt lösenord, **Auto Confirm User**.
2. **GitHub → Settings → Secrets and variables → Actions:** lägg till `TEST_EMAIL` och `TEST_PASSWORD` med samma värden.

Testanvändaren får ett eget rum, Röktest, med ett påhittat foto.

## Mäta svarstiden

Varje svar skriver en rad i loggen: **Edge Functions → chat → Logs**, sök på `chat_timing`. Fälten:

| Fält | Betyder |
|---|---|
| `db_ms` | Tid tills databasen svarat |
| `files_ms`, `new_files` | Tid för att ladda upp nya foton till Anthropic. Sker bara första gången ett foto används |
| `claude_headers_ms` | Tid tills Claude börjat svara |
| `first_token_ms` | Tid tills första ordet skickas till telefonen. Den siffra som känns |
| `total_ms` | Hela svaret |
| `cache_read_tokens` | Hur mycket som lästes från cachen. Högt är bra |
| `cache_write_tokens` | Hur mycket som skrevs till cachen. Högt vid första meddelandet och efter en paus på mer än en timme |
| `web_searches` | Antal webbsökningar. Varje sökning tar några sekunder |
