# Modifiche

## 0.2.0 · 8 novembre 2026

- Nuovo modulo `fisco.js`: previsionale del forfettario per codice ATECO, contributi INPS commercianti 2026 (circolare n. 14/2026) con la riduzione del 35%, acconti e versamenti dell'anno dopo, cedolare e ritenute dei proprietari, limite dei contanti, bollo sulle fatture.
- Nuovo modulo `gestore.js`: 19 obblighi del gestore come attività (mandati, ritenute, CU e 770, Alloggiati, statistica, imposta di soggiorno, fatturazione, privacy, contanti) e `prossimaScadenza`.
- Le scadenze nel fine settimana slittano al lunedì (`giornoUtile`).
- 16 test nuovi, 36 in tutto.

## 0.1.0 · 10 ottobre 2026

Prima versione condivisa. Unisce il playbook di Quadra e la versione usata dalla pagina Proprietari di Vicus, che si erano separati.

- Passaggi delegabili (`p3-suap`, `p3-cin`) e obblighi di chi gestisce la struttura (`p4-police`, `p4-tax`), con note neutre al posto di quelle che citavano Vicus.
- Gestione in proprio: con `conGestore: false` il mandato di gestione non compare.
- Imposta di soggiorno: il passaggio chiede prima di verificare se il Comune la applica.
- Nuove funzioni `pianoPer` e `statoPiano`; sanzioni (`SANZIONI`, `esposizione`) spostate nel motore, compresa quella per l'attività d'impresa senza SCIA.
- Tipi in JSDoc e 20 test con `node --test`.
- Regole della Campania verificate al 7 ottobre 2026, invariate.
