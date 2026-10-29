# Casamatta bistrò e design — sito demo

Demo one-page realizzata il 29/10/2026 per presentare un sito al cliente
**Casamatta bistrò e design** — Piazza Castello 26, 15033 Casale Monferrato (AL).

## Come aprire
Doppio clic su `index.html` (serve connessione internet: GSAP da cdnjs, Google Fonts, mappa Google).
Per una prova locale più fedele: `python -m http.server 8765` nella cartella e poi http://127.0.0.1:8765/

## Struttura
- `index.html` — pagina unica (hero, il locale, giornata, menu, Zero Lievito, cocktail & cantina, galleria, voucher, recensioni, contatti)
- `css/styles.css` — design system (token colore in `:root`, Cormorant Garamond + Manrope)
- `js/main.js` — animazioni GSAP 3.12 + ScrollTrigger (preloader, split-text, parallax, sezione orizzontale, marquee, contatori, tab menu, nav mobile)
- `img/web/` — 30 foto ottimizzate (+ versioni `-sm`) prese dal sito menu QR del locale; `img/web/catalog.md` descrive ogni file
- `img/qr/` — originali scaricati da qrcodeservice.it (non usati direttamente)

## Fonti dei dati
- Menu, prezzi, orari, testo "manifesto", voucher, prenotazione WhatsApp: https://qrcodeservice.it/index.aspx?ID=11 (menu digitale ufficiale)
- Indirizzo, telefono, Instagram (@casamattabistro), anno apertura (autunno 2022), recensioni: scheda Google + aggregatori (RestaurantGuru, Sluurpy, Wanderlog)
- Email: info@casamattabistro.it (pagina contatti del menu digitale)

## Da completare prima della messa online
- P.IVA, ragione sociale, CIN/SDI nel footer; pagine Privacy e Cookie (oggi link `#`)
- Foto degli interni, delle pizze Zero Lievito, dei primi e della colazione: non esistono nelle fonti pubbliche, da chiedere al cliente (le sezioni sono ora tipografiche)
- Verifica orari e prezzi con il titolare (aggiornati al menu online di oggi)
- Dominio e hosting; eventuale prenotazione online
