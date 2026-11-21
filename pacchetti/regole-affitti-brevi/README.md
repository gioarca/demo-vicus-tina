# regole-affitti-brevi

Il motore che dice come mettere in regola una seconda casa da affittare ai turisti in Italia: quale forma scegliere, quali passaggi fare in sei fasi e a quali sanzioni si è esposti finché non sono fatti. Dalla versione 0.2 contiene anche il fisco di chi gestisce (forfettario, INPS, acconti), la cedolare dei proprietari e gli obblighi del gestore come attività. Lo usano Quadra e la pagina Proprietari di Vicus. È JavaScript puro, in moduli ES, senza dipendenze: funziona nel browser e in Node.

## Cosa esporta

| Nome | Cosa fa |
| --- | --- |
| `decideForm(profilo)` | Forma consigliata (`short_let`, `cav`, `cav_business`, `bnb`), con motivazioni e note |
| `buildPlan(profilo, decisione)` | Passaggi del piano, ciascuno con un `id` stabile |
| `pianoPer(profilo)` | Decisione e passaggi in una sola chiamata |
| `statoPiano(profilo, fatti)` | Come `pianoPer`, più passaggi completati e bloccanti aperti |
| `esposizione(statoPiano)` | Sanzioni a cui l'immobile è esposto: voci, minimo, massimo |
| `SANZIONI` | Importi per immobile, art. 13-ter D.L. 145/2023 |
| `REGION_RULES`, `REGIONS`, `regionName` | Regole regionali verificate (oggi la Campania) ed elenco delle regioni |
| `FORMS`, `PHASES`, `extinguishers` | Etichette delle forme, fasi, numero di estintori |
| `previsionaleForfettario(dati)` | Reddito per codice ATECO, contributi INPS, imposta sostitutiva, saldo, acconti, soglia degli 85.000 € |
| `versamentiAnnoDopo(previsionale)` | Le date e gli importi da versare l'anno dopo, già spostate al lunedì se cadono nel fine settimana |
| `contributiInps(reddito, { riduzione })` | Contributi commercianti: fissi, eccedenza, rata trimestrale |
| `rateAcconto(imposta)` | Acconti con il metodo storico e le soglie di 51,65 € e 257,52 € |
| `cedolareImmobile(dati)` | Cedolare del proprietario, ritenute già trattenute da gestore e portale, conguaglio |
| `verificaContanti(importo)`, `bolloFatture(importi)` | Limite dei contanti e bollo sulle fatture senza IVA |
| `FISCO_2026` | Tutti i valori dell'anno con la fonte: da aggiornare ogni anno |
| `adempimentiGestore(profilo)`, `ADEMPIMENTI_GESTORE`, `AREE_GESTORE` | Obblighi del gestore come attività, filtrati sul suo profilo |
| `prossimaScadenza(regola, oggi)`, `giornoUtile(data)` | Prossima data di una regola di scadenza |
| `L`, `tx`, `LINGUE`, `localeOf` | Testi in italiano, inglese e tedesco |

Il profilo dell'immobile ha questi campi: `region`, `comune`, `units` (immobili in affitto breve del proprietario, questo compreso), `services`, `resides`, `rooms`, `sqm`, `floors`, `condo`, `nonResident`. C'è anche `conGestore`, facoltativo: con `false` il proprietario gestisce da sé e il mandato di gestione non compare.

Ogni passaggio ha `id`, `phase`, `who` (`owner`, `pm`, `tech`, `accountant`), `title`, `detail` e alcuni segnali: `blocking`, `regional`, `todo` (regola da verificare), `delegabile`, `soloGestore`. Può avere anche `nota` e `source`. Le note sono neutre: ogni app scrive la propria versione, se vuole, a partire dall'`id` del passaggio.

## Fisco: cosa è certo e cosa no

I valori INPS 2026 vengono dalla circolare n. 14 del 9 febbraio 2026. Due punti sono marcati `daVerificare`, perché dipendono da come il commercialista inquadra l'attività: il coefficiente delle commissioni dai partner (67%, servizi turistici) e la ritenuta del 21% quando chi incassa è in forfettario. Il calcolo è per cassa: contano i ricavi incassati e i contributi versati nell'anno.

Il profilo del gestore ha `regime` (`forfettario` o `ordinario`), `incassaCanoni`, `riscuoteSoggiorno`, `partner`.

## Aggiungere una regione

Si compila una voce in `REGION_RULES`, con codice regionale, limiti del B&B e della casa vacanze, fonti e data di verifica (`verifiedOn`), e si aggiunge un test. Una regione senza voce funziona lo stesso: i passaggi regionali escono marcati "da verificare".

## Test

```sh
npm test
```

I test coprono le forme, i passaggi condizionali, la fiscalità, la delega, le sanzioni, il previsionale del forfettario, i contributi INPS, la cedolare, le scadenze del gestore e la presenza dei testi nelle tre lingue. Controllano anche che nel motore non ci siano nomi di servizi.
