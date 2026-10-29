# Casamatta bistrò e design: sito demo

Demo one-page per **Casamatta bistrò e design**, Piazza Castello 26, 15033 Casale Monferrato (AL).
Online: https://gxmich.github.io/casamatta-bistro-demo/

## Come aprirlo
Doppio clic su `index.html` (servono internet per GSAP, Google Fonts e la mappa).
Per una prova fedele: `python -m http.server 8765` nella cartella e poi http://127.0.0.1:8765/

## Direzione di design (versione 2, 29/10/2026)
Tutto parte dalle foto reali del locale e dal loro logo.
- **Logo**: CASAMATTA in un bastoni geometrico (Josefin Sans), arancio, dentro una doppia cornice sfalsata; la prima T del finale salta in alto e l'ultima A è capovolta. Il sito lo ricostruisce in HTML/CSS e lo anima.
- **Materiali come palette**: carbone delle tovagliette, marmo bianco del bancone, mattone delle volte, velluto verde mela delle poltroncine, foglia d'oro e rosa delle tele pop. Ogni colore compare dove esiste davvero il materiale.
- **Motivi**: archi come le volte a crociera, volute barocche bianche come tovagliette e balaustra, cornice doppia del logo su bottoni e card.
- **Font**: Bodoni Moda (l'antico) e Josefin Sans (il logo, il moderno).
- **Sezioni**: hero "Casa, ma un po' matta"; voce di vocabolario "casamatta"; il design materia per materia; la giornata dalle 7 a notte (scroll orizzontale con colore che cambia); menu a schede con 63 voci e prezzi; Pizza Zero Lievito su mattone con i 23 paesi; bancone e cantina; galleria con recensioni; voucher come tovagliette; prenotazione WhatsApp su velluto verde con orari e "aperto ora".

## Struttura
- `index.html`, `css/styles.css`, `js/main.js` (GSAP 3.12 + ScrollTrigger)
- `img/real/`: foto reali ottimizzate (1600/800 px) e ritagli; `img/real/sizes.txt` le dimensioni
- `img/web/`: alcune foto dal loro menu digitale (cocktail, peperoni, brasato, cheesecake)
- `img/` (radice) e `img/qr/`: originali scaricati, non usati dalla pagina

## Fonti dei dati
- Menu, prezzi, orari, testo del manifesto, voucher e prenotazione WhatsApp: menu digitale ufficiale https://qrcodeservice.it/index.aspx?ID=11
- Indirizzo, telefono, Instagram @casamattabistro, valutazione 4,1 con 345 recensioni, foto: scheda Google del locale
- Recensioni citate: Google, tramite aggregatori (Sluurpy, Italiarecensioni)

## Da completare prima della messa online
- P.IVA, ragione sociale, pagine Privacy e Cookie (ora link `#`)
- Foto professionali: le foto del locale sono scatti degli ospiti presi dalla scheda Google, usabili solo per la demo
- Contenuto dei voucher da 50 e 75 euro, descrizioni complete delle jacket potatoes
- Verifica orari con il titolare: il menu digitale e Google riportano orari diversi (la demo usa quelli del menu)
