# Testsvit

Testar rådgivarens beteende, alltså prompten i `prompts/radgivaren.md`, inte appens kod.

- `kriterier.md` – vad som bedöms och målen.
- `fall/` – testfall med användarens repliker i ordning och vad som förväntas.

## Så körs den

**Etapp 0 (för hand):** spela upp ett testfall i ett Claude-projekt med prompten som instruktioner, ett pass per nytt samtal. Gå igenom svaren mot kriterierna och notera varje avvikelse med kriteriets id.

**Etapp 1 och framåt (automatiskt):** ett skript spelar upp fallen mot prompten via API:et och låter en separat bedömarmodell gå igenom varje svar mot kriterierna. Ändringar i prompten slås inte ihop om de gör något kriterium sämre.
