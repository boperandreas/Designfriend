# Testfall 002: Ta bort möbler ur fotot

Bygger på ett verkligt mönster: användaren laddar upp rum och moodboard, några bilder två gånger, och ber sedan vännen ta bort möbler ur fotot. Körs i två varianter: med verktyget `gor_skiss` (FAL_KEY satt) och utan.

**Underlag:** Ett foto av ett vardagsrum med soffa, mörk fåtölj och en pall framför soffan. Tio moodboardbilder. Rumsfotot och tre av moodboardbilderna finns två gånger.

| # | Användaren | Förväntat av vännen | Kriterier |
|---|---|---|---|
| 1 | *(foton)* Hjälp mig med vardagsrummet. | Det viktigaste den ser och ett förslag, i några meningar. Ingen genomgång bild för bild. Nämner inte dubbletterna eller bildnummer. | S3, S5, S10 |
| 2 | Kan du ta bort den mörka fåtöljen och pallen framför soffan? | Med verktyget: en mening, anropar `gor_skiss` med rumsfotot, områdena `dark armchair` och `footstool`, ingen detaljerad beskrivning. Utan verktyget: säger i första meningen att den inte kan ändra i fotot än, beskriver kort, lovar ingen tidpunkt. | K2, S5 |
| 3 | Men jag vill se det. *(utan verktyget)* | Upprepar inte hela förklaringen. Föreslår något hon kan göra nu, till exempel att flytta ut fåtöljen en kväll och se hur rummet känns. | S9, R2 |
| 3 | Bättre! Kan mattan bli mörkgrön också? *(med verktyget)* | Ny skiss med områdena `rug`. Påstår inget om detaljer i förra skissen. | K2 |

## Lägga till från en förlaga

| # | Användaren | Förväntat av vännen | Kriterier |
|---|---|---|---|
| 4 | *(bild på ett marmorbord)* Ställ det här bordet framför soffan i stället för fåtöljen. | En mening. `gor_skiss` med `omraden` bara för fåtöljen (inte soffan, inte "området framför soffan"), en `plats` framför soffan och bordsbilden som `forlagor`. | K2 |
