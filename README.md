# Vicus per Tina

Versione di Vicus (motore Quadra) per una gestrice di Ischia con 6 case di 5 famiglie.
Mette in un solo posto quello che oggi sta tra WhatsApp, Excel, note sul telefono e schede di Chrome,
con il peso maggiore su **pulizie** e **manutenzione**.

Dati reali: Appartamento del Pozzo e Appartamento Dracena (Villa La Luna di Carta, annuncio pubblico).
Tutto il resto (famiglie, altre case, squadra, fornitori, importi, Wi-Fi, codici) è di esempio.
Data fissa della demo: 21 novembre 2026, due giorni prima dell'arrivo della prima spedizione Vicus al Pozzo.

## Avvio

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # sito statico in dist/ (quello che pubblica Netlify)
npm run build:pagina   # un solo file HTML in dist-pagina/
npm run lint
npm test               # 36 test del motore delle regole
```

Node 22. Solo `.jsx` e `.js`, niente TypeScript. Vite 8, React 19, Tailwind 4, Framer Motion.

## Pubblicazione

Il sito è su Netlify: `netlify.toml` lancia `npm run build` e pubblica `dist/`.
La demo è fuori dai motori di ricerca (`noindex`), ma chi ha il link la vede.

## Struttura

```
src/                         l'app (componenti, logica, dati di esempio)
pacchetti/regole-affitti-brevi/   motore delle regole condiviso con Quadra (fisco, adempimenti, sanzioni)
scripts/pagina-singola.mjs   unisce la build in un solo file HTML
netlify.toml                 build e intestazioni del sito
```

## Le sezioni

| Sezione | Cosa c'è |
|---|---|
| **Oggi** | Cose da fare prese da tutte le sezioni, la giornata in ordine di ora, la scheda dell'arrivo Vicus, lo stato delle case, il calendario di 14 giorni con canali e pulizie |
| **Pulizie** | Turni legati alle partenze, checklist per casa con una foto per voce, verifica con voto e ripasso, problemi mandati in manutenzione; squadra con affidabilità e compensi; biancheria per casa e lavanderia; scorte e lista della spesa; riepilogo automatico delle 19 |
| **Manutenzione** | Segnalazioni con chi le ha viste, entro quando (prossimo arrivo) e quando si possono fare (casa libera); soglia del mandato e ok della famiglia; garanzie prima di chiamare il tecnico; controlli programmati e pagamenti; dotazioni; rubrica fornitori |
| **Case** | Scheda completa: annuncio, chiavi, Wi-Fi, velocità, impianti, documenti, collegamenti (Beddy, Alloggiati Web, banca dati CIN); poi pulizia, manutenzione, conto economico e pratiche della casa |
| **Famiglie** | Rendiconto fino al netto reale, spese da approvare, registro delle decisioni |
| **Soldi** | Tasse e contributi di Tina stimati sulle entrate vere, costi dell'attività, incassi, fatture, partner |
| **Compliance** | Scadenzario unico, obblighi del gestore, imposta di soggiorno per Comune, stato delle case |
| **Cerca (⌘K)** | Case, Wi-Fi, chiavi, impianti, famiglie, addette, fornitori, prenotazioni, lavori, dotazioni, documenti, controlli |

## File scritti per Tina

- `src/data/api.js`: dati di esempio e finto backend (le chiamate restano asincrone, pronte per un'API vera)
- `src/lib/pulizie.js`: turni, affidabilità, biancheria, scorte, finestre libere, garanzie
- `src/lib/oggi.js`: agenda del giorno e lista "da fare"
- `src/components/`: `VicusTina.jsx`, `Oggi.jsx`, `Pulizie.jsx`, `Manutenzione.jsx`, `Case.jsx`, `Famiglie.jsx`, `Soldi.jsx`, `Cerca.jsx`

Gli altri componenti (Fisco, Compliance, Proprietario, Partner, Fornitori, Wizard, Playbook, Conto) vengono da Quadra.
I calcoli fiscali usano il pacchetto `regole-affitti-brevi`, copiato qui dal monorepo di Vicus alla versione 0.2.0.

## Privacy

Gli ospiti compaiono solo con codice di prenotazione e numero di persone. Nomi e documenti restano nel PMS e in Alloggiati Web.
Dati personali su server in Europa; al Comune solo numeri aggregati e anonimi.
