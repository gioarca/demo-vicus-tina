import { buildPlan, decideForm } from "regole-affitti-brevi";

/* =====================================================================
   VICUS PER TINA — strato dati. Unico punto da sostituire con il backend:
   ogni funzione riporta in commento la route Express prevista.

   DATI DI ESEMPIO. Appartamento del Pozzo e Appartamento Dracena usano i
   dati pubblici dell'annuncio (villalalunadicarta.it); famiglie, altre
   case, squadra, fornitori, importi e dettagli interni sono inventati.
   Privacy: gli ospiti compaiono solo come codice e numero di persone.
   ===================================================================== */

export const sum = (a) => a.reduce((s, x) => s + x, 0);
const ZERO = [0, 0, 0, 0, 0, 0, 0];

/** Data della demo: fissa, così i numeri restano coerenti. Nel prodotto è la data di oggi. */
export const OGGI = "2026-11-21";

const CHECK_POZZO = [
  "Camera: letto matrimoniale rifatto, biancheria pulita",
  "Letto del terzo ospite, se prenotato",
  "Bagno con doccia: anticalcare, asciugamani, asciugacapelli",
  "Cucina: fornelli a gas, frigo e freezer, lavastoviglie vuota",
  "Soggiorno e TV",
  "Terrazzino: tavolo, sedie e piante",
  "Pavimenti",
  "Rifiuti e differenziata",
  "Kit di cortesia e caffè",
  "Danni e inventario",
];
const CHECK_DRACENA = [
  "Camera con baldacchino e balcone",
  "Camera con terrazza",
  "Terza camera matrimoniale",
  "Camera singola",
  "Tre bagni con doccia",
  "Bagno con vasca al secondo piano",
  "Toilette del primo piano",
  "Salone: camino (cenere e legna), salotto, zona pranzo",
  "Cucina: forno, frigo, lavastoviglie, lavatrice vuota",
  "Terrazzo e balcone",
  "Patio e gazebo in giardino",
  "Pavimenti dei due piani",
  "Rifiuti, kit di cortesia, caffè",
  "Danni e inventario",
];
const CHECK_BASE = (extra) => [
  "Letti e biancheria",
  "Bagno",
  "Cucina e stoviglie",
  ...extra,
  "Pavimenti",
  "Rifiuti e differenziata",
  "Kit di cortesia",
  "Danni e inventario",
];

const SEED = {
  oggi: OGGI,
  gestore: {
    nome: "Tina",
    attivita: "case vacanza a Ischia",
    zona: "Isola d'Ischia",
    stagione: "2026",
    inizioAttivita: "2021-03-01",
    ateco: ["68.32", "79.90"],
    profilo: { regime: "forfettario", incassaCanoni: true, riscuoteSoggiorno: true, partner: true },
    fiscale: { avvio: false, riduzione: true },
    partnerVicus: true,
  },
  proprietari: [
    { id: "p1", nome: "Famiglia Calise", residenza: "Ischia", mandato: { firmato: "2022-02-10", soglia: 300, scadenza: null } },
    { id: "p2", nome: "Famiglia Iaccarino", residenza: "Napoli", mandato: { firmato: "2023-03-01", soglia: 250, scadenza: null } },
    { id: "p3", nome: "Familie Weber", residenza: "Stuttgart", mandato: { firmato: "2024-01-15", soglia: 300, scadenza: "2026-12-31" } },
    { id: "p4", nome: "Famiglia Lauro", residenza: "Milano", mandato: { firmato: "2023-05-20", soglia: 500, scadenza: null } },
    { id: "p5", nome: "Famiglia D'Abundo", residenza: "Barano d'Ischia", mandato: { firmato: "2025-04-02", soglia: null, scadenza: null } },
  ],
  immobili: [
    {
      id: "i1", nome: "Appartamento del Pozzo", comune: "Ischia", tipo: "Villa La Luna di Carta · piano terra", proprietarioId: "p1",
      cin: "IT063037C2AYDMU2IC", cedolare: 0.21, soggiornoNotte: 2.5, soggiorni: 32, partnerVicus: true,
      ricaviMese: [675, 1280, 2090, 3080, 3875, 2185, 936], notti: [9, 16, 22, 28, 31, 23, 12],
      incasso: { gestore: 0.55, portale: 0.45 },
      costiFissi: { imu: 640, tari: 210, utenze: 1380, internet: 300, condominio: 0, assicurazione: 180 },
      profilo: { region: "campania", comune: "Ischia", services: false, resides: false, rooms: 1, sqm: 55, floors: 1, condo: false, nonResident: false },
      scheda: {
        fonte: "https://villalalunadicarta.it/appartamento-del-pozzo/",
        prenota: "https://villalalunadicarta.beddy.io",
        indirizzo: "Via Variopinto 11/13, Ischia (Villa La Luna di Carta)",
        piano: "Piano terra, di fronte al cortile con il pozzo",
        mq: 55, ospiti: 3,
        camere: "1 camera da letto con finestra",
        letti: "1 matrimoniale; posto letto per il terzo ospite da confermare",
        bagni: "1 bagno con doccia",
        cucina: "Fornelli a gas, forno, frigorifero con freezer, lavastoviglie, pentole e stoviglie",
        comfort: "Climatizzatore, Wi-Fi gratuito, TV, asciugacapelli; biancheria da letto, bagno e cucina inclusa",
        esterni: "Terrazzino privato di 25 m² con accesso dal soggiorno; corte esterna in comune con il pozzo",
        tariffa: "Da 68 € a notte, fino a 2 persone",
        orari: "Non indicati nell'annuncio: da completare",
        chiavi: "Cassetta a codice accanto al portone della villa",
        wifi: { rete: "LunaDiCarta-Pozzo", password: "pozzo-2026" },
        mbps: { soggiorno: 42, camera: 9 },
        impianti: "Quadro elettrico all'ingresso, dietro la porta; valvola del gas sul terrazzino; contatore dell'acqua in cortile",
        noteAddetta: "Il terrazzino si pulisce per ultimo. Asciugamani piegati sul letto. Lavastoviglie vuota e aperta ad asciugare.",
      },
      pulizia: { compenso: 35, addebito: 50, durata: "2 ore", addettaRif: "c1", checklist: CHECK_POZZO },
      biancheria: [
        { tipo: "Matrimoniale", servono: 1, puliti: 3, lavanderia: 1 },
        { tipo: "Singolo", servono: 1, puliti: 2, lavanderia: 0 },
        { tipo: "Kit bagno", servono: 3, puliti: 5, lavanderia: 2 },
        { tipo: "Cucina", servono: 1, puliti: 2, lavanderia: 1 },
      ],
      recensioni: { voto: 9.4, pulizia: 9.6, n: 41, critichePulizia: 0 },
      dotazioni: [
        { voce: "Climatizzatore", anno: 2021, garanziaFino: null },
        { voce: "Lavastoviglie", anno: 2023, garanziaFino: "2025-05-31" },
        { voce: "Frigorifero con freezer", anno: 2022, garanziaFino: null },
        { voce: "Piano cottura a gas e forno", anno: 2019, garanziaFino: null },
        { voce: "TV", anno: 2024, garanziaFino: "2026-03-31" },
        { voce: "Router Wi-Fi", anno: 2024, garanziaFino: null, nota: "9 Mbps in camera: serve un ripetitore" },
        { voce: "Asciugacapelli", anno: 2026, garanziaFino: "2028-07-05" },
      ],
      documenti: [
        { voce: "CIN", stato: "ok", nota: "IT063037C2AYDMU2IC, esposto e negli annunci" },
        { voce: "Comunicazione al SUAP", stato: "ok" },
        { voce: "Polizza casa con copertura per gli ospiti", stato: "ok", scadenza: "2027-04-30" },
        { voce: "Mandato di gestione firmato", stato: "ok" },
        { voce: "Libretto del climatizzatore", stato: "ok" },
        { voce: "Dichiarazione di conformità dell'impianto elettrico", stato: "manca" },
      ],
    },
    {
      id: "i2", nome: "Appartamento Dracena", comune: "Ischia", tipo: "Villa La Luna di Carta · primo e secondo piano", proprietarioId: "p1",
      cin: "IT063037C2VJGV2YZL", cedolare: 0.26, soggiornoNotte: 2.5, soggiorni: 24,
      ricaviMese: [1520, 2940, 5200, 8640, 10800, 4940, 1800], notti: [8, 14, 20, 27, 30, 19, 9],
      incasso: { gestore: 0.6, portale: 0.4 },
      costiFissi: { imu: 1950, tari: 480, utenze: 3400, internet: 300, condominio: 0, assicurazione: 420 },
      profilo: { region: "campania", comune: "Ischia", services: false, resides: false, rooms: 4, sqm: 180, floors: 2, condo: false, nonResident: false },
      scheda: {
        fonte: "https://villalalunadicarta.it/appartamento-dracena/",
        prenota: "https://villalalunadicarta.beddy.io",
        indirizzo: "Via Variopinto 11/13, Ischia (Villa La Luna di Carta)",
        piano: "Due livelli: primo piano con salone, cucina, camera singola e toilette; secondo piano con le camere",
        mq: 180, ospiti: 7,
        camere: "3 camere matrimoniali (una con baldacchino e balcone, una con terrazza) e 1 singola",
        letti: "3 matrimoniali e 1 singolo",
        bagni: "3 bagni con doccia, 1 bagno con vasca, 1 toilette",
        cucina: "Fornelli a gas, forno, frigorifero con freezer, lavatrice, lavastoviglie, pentole e stoviglie",
        comfort: "Climatizzatore, camino, TV a schermo piatto, Wi-Fi gratuito; biancheria inclusa",
        esterni: "Terrazzo di 25 m², balcone, patio di 17 m², giardino di 300 m² con gazebo",
        tariffa: "Da 170 € a notte, fino a 4 persone",
        orari: "Non indicati nell'annuncio: da completare",
        chiavi: "Cassetta a codice accanto al portone della villa",
        wifi: { rete: "LunaDiCarta-Dracena", password: "dracena-2026" },
        mbps: { soggiorno: 48, camera: 22 },
        impianti: "Quadro elettrico al primo piano, nel ripostiglio; caldaia nel locale tecnico in giardino",
        noteAddetta: "Cenere del camino nel secchio di metallo, mai nell'indifferenziata. Gazebo: cuscini dentro se piove.",
      },
      pulizia: { compenso: 90, addebito: 140, durata: "5 ore, meglio in due", addettaRif: "c1", checklist: CHECK_DRACENA },
      biancheria: [
        { tipo: "Matrimoniale", servono: 3, puliti: 5, lavanderia: 3 },
        { tipo: "Singolo", servono: 1, puliti: 2, lavanderia: 1 },
        { tipo: "Kit bagno", servono: 7, puliti: 8, lavanderia: 7 },
        { tipo: "Cucina", servono: 2, puliti: 3, lavanderia: 1 },
      ],
      recensioni: { voto: 9.0, pulizia: 9.1, n: 27, critichePulizia: 1 },
      dotazioni: [
        { voce: "Lavatrice", anno: 2025, garanziaFino: "2027-04-15", nota: "non scarica: è in garanzia" },
        { voce: "Lavastoviglie", anno: 2022, garanziaFino: null },
        { voce: "Frigorifero con freezer", anno: 2023, garanziaFino: "2025-06-30" },
        { voce: "Climatizzatori (4)", anno: 2020, garanziaFino: null },
        { voce: "Caldaia", anno: 2019, garanziaFino: null },
        { voce: "Camino", anno: null, garanziaFino: null },
        { voce: "TV a schermo piatto", anno: 2023, garanziaFino: "2025-09-30" },
        { voce: "Gazebo", anno: 2023, garanziaFino: null, nota: "telo strappato" },
      ],
      documenti: [
        { voce: "CIN", stato: "ok", nota: "IT063037C2VJGV2YZL, esposto e negli annunci" },
        { voce: "Comunicazione al SUAP", stato: "ok" },
        { voce: "Polizza casa con copertura per gli ospiti", stato: "ok", scadenza: "2027-04-30" },
        { voce: "Mandato di gestione firmato", stato: "ok" },
        { voce: "Libretto d'impianto della caldaia", stato: "ok", scadenza: "2026-12-05" },
        { voce: "Pulizia della canna fumaria", stato: "in_scadenza", scadenza: "2026-11-28" },
      ],
    },
    {
      id: "i3", nome: "Casa Cartaromana", comune: "Ischia", tipo: "Bilocale a Ischia Ponte, vista sul Castello", proprietarioId: "p2",
      cin: "IT063037C2ESEMP003", cedolare: 0.21, soggiornoNotte: 2.5, soggiorni: 36,
      ricaviMese: [1100, 1950, 3100, 4300, 5100, 3000, 1300], notti: [10, 17, 23, 28, 31, 24, 12],
      incasso: { gestore: 0.5, portale: 0.5 },
      costiFissi: { imu: 820, tari: 240, utenze: 1500, internet: 300, condominio: 420, assicurazione: 190 },
      profilo: { region: "campania", comune: "Ischia", services: false, resides: false, rooms: 1, sqm: 60, floors: 1, condo: true, nonResident: false },
      scheda: {
        indirizzo: "Ischia Ponte (indirizzo di esempio)", piano: "Secondo piano senza ascensore", mq: 60, ospiti: 4,
        camere: "1 camera matrimoniale e soggiorno con divano letto", letti: "1 matrimoniale, 1 divano letto doppio", bagni: "1 bagno con doccia",
        cucina: "Piano cottura a induzione, frigorifero, lavatrice", comfort: "Climatizzatore, Wi-Fi, TV", esterni: "Balcone con vista sul Castello Aragonese",
        tariffa: "Da 70 € a notte", orari: "Check-in dalle 15, check-out entro le 10",
        chiavi: "Consegna di persona o cassetta al portone", wifi: { rete: "Cartaromana-Casa", password: "castello-2026" }, mbps: { soggiorno: 65, camera: 40 },
        impianti: "Quadro elettrico all'ingresso", noteAddetta: "Scale strette: biancheria in due giri.",
      },
      pulizia: { compenso: 42, addebito: 60, durata: "2 ore e mezza", addettaRif: "c1", checklist: CHECK_BASE(["Divano letto", "Balcone"]) },
      biancheria: [
        { tipo: "Matrimoniale", servono: 2, puliti: 2, lavanderia: 2 },
        { tipo: "Kit bagno", servono: 4, puliti: 5, lavanderia: 2 },
        { tipo: "Cucina", servono: 1, puliti: 2, lavanderia: 0 },
      ],
      recensioni: { voto: 9.3, pulizia: 9.5, n: 52, critichePulizia: 0 },
      dotazioni: [
        { voce: "Climatizzatore", anno: 2024, garanziaFino: "2026-05-31" },
        { voce: "Lavatrice", anno: 2021, garanziaFino: null },
        { voce: "Frigorifero", anno: 2022, garanziaFino: null },
        { voce: "TV", anno: 2025, garanziaFino: "2027-02-28" },
      ],
      documenti: [
        { voce: "CIN", stato: "ok" },
        { voce: "Comunicazione al SUAP", stato: "ok" },
        { voce: "Polizza casa con copertura per gli ospiti", stato: "in_scadenza", scadenza: "2026-12-15" },
        { voce: "Mandato di gestione firmato", stato: "ok" },
      ],
    },
    {
      id: "i4", nome: "Monolocale Maronti", comune: "Barano d'Ischia", tipo: "Monolocale a due passi dalla spiaggia dei Maronti", proprietarioId: "p5",
      cin: "IT063006C2ESEMP004", cedolare: 0.21, soggiornoNotte: 2, soggiorni: 34,
      ricaviMese: [480, 900, 1500, 2300, 2900, 1400, 520], notti: [6, 12, 19, 27, 30, 18, 7],
      incasso: { gestore: 0.4, portale: 0.6 },
      costiFissi: { imu: 410, tari: 160, utenze: 820, internet: 280, condominio: 0, assicurazione: 140 },
      profilo: { region: "campania", comune: "Barano d'Ischia", services: false, resides: false, rooms: 1, sqm: 32, floors: 1, condo: false, nonResident: false },
      scheda: {
        indirizzo: "Barano d'Ischia, zona Maronti (indirizzo di esempio)", piano: "Piano terra", mq: 32, ospiti: 2,
        camere: "Monolocale con angolo cottura", letti: "1 matrimoniale", bagni: "1 bagno con doccia",
        cucina: "Piano cottura elettrico, frigorifero", comfort: "Ventilatore a soffitto, Wi-Fi", esterni: "Piccolo patio",
        tariffa: "Da 55 € a notte", orari: "Check-in dalle 15, check-out entro le 10",
        chiavi: "Cassetta a codice", wifi: { rete: "Maronti-Studio", password: "maronti-2026" }, mbps: { soggiorno: 28, camera: 28 },
        impianti: "Scaldabagno elettrico nel bagno", noteAddetta: "Sabbia: aspirare anche il patio.",
      },
      pulizia: { compenso: 30, addebito: 45, durata: "1 ora e mezza", addettaRif: "c3", checklist: CHECK_BASE(["Patio"]) },
      biancheria: [
        { tipo: "Matrimoniale", servono: 1, puliti: 2, lavanderia: 0 },
        { tipo: "Kit bagno", servono: 2, puliti: 2, lavanderia: 2 },
        { tipo: "Cucina", servono: 1, puliti: 1, lavanderia: 1 },
      ],
      recensioni: { voto: 8.9, pulizia: 9.0, n: 33, critichePulizia: 1 },
      dotazioni: [
        { voce: "Scaldabagno elettrico", anno: 2019, garanziaFino: null },
        { voce: "Frigorifero", anno: 2020, garanziaFino: null },
        { voce: "Piano cottura elettrico", anno: 2023, garanziaFino: "2025-07-31" },
      ],
      documenti: [
        { voce: "CIN", stato: "ok" },
        { voce: "Rilevatore di gas e monossido", stato: "manca" },
        { voce: "Estintore", stato: "manca" },
        { voce: "Mandato di gestione firmato", stato: "ok", nota: "senza soglia di spesa" },
      ],
    },
    {
      id: "i5", nome: "Casa Zaro", comune: "Forio", tipo: "Casa con giardino e ulivi, vicino alla baia di Zaro", proprietarioId: "p3",
      cin: "IT063031C2ESEMP005", cedolare: 0.21, soggiornoNotte: 2.5, soggiorni: 27,
      ricaviMese: [1300, 2600, 4200, 6200, 7400, 3900, 1500], notti: [8, 15, 21, 28, 31, 22, 10],
      incasso: { gestore: 0.65, portale: 0.35 },
      costiFissi: { imu: 1480, tari: 380, utenze: 2600, internet: 300, condominio: 0, assicurazione: 360 },
      profilo: { region: "campania", comune: "Forio", services: false, resides: false, rooms: 2, sqm: 95, floors: 1, condo: false, nonResident: true },
      scheda: {
        indirizzo: "Forio, località Zaro (indirizzo di esempio)", piano: "Casa indipendente su un livello", mq: 95, ospiti: 5,
        camere: "2 camere", letti: "2 matrimoniali, 1 singolo", bagni: "2 bagni con doccia",
        cucina: "Fornelli a gas, forno, lavastoviglie, lavatrice", comfort: "Climatizzatori, caldaia, Wi-Fi, barbecue", esterni: "Giardino con ulivi, pergolato, posto auto",
        tariffa: "Da 120 € a notte", orari: "Check-in dalle 16, check-out entro le 10",
        chiavi: "Cassetta a codice sul cancello; chiave di riserva in cassetta", wifi: { rete: "CasaZaro", password: "zaro-2026" }, mbps: { soggiorno: 35, camera: 18 },
        impianti: "Caldaia esterna sul retro; valvola dell'acqua nel pozzetto del giardino", noteAddetta: "Il cancello si apre girando la chiave due volte. Barbecue: grata pulita.",
      },
      pulizia: { compenso: 55, addebito: 85, durata: "3 ore e mezza", addettaRif: "c2", checklist: CHECK_BASE(["Secondo bagno", "Giardino, pergolato e barbecue"]) },
      biancheria: [
        { tipo: "Matrimoniale", servono: 2, puliti: 2, lavanderia: 2 },
        { tipo: "Singolo", servono: 1, puliti: 2, lavanderia: 0 },
        { tipo: "Kit bagno", servono: 5, puliti: 3, lavanderia: 4 },
        { tipo: "Cucina", servono: 1, puliti: 2, lavanderia: 1 },
      ],
      recensioni: { voto: 8.4, pulizia: 7.9, n: 29, critichePulizia: 4 },
      dotazioni: [
        { voce: "Caldaia", anno: 2018, garanziaFino: null },
        { voce: "Climatizzatori (2)", anno: 2022, garanziaFino: null },
        { voce: "Lavatrice", anno: 2024, garanziaFino: "2026-08-31" },
        { voce: "Lavastoviglie", anno: 2023, garanziaFino: "2025-05-31" },
        { voce: "Barbecue", anno: 2022, garanziaFino: null },
        { voce: "Materassi", anno: 2015, garanziaFino: null, nota: "4 recensioni citano i letti scomodi" },
      ],
      documenti: [
        { voce: "CIN", stato: "ok" },
        { voce: "Comunicazione al SUAP", stato: "ok" },
        { voce: "Libretto d'impianto della caldaia", stato: "in_scadenza", scadenza: "2026-11-02" },
        { voce: "Mandato di gestione firmato", stato: "in_scadenza", scadenza: "2026-12-31" },
      ],
    },
    {
      id: "i6", nome: "La Terrazza di Sant'Angelo", comune: "Serrara Fontana", tipo: "Bilocale con terrazza sul mare · chiuso da novembre a marzo", proprietarioId: "p4",
      cin: "IT063078C2ESEMP006", cedolare: 0.21, soggiornoNotte: 2, soggiorni: 30, chiusa: { dal: "2026-11-02", al: "2027-03-31" },
      ricaviMese: [700, 1500, 2500, 3600, 4300, 2300, 600], notti: [6, 14, 21, 28, 31, 21, 6],
      incasso: { gestore: 0.5, portale: 0.5 },
      costiFissi: { imu: 900, tari: 220, utenze: 1100, internet: 280, condominio: 360, assicurazione: 210 },
      profilo: { region: "campania", comune: "Serrara Fontana", services: false, resides: false, rooms: 1, sqm: 50, floors: 1, condo: true, nonResident: false },
      scheda: {
        indirizzo: "Sant'Angelo, Serrara Fontana (indirizzo di esempio)", piano: "Primo piano", mq: 50, ospiti: 2,
        camere: "1 camera matrimoniale", letti: "1 matrimoniale", bagni: "1 bagno con doccia",
        cucina: "Piano cottura, frigorifero", comfort: "Climatizzatore, Wi-Fi", esterni: "Terrazza di 30 m² sul mare",
        tariffa: "Da 80 € a notte", orari: "Check-in dalle 15, check-out entro le 10",
        chiavi: "Chiavi da Tina durante la chiusura", wifi: { rete: "Terrazza-SantAngelo", password: "terrazza-2026" }, mbps: { soggiorno: 30, camera: 30 },
        impianti: "Acqua e gas chiusi durante la chiusura invernale", noteAddetta: "Casa chiusa: sopralluogo una volta al mese.",
      },
      pulizia: { compenso: 35, addebito: 50, durata: "2 ore", addettaRif: "c3", checklist: CHECK_BASE(["Terrazza"]) },
      biancheria: [
        { tipo: "Matrimoniale", servono: 1, puliti: 2, lavanderia: 0 },
        { tipo: "Kit bagno", servono: 2, puliti: 4, lavanderia: 0 },
      ],
      recensioni: { voto: 9.5, pulizia: 9.6, n: 38, critichePulizia: 0 },
      dotazioni: [
        { voce: "Climatizzatore", anno: 2023, garanziaFino: "2025-06-30" },
        { voce: "Frigorifero", anno: 2021, garanziaFino: null },
        { voce: "Scaldabagno", anno: 2020, garanziaFino: null },
      ],
      documenti: [
        { voce: "CIN", stato: "ok" },
        { voce: "Comunicazione al SUAP", stato: "ok" },
        { voce: "Mandato di gestione firmato", stato: "ok" },
      ],
    },
  ],

  adempimenti: [
    { id: "a1", immobileId: "i1", voce: "CIN esposto e indicato negli annunci", scadenza: null, stato: "ok" },
    { id: "a2", immobileId: "i1", voce: "Wi-Fi misurato e postazione di lavoro pronta per l'arrivo Vicus", scadenza: "2026-11-23", stato: "da_fare" },
    { id: "a3", immobileId: "i2", voce: "Secondo acconto della cedolare al 26% della famiglia Calise", scadenza: "2026-11-30", stato: "da_fare" },
    { id: "a4", immobileId: "i2", voce: "Pulizia della canna fumaria prima di accendere il camino", scadenza: "2026-11-28", stato: "da_fare" },
    { id: "a5", immobileId: "i4", voce: "Rilevatore di gas e monossido ed estintore installati", scadenza: "2026-11-27", stato: "critico" },
    { id: "a6", immobileId: "i5", voce: "Certificazione Unica alla famiglia Weber, non residente", scadenza: "2027-03-16", stato: "da_fare" },
    { id: "a7", immobileId: "i3", voce: "Rinnovo della polizza casa", scadenza: "2026-12-15", stato: "da_fare" },
    { id: "a8", immobileId: "i3", voce: "CIN esposto e indicato negli annunci", scadenza: null, stato: "ok" },
  ],

  /* Segnalazioni e interventi. stato: nuovo → attesa_ok → programmato → aperto → chiuso.
     priorita: urgente (blocca la casa) · prima_arrivo · finestra (quando la casa è libera). */
  interventi: [
    { id: "m1", immobileId: "i1", voce: "Wi-Fi debole in camera: ripetitore e nuova misura", fonte: "tina", da: "Tina", data: "2026-11-18", priorita: "prima_arrivo", fornitore: "Tecno Ischia", fornitoreId: "f9", costo: 65, stato: "programmato", quando: "2026-11-21", ora: "15:00" },
    { id: "m2", immobileId: "i1", voce: "Doccia: la guarnizione del soffione perde", fonte: "addetta", da: "Carmela", data: "2026-11-16", priorita: "prima_arrivo", fornitore: "Idraulica Mazzella", fornitoreId: "f1", costo: 70, stato: "nuovo", foto: 2 },
    { id: "m3", immobileId: "i2", voce: "Gazebo: telo strappato dal vento", fonte: "ospite", da: "Ospiti BK-1120", data: "2026-11-20", priorita: "finestra", fornitore: "Tappezzeria Monti", fornitoreId: "f11", costo: 380, stato: "attesa_ok", foto: 3 },
    { id: "m4", immobileId: "i2", voce: "Lavatrice: non scarica l'acqua", fonte: "addetta", da: "Carmela", data: "2026-11-19", priorita: "prima_arrivo", fornitore: "Assistenza del produttore", fornitoreId: "f13", costo: 0, stato: "nuovo", garanzia: "Lavatrice", foto: 1 },
    { id: "m5", immobileId: "i3", voce: "Climatizzatore del soggiorno: perde acqua", fonte: "ospite", da: "Ospiti", data: "2026-09-10", priorita: "prima_arrivo", fornitore: "Clima Ischia Service", fornitoreId: "f2", costo: 160, stato: "chiuso", quando: "2026-09-12" },
    { id: "m6", immobileId: "i4", voce: "Rilevatore di gas e monossido ed estintore da installare", fonte: "controllo", da: "Controllo di legge", data: "2026-11-10", priorita: "urgente", fornitore: "Elettrica Di Costanzo", fornitoreId: "f3", costo: 120, stato: "programmato", quando: "2026-11-26", ora: "09:30" },
    { id: "m7", immobileId: "i5", voce: "Cancello del giardino: la serratura si blocca", fonte: "addetta", da: "Nunzia", data: "2026-11-18", priorita: "finestra", fornitore: "Ferramenta del Porto", fornitoreId: "f12", costo: 45, stato: "nuovo", foto: 1 },
    { id: "m8", immobileId: "i6", voce: "Impermeabilizzazione del terrazzo", fonte: "tina", da: "Tina", data: "2026-11-05", priorita: "finestra", fornitore: "Edil Trani", fornitoreId: "f8", costo: 2400, stato: "attesa_ok" },
    { id: "m9", immobileId: "i6", voce: "Imbiancatura di camera e bagno", fonte: "tina", da: "Tina", data: "2026-10-30", priorita: "finestra", fornitore: "Edil Trani", fornitoreId: "f8", costo: 850, stato: "programmato", quando: "2027-01-12" },
    { id: "m10", immobileId: "i5", voce: "Potatura degli ulivi e della siepe", fonte: "tina", da: "Tina", data: "2026-10-01", priorita: "finestra", fornitore: "Giardini dell'Epomeo", fornitoreId: "f4", costo: 260, stato: "chiuso", quando: "2026-10-08" },
    { id: "m11", immobileId: "i2", voce: "Lampadine esterne del gazebo", fonte: "addetta", da: "Carmela", data: "2026-08-19", priorita: "finestra", fornitore: "Elettrica Di Costanzo", fornitoreId: "f3", costo: 45, stato: "chiuso", quando: "2026-08-21" },
    { id: "m12", immobileId: "i1", voce: "Asciugacapelli nuovo", fonte: "ospite", da: "Ospiti", data: "2026-07-04", priorita: "prima_arrivo", fornitore: "Ferramenta del Porto", fornitoreId: "f12", costo: 35, stato: "chiuso", quando: "2026-07-05" },
    { id: "m13", immobileId: "i3", voce: "Infiltrazione sotto il lavello", fonte: "addetta", da: "Carmela", data: "2026-06-08", priorita: "prima_arrivo", fornitore: "Idraulica Mazzella", fornitoreId: "f1", costo: 140, stato: "chiuso", quando: "2026-06-10" },
    { id: "m14", immobileId: "i4", voce: "Zanzariera della finestra rotta", fonte: "ospite", da: "Ospiti", data: "2026-07-30", priorita: "finestra", fornitore: "Ferramenta del Porto", fornitoreId: "f12", costo: 60, stato: "chiuso", quando: "2026-08-02" },
  ],

  decisioni: [
    { id: "d1", proprietarioId: "p1", immobileId: "i2", data: "2026-06-12", tema: "Prezzo delle notti libere di luglio alla Dracena", proposta: "Scendere a 280 € a notte", decisione: "rifiutata", esito: "5 notti invendute a 320 €", impatto: -1600 },
    { id: "d2", proprietarioId: "p1", immobileId: "i1", data: "2026-10-20", tema: "Ospitare la spedizione Vicus a fine novembre", proposta: "8 notti in bassa stagione, check-in di persona", decisione: "accettata", esito: "8 notti vendute a novembre", impatto: 544 },
    { id: "d3", proprietarioId: "p3", immobileId: "i5", data: "2026-05-03", tema: "Materassi nuovi in Casa Zaro", proposta: "Due materassi nuovi, 640 €", decisione: "rifiutata", esito: "4 recensioni citano i letti scomodi; voto da 9,1 a 8,4", impatto: null },
    { id: "d4", proprietarioId: "p4", immobileId: "i6", data: "2026-11-05", tema: "Impermeabilizzazione del terrazzo", proposta: "Edil Trani, 2.400 €, a gennaio con la casa chiusa", decisione: "in_attesa", esito: "", impatto: null, interventoId: "m8" },
    { id: "d5", proprietarioId: "p1", immobileId: "i2", data: "2026-11-20", tema: "Telo del gazebo", proposta: "Tappezzeria Monti, 380 €", decisione: "in_attesa", esito: "", impatto: null, interventoId: "m3" },
    { id: "d6", proprietarioId: "p2", immobileId: "i3", data: "2026-09-28", tema: "Aperto fino a fine novembre", proposta: "Tenere aperta Casa Cartaromana per i ponti d'autunno", decisione: "accettata", esito: "9 notti vendute in più", impatto: 630 },
  ],

  /* ---------- calendario: arrivi, partenze, pulizie ---------- */
  prenotazioni: [
    { id: "BK-1116", immobileId: "i3", canale: "Airbnb", arrivo: "2026-11-13", partenza: "2026-11-16", ospiti: 2, lordo: 210, orario: "15:00", alloggiati: "inviata" },
    { id: "BK-1114", immobileId: "i5", canale: "Booking", arrivo: "2026-11-14", partenza: "2026-11-18", ospiti: 4, lordo: 520, orario: "16:00", alloggiati: "inviata" },
    { id: "BK-1117", immobileId: "i1", canale: "Booking", arrivo: "2026-11-17", partenza: "2026-11-21", ospiti: 2, lordo: 272, orario: "15:00", alloggiati: "inviata" },
    { id: "BK-1119", immobileId: "i3", canale: "Airbnb", arrivo: "2026-11-19", partenza: "2026-11-24", ospiti: 2, lordo: 350, orario: "14:30", alloggiati: "inviata" },
    { id: "BK-1120", immobileId: "i2", canale: "Diretto", arrivo: "2026-11-20", partenza: "2026-11-22", ospiti: 6, lordo: 460, orario: "18:00", alloggiati: "da_inviare", pagamento: { metodo: "contanti", stato: "incassato" } },
    { id: "BK-1121", immobileId: "i5", canale: "Airbnb", arrivo: "2026-11-21", partenza: "2026-11-25", ospiti: 4, lordo: 480, orario: null, promemoria: false },
    { id: "VC-2611-0001", immobileId: "i1", canale: "Vicus", arrivo: "2026-11-23", partenza: "2026-12-01", ospiti: 2, lordo: 544, orario: "19:00", nota: "Spedizione Vicus: check-in di persona con Tina. Lavorano in casa: Wi-Fi e postazione contano." },
    { id: "BK-1126", immobileId: "i3", canale: "Booking", arrivo: "2026-11-26", partenza: "2026-11-29", ospiti: 3, lordo: 255, orario: null },
    { id: "BK-1128", immobileId: "i4", canale: "Booking", arrivo: "2026-11-28", partenza: "2026-11-30", ospiti: 2, lordo: 140, orario: null },
    { id: "BK-1204", immobileId: "i2", canale: "Booking", arrivo: "2026-12-04", partenza: "2026-12-08", ospiti: 7, lordo: 1040, orario: null },
    { id: "BK-1205", immobileId: "i5", canale: "Diretto", arrivo: "2026-12-05", partenza: "2026-12-08", ospiti: 5, lordo: 450, orario: null, pagamento: { metodo: "bonifico", stato: "acconto" } },
    { id: "BK-1227", immobileId: "i1", canale: "Booking", arrivo: "2026-12-27", partenza: "2027-01-02", ospiti: 3, lordo: 520, orario: null },
    { id: "BK-1229", immobileId: "i2", canale: "Diretto", arrivo: "2026-12-29", partenza: "2027-01-03", ospiti: 7, lordo: 2600, orario: null, pagamento: { metodo: "bonifico", stato: "acconto" } },
  ],
  addetti: [
    { id: "c1", nome: "Carmela", zona: "Ischia Porto e Ponte", tipo: "addetta", storico: { turni: 112, puntualita: 0.97, foto: 0.98, voto: 4.8, ripassi: 0 }, mese: { turni: 9, importo: 452, pagato: false } },
    { id: "c2", nome: "Nunzia", zona: "Forio e Lacco Ameno", tipo: "addetta", storico: { turni: 64, puntualita: 0.81, foto: 0.62, voto: 3.9, ripassi: 5 }, mese: { turni: 4, importo: 220, pagato: false } },
    { id: "c3", nome: "Assunta", zona: "Barano e Serrara, jolly", tipo: "addetta", storico: { turni: 58, puntualita: 0.93, foto: 0.9, voto: 4.6, ripassi: 1 }, mese: { turni: 3, importo: 100, pagato: false } },
    { id: "c4", nome: "Pulito Ischia", zona: "Tutta l'isola, su chiamata", tipo: "impresa", maggiorazione: 0.4, storico: { turni: 9, puntualita: 1, foto: 1, voto: 4.7, ripassi: 0 }, mese: { turni: 1, importo: 126, pagato: false } },
  ],
  // turni di pulizia per prenotazione (alla partenza)
  turni: {
    "BK-1116": { addettoId: "c1", stato: "verificato", foto: 9, voto: 5 },
    "BK-1114": { addettoId: "c2", stato: "fatto", foto: 5, ritardo: 40 },
    "BK-1117": { addettoId: "c1", stato: "confermato", foto: 0 },
    "BK-1120": { addettoId: "c3", stato: "assegnato", foto: 0 },
  },
  // turni che non nascono da una partenza: pulizia di metà soggiorno, sopralluoghi
  turniExtra: [
    { id: "T-VC-META", immobileId: "i1", data: "2026-11-27", tipo: "meta", dalle: "11:00", entro: "13:00", nota: "Ospiti in casa al lavoro: orario concordato, cambio biancheria e asciugamani", addettoId: "c1", stato: "assegnato", foto: 0 },
    { id: "T-SA-DIC", immobileId: "i6", data: "2026-12-02", tipo: "sopralluogo", dalle: "10:00", entro: "11:00", nota: "Casa chiusa: arieggiare, controllare umidità e acqua chiusa", addettoId: "c3", stato: "assegnato", foto: 0 },
  ],
  invio: {
    ora: "19:00",
    canale: "WhatsApp",
    destinatari: [
      { id: "c1", tipo: "addetto", attivo: true },
      { id: "c2", tipo: "addetto", attivo: true },
      { id: "c3", tipo: "addetto", attivo: true },
      { id: "c4", tipo: "addetto", attivo: false },
      { id: "p1", tipo: "proprietario", attivo: true },
      { id: "p3", tipo: "proprietario", attivo: false },
    ],
  },
  lavanderia: {
    fornitoreId: "f10",
    giri: "lunedì, mercoledì e sabato alle 17",
    prossimoRitiro: "2026-11-21",
    consegna: "dopo 48 ore",
    prezzi: { Matrimoniale: 6.5, Singolo: 4.5, "Kit bagno": 2.8, Cucina: 1.5 },
    mese: 286,
  },
  scorte: [
    { id: "s1", voce: "Carta igienica", unita: "rotoli", quantita: 36, perCambio: 4, soglia: 24, prezzo: 0.45 },
    { id: "s2", voce: "Sapone per le mani", unita: "flaconi", quantita: 5, perCambio: 1, soglia: 6, prezzo: 1.9 },
    { id: "s3", voce: "Bagnoschiuma e shampoo monodose", unita: "kit", quantita: 40, perCambio: 3, soglia: 30, prezzo: 0.8 },
    { id: "s4", voce: "Capsule caffè", unita: "capsule", quantita: 60, perCambio: 8, soglia: 50, prezzo: 0.3 },
    { id: "s5", voce: "Pastiglie lavastoviglie", unita: "pastiglie", quantita: 18, perCambio: 2, soglia: 20, prezzo: 0.25 },
    { id: "s6", voce: "Detersivo piatti", unita: "flaconi", quantita: 4, perCambio: 0.25, soglia: 3, prezzo: 1.6 },
    { id: "s7", voce: "Sacchi per la differenziata", unita: "rotoli", quantita: 3, perCambio: 0.3, soglia: 4, prezzo: 2.2 },
    { id: "s8", voce: "Multiuso e anticalcare", unita: "flaconi", quantita: 6, perCambio: 0.3, soglia: 4, prezzo: 2.9 },
    { id: "s9", voce: "Lampadine di scorta", unita: "pezzi", quantita: 2, perCambio: 0, soglia: 4, prezzo: 3.5 },
    { id: "s10", voce: "Pile per i telecomandi", unita: "pezzi", quantita: 8, perCambio: 0, soglia: 6, prezzo: 0.9 },
  ],

  /* ---------- manutenzione programmata e fornitori ---------- */
  fornitori: [
    { id: "f1", nome: "Idraulica Mazzella", categoria: "idraulico", zona: "Ischia e Barano", risposta: "in giornata", voto: 4.7 },
    { id: "f2", nome: "Clima Ischia Service", categoria: "caldaie", zona: "tutta l'isola", risposta: "1–2 giorni", voto: 4.4 },
    { id: "f3", nome: "Elettrica Di Costanzo", categoria: "elettricista", zona: "tutta l'isola", risposta: "in giornata", voto: 4.8 },
    { id: "f4", nome: "Giardini dell'Epomeo", categoria: "giardiniere", zona: "Ischia e Forio", risposta: "su programma", voto: 4.5 },
    { id: "f5", nome: "Antincendio Flegreo", categoria: "estintori", zona: "tutta l'isola", risposta: "su appuntamento", voto: 4.6 },
    { id: "f6", nome: "Disinfestazioni Isola Verde", categoria: "derattizzazione", zona: "tutta l'isola", risposta: "2–3 giorni", voto: 4.3 },
    { id: "f7", nome: "Canne fumarie Ischia", categoria: "camini", zona: "tutta l'isola", risposta: "su appuntamento", voto: 4.5 },
    { id: "f8", nome: "Edil Trani", categoria: "edile", zona: "tutta l'isola", risposta: "preventivo in 5 giorni", voto: 4.2 },
    { id: "f9", nome: "Tecno Ischia", categoria: "informatica", zona: "Ischia e Casamicciola", risposta: "in giornata", voto: 4.7 },
    { id: "f10", nome: "Lavanderia del Porto", categoria: "lavanderia", zona: "Ischia Porto", risposta: "giri fissi", voto: 4.5 },
    { id: "f11", nome: "Tappezzeria Monti", categoria: "tappezzeria", zona: "Ischia", risposta: "3–4 giorni", voto: 4.4 },
    { id: "f12", nome: "Ferramenta del Porto", categoria: "ferramenta", zona: "Ischia Porto", risposta: "in giornata", voto: 4.6 },
    { id: "f13", nome: "Assistenza del produttore", categoria: "assistenza", zona: "a domicilio", risposta: "3–5 giorni", voto: null },
  ],
  programmi: [
    { id: "pr1", immobileId: "i1", fornitoreId: "f2", voce: "Climatizzatore: pulizia filtri e sanificazione", ogniMesi: 12, ultima: "2025-11-15", costo: 70, obbligo: false },
    { id: "pr2", immobileId: "i1", fornitoreId: "f5", voce: "Estintore: controllo semestrale", ogniMesi: 6, ultima: "2026-05-20", costo: 25, obbligo: true, fonte: "D.M. 1 settembre 2021" },
    { id: "pr3", immobileId: "i2", fornitoreId: "f7", voce: "Camino: pulizia della canna fumaria", ogniMesi: 12, ultima: "2025-11-28", costo: 120, obbligo: true, fonte: "D.P.R. 74/2013 e norme UNI" },
    { id: "pr4", immobileId: "i2", fornitoreId: "f4", voce: "Giardino di 300 m² e gazebo", ogniMesi: 1, ultima: "2026-10-25", costo: 140, obbligo: false },
    { id: "pr5", immobileId: "i2", fornitoreId: "f6", voce: "Giardino: derattizzazione e trattamento zanzare", ogniMesi: 3, ultima: "2026-09-01", costo: 95, obbligo: false },
    { id: "pr6", immobileId: "i2", fornitoreId: "f2", voce: "Caldaia: manutenzione e libretto d'impianto", ogniMesi: 12, ultima: "2025-12-05", costo: 110, obbligo: true, fonte: "D.P.R. 74/2013" },
    { id: "pr7", immobileId: "i2", fornitoreId: "f2", voce: "Climatizzatori (4): pulizia filtri", ogniMesi: 12, ultima: "2026-04-10", costo: 180, obbligo: false },
    { id: "pr8", immobileId: "i3", fornitoreId: "f5", voce: "Estintore: controllo semestrale", ogniMesi: 6, ultima: "2026-08-02", costo: 25, obbligo: true, fonte: "D.M. 1 settembre 2021" },
    { id: "pr9", immobileId: "i4", fornitoreId: "f5", voce: "Estintore: controllo semestrale", ogniMesi: 6, ultima: null, costo: 25, obbligo: true, fonte: "D.M. 1 settembre 2021" },
    { id: "pr10", immobileId: "i5", fornitoreId: "f4", voce: "Giardino, ulivi e pergolato", ogniMesi: 1, ultima: "2026-10-28", costo: 100, obbligo: false },
    { id: "pr11", immobileId: "i5", fornitoreId: "f2", voce: "Caldaia: manutenzione e libretto d'impianto", ogniMesi: 12, ultima: "2025-11-02", costo: 110, obbligo: true, fonte: "D.P.R. 74/2013" },
    { id: "pr12", immobileId: "i6", fornitoreId: "f8", voce: "Casa chiusa: sopralluogo, umidità e infiltrazioni", ogniMesi: 1, ultima: "2026-11-02", costo: 0, obbligo: false },
  ],
  pagamenti: [
    { id: "pg1", fornitoreId: "f10", immobileId: null, voce: "Biancheria di ottobre, 6 case", importo: 410, scadenza: "2026-11-15", stato: "pagato", metodo: "bonifico" },
    { id: "pg2", fornitoreId: "f2", immobileId: "i3", voce: "Climatizzatore del soggiorno: perde acqua", importo: 160, scadenza: "2026-10-12", stato: "pagato", metodo: "bonifico" },
    { id: "pg3", fornitoreId: "f4", immobileId: null, voce: "Giardini di Dracena e Casa Zaro, ottobre", importo: 240, scadenza: "2026-11-25", stato: "da_pagare", metodo: "bonifico" },
    { id: "pg4", fornitoreId: "f12", immobileId: "i5", voce: "Chiave di riserva del cancello", importo: 18, scadenza: "2026-11-10", stato: "pagato", metodo: "contanti" },
    { id: "pg5", fornitoreId: "f5", immobileId: "i3", voce: "Estintore: controllo semestrale", importo: 25, scadenza: "2026-08-30", stato: "pagato", metodo: "bonifico" },
    { id: "pg6", fornitoreId: "f10", immobileId: null, voce: "Biancheria dal 1° al 15 novembre", importo: 196, scadenza: "2026-11-30", stato: "da_pagare", metodo: "bonifico" },
    { id: "pg7", fornitoreId: "f6", immobileId: "i2", voce: "Giardino: derattizzazione e trattamento zanzare", importo: 95, scadenza: "2026-10-01", stato: "pagato", metodo: "bonifico" },
    { id: "pg8", fornitoreId: "f3", immobileId: "i2", voce: "Lampadine esterne del gazebo", importo: 45, scadenza: "2026-09-20", stato: "pagato", metodo: "contanti" },
    { id: "pg9", fornitoreId: "f1", immobileId: "i3", voce: "Infiltrazione sotto il lavello", importo: 140, scadenza: "2026-07-10", stato: "pagato", metodo: "bonifico" },
  ],

  /* ---------- partner: transfer, escursioni, noleggi ---------- */
  partner: [
    { id: "pt1", nome: "Taxi e transfer dal porto", tipo: "transfer", commissione: 0.1 },
    { id: "pt2", nome: "Giro dell'isola in barca", tipo: "escursioni", commissione: 0.12 },
    { id: "pt3", nome: "Noleggio scooter a Ischia Porto", tipo: "noleggi", commissione: 0.1 },
  ],
  servizi: [
    { id: "s1", partnerId: "pt1", periodo: "giugno-agosto", venduto: 3900, metodoOspite: "contanti", stato: "incassata" },
    { id: "s2", partnerId: "pt1", periodo: "settembre-ottobre", venduto: 1400, metodoOspite: "carta", stato: "incassata" },
    { id: "s3", partnerId: "pt1", periodo: "1-20 novembre", venduto: 320, metodoOspite: "contanti", stato: "da_fatturare" },
    { id: "s4", partnerId: "pt2", periodo: "giugno-agosto", venduto: 5200, metodoOspite: "carta", stato: "incassata" },
    { id: "s5", partnerId: "pt2", periodo: "settembre-ottobre", venduto: 1100, metodoOspite: "carta", stato: "fatturata" },
    { id: "s6", partnerId: "pt3", periodo: "giugno-settembre", venduto: 2600, metodoOspite: "carta", stato: "incassata" },
  ],

  /* ---------- fisco di Tina ---------- */
  fatture: [],
  versamenti: [
    { id: "v1", data: "2026-02-16", tipo: "inps", voce: "INPS fissi 2025, 4ª rata", importo: 739.97, stato: "pagato" },
    { id: "v2", data: "2026-05-18", tipo: "inps", voce: "INPS fissi 2026, 1ª rata", importo: 750.04, stato: "pagato" },
    { id: "v3", data: "2026-07-20", tipo: "imposta", voce: "Imposta sostitutiva 2025, saldo", importo: 325, stato: "pagato" },
    { id: "v4", data: "2026-07-20", tipo: "accontoImposta", voce: "Imposta sostitutiva 2026, 1° acconto", importo: 1312.5, stato: "pagato" },
    { id: "v5", data: "2026-07-20", tipo: "inps", voce: "INPS eccedenza 2025, saldo", importo: 89, stato: "pagato" },
    { id: "v6", data: "2026-07-20", tipo: "accontoInps", voce: "INPS eccedenza 2026, 1° acconto", importo: 234.5, stato: "pagato" },
    { id: "v7", data: "2026-08-20", tipo: "inps", voce: "INPS fissi 2026, 2ª rata", importo: 750.04, stato: "pagato" },
    { id: "v8", data: "2026-11-16", tipo: "inps", voce: "INPS fissi 2026, 3ª rata", importo: 750.04, stato: "pagato" },
    { id: "v9", data: "2026-11-30", tipo: "accontoImposta", voce: "Imposta sostitutiva 2026, 2° acconto", importo: 1312.5, stato: "da_pagare" },
    { id: "v10", data: "2026-11-30", tipo: "accontoInps", voce: "INPS eccedenza 2026, 2° acconto", importo: 234.5, stato: "da_pagare" },
  ],
  costiGestore: [
    { id: "cg1", voce: "PMS e motore di prenotazione (Beddy)", categoria: "software", annuo: 600 },
    { id: "cg2", voce: "Vicus, da partner: 6 case", categoria: "software", annuo: null, calcolo: "quadra" },
    { id: "cg3", voce: "Commercialista", categoria: "servizi", annuo: 1100 },
    { id: "cg4", voce: "Assicurazione RC del gestore", categoria: "assicurazioni", annuo: 360 },
    { id: "cg5", voce: "PEC e firma digitale", categoria: "servizi", annuo: 75 },
    { id: "cg6", voce: "Diritto annuale Camera di commercio", categoria: "tasse", annuo: 53 },
    { id: "cg7", voce: "Conto corrente e POS", categoria: "servizi", annuo: 240 },
    { id: "cg8", voce: "Telefono e internet", categoria: "operativi", annuo: 420 },
    { id: "cg9", voce: "Scooter: carburante, bollo, assicurazione", categoria: "operativi", annuo: 1300 },
    { id: "cg10", voce: "Foto, annunci e sito", categoria: "marketing", annuo: 500 },
    { id: "cg11", voce: "Squadra pulizie", categoria: "operativi", annuo: 8350, riaddebito: true },
    { id: "cg12", voce: "Lavanderia biancheria", categoria: "operativi", annuo: 3100, riaddebito: true },
    { id: "cg13", voce: "Prodotti per pulizie e kit di cortesia", categoria: "operativi", annuo: 950, riaddebito: true },
  ],

  /* ---------- compliance di Tina ---------- */
  complianceGestore: {
    "g-piva": { stato: "ok", nota: "Codici 68.32 e 79.90 dal 2021" },
    "g-cciaa": { stato: "ok" },
    "g-inps": { stato: "ok" },
    "g-mandato": { stato: "da_fare" },
    "g-ritenute": { stato: "da_fare" },
    "g-cu": { stato: "da_fare" },
    "g-770": { stato: "ok", nota: "770 del 2026 inviato il 27 ottobre" },
    "g-dati": { stato: "ok", nota: "Dati 2025 inviati il 24 giugno" },
    "g-istat": { stato: "ok", nota: "Ottobre inviato il 3 novembre" },
    "g-soggiorno-dich": { stato: "ok", nota: "Dichiarazioni 2025 inviate ai 4 Comuni il 25 giugno" },
    "g-fe": { stato: "ok" },
    "g-bollo": { stato: "da_fare" },
    "g-redditi": { stato: "ok", nota: "Redditi 2026 inviato il 20 ottobre" },
    "g-gdpr": { stato: "ok", nota: "Nomina di Beddy come responsabile firmata" },
    "g-rc": { stato: "ok", nota: "Rinnovo il 30 aprile 2027" },
  },
  comuni: [
    { nome: "Ischia", periodicita: "mensile", prossima: "2026-12-16", stato: "ok" },
    { nome: "Barano d'Ischia", periodicita: "trimestrale", prossima: "2027-01-18", stato: "ok" },
    { nome: "Forio", periodicita: "mensile", prossima: "2026-11-30", stato: "da_fare" },
    { nome: "Serrara Fontana", periodicita: "trimestrale", prossima: "2027-01-18", stato: "ok" },
  ],

  parametri: {
    commissioneOta: 0.155, feeGestione: 0.2, pulizieSoggiorno: 55, sogliaAutorizzazione: 300,
    // prezzo fisso della piattaforma: Tina è partner Vicus, quindi niente quota base
    prezzo: { base: 39, perCasa: 12, pctLordo: 0, minMese: 12, mostra: true },
    moduli: { previsione: false },
  },
  avvio: {},
};

// Fatture delle fee: una per famiglia al mese, emessa il 5 del mese dopo.
// Tutte incassate, tranne quella di ottobre della Familie Weber.
{
  const mesi = ["05", "06", "07", "08", "09", "10", "11"];
  let n = 0;
  mesi.forEach((mm, k) => {
    for (const p of SEED.proprietari) {
      const lordo = sum(SEED.immobili.filter((i) => i.proprietarioId === p.id).map((i) => i.ricaviMese[k]));
      n += 1;
      SEED.fatture.push({
        id: `2026/${String(n).padStart(2, "0")}`,
        proprietarioId: p.id,
        mese: k,
        emessa: `2026-${mm}-05`,
        importo: Math.round(lordo * SEED.parametri.feeGestione * 100) / 100,
        stato: mm === "11" && p.id === "p3" ? "da_incassare" : "incassata",
      });
    }
  });
}

// Profilo completo per il playbook: case della famiglia nel portafoglio.
export function profiloCompleto(db, imm) {
  const nelPortafoglio = db.immobili.filter((i) => i.proprietarioId === imm.proprietarioId).length;
  return { ...imm.profilo, units: nelPortafoglio + (Number(imm.profilo.extraUnits) || 0) };
}

// Le case di esempio sono già operative: segniamo come fatti i passaggi,
// tranne quelli che descrivono i problemi reali del portafoglio.
const APERTI = { i4: ["p2-gas"], i5: ["p5-nonres"] };
for (const imm of SEED.immobili) {
  const p = profiloCompleto(SEED, imm);
  const plan = buildPlan(p, decideForm(p));
  SEED.avvio[imm.id] = Object.fromEntries(plan.filter((s) => !(APERTI[imm.id] || []).includes(s.id)).map((s) => [s.id, true]));
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const clone = (x) => JSON.parse(JSON.stringify(x));
const store = clone(SEED);
let seq = 0;

/** Somma n giorni a una data "AAAA-MM-GG". */
export function piuGiorni(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const MAPPE = new Set(["turni", "complianceGestore"]);

export const api = {
  // GET /api/portafoglio
  async getPortafoglio() {
    await delay(250);
    return clone(store);
  },

  // PATCH /api/:collezione/:id   prenotazioni, pagamenti, servizi, comuni (per nome), interventi,
  //                              adempimenti, scorte, turniExtra, addetti, destinatari
  async aggiorna(collezione, id, patch) {
    await delay(100);
    const lista = collezione === "destinatari" ? store.invio.destinatari : store[collezione];
    const x = lista.find((v) => (v.id ?? v.nome) === id);
    if (x) Object.assign(x, patch);
    if (collezione === "interventi" && patch.stato === "programmato")
      for (const d of store.decisioni) if (d.interventoId === id && d.decisione === "in_attesa") Object.assign(d, { decisione: "accettata", data: store.oggi });
    return x;
  },

  // PATCH /api/turni/:id · /api/compliance-gestore/:id
  async aggiornaVoce(mappa, id, patch) {
    await delay(100);
    if (!MAPPE.has(mappa)) return null;
    store[mappa][id] = { ...(store[mappa][id] || {}), ...patch };
    return store[mappa][id];
  },

  // PATCH /api/immobili/:id/avvio/:stepId
  async aggiornaPasso(immobileId, stepId, fatto) {
    await delay(100);
    store.avvio[immobileId] = { ...(store.avvio[immobileId] || {}), [stepId]: fatto };
    return store.avvio[immobileId];
  },

  // PATCH /api/immobili/:id/biancheria
  async aggiornaBiancheria(immobileId, tipo, patch) {
    await delay(100);
    const imm = store.immobili.find((i) => i.id === immobileId);
    const b = imm?.biancheria.find((x) => x.tipo === tipo);
    if (b) Object.assign(b, patch);
    return b;
  },

  // PATCH /api/gestore/fiscale
  async aggiornaFiscale(patch) {
    await delay(80);
    Object.assign(store.gestore.fiscale, patch);
    return store.gestore.fiscale;
  },

  // POST /api/interventi   nuova segnalazione (anche da un turno di pulizia)
  async creaIntervento(dati) {
    await delay(120);
    seq += 1;
    const m = { id: `mn${seq}`, data: store.oggi, stato: "nuovo", costo: 0, foto: 0, ...dati };
    store.interventi.push(m);
    return clone(m);
  },

  // POST /api/programmi/:id/eseguito   registra il controllo e crea il pagamento al fornitore
  async registraProgramma(id) {
    await delay(150);
    const pr = store.programmi.find((x) => x.id === id);
    if (!pr) return null;
    pr.ultima = store.oggi;
    seq += 1;
    const pagamento = { id: `pgn${seq}`, fornitoreId: pr.fornitoreId, immobileId: pr.immobileId, voce: pr.voce, importo: pr.costo, scadenza: piuGiorni(store.oggi, 30), stato: "da_pagare", metodo: "bonifico" };
    if (pr.costo > 0) store.pagamenti.push(pagamento);
    return { programma: clone(pr), pagamento: pr.costo > 0 ? clone(pagamento) : null };
  },

  // POST /api/interventi/:id/chiudi   lavoro fatto: crea il pagamento al fornitore
  async chiudiIntervento(id) {
    await delay(150);
    const m = store.interventi.find((x) => x.id === id);
    if (!m) return null;
    Object.assign(m, { stato: "chiuso", quando: m.quando ?? store.oggi });
    seq += 1;
    const pagamento = m.costo > 0 ? { id: `pgn${seq}`, fornitoreId: m.fornitoreId, immobileId: m.immobileId, voce: m.voce, importo: m.costo, scadenza: piuGiorni(store.oggi, 30), stato: "da_pagare", metodo: "bonifico" } : null;
    if (pagamento) store.pagamenti.push(pagamento);
    return { intervento: clone(m), pagamento };
  },

  // POST /api/immobili
  async creaImmobile({ nome, proprietarioId, nuovoProprietario, profilo }) {
    await delay(200);
    seq += 1;
    let pid = proprietarioId;
    if (!pid) {
      pid = `pn${seq}`;
      store.proprietari.push({ id: pid, nome: nuovoProprietario, residenza: profilo.nonResident ? "Estero" : "Italia", mandato: { firmato: null, soglia: null, scadenza: null } });
    }
    const imm = {
      id: `in${seq}`, nome, comune: profilo.comune, tipo: "", proprietarioId: pid,
      cin: "", cedolare: null, soggiornoNotte: 0, soggiorni: 0,
      ricaviMese: [...ZERO], notti: [...ZERO], incasso: { gestore: 0, portale: 0 },
      costiFissi: { imu: 0, tari: 0, utenze: 0, internet: 0, condominio: 0, assicurazione: 0 }, profilo,
      scheda: { indirizzo: profilo.comune, ospiti: 0, mq: profilo.sqm }, pulizia: { compenso: 0, addebito: 0, checklist: CHECK_BASE([]) },
      biancheria: [], recensioni: null, dotazioni: [], documenti: [{ voce: "CIN", stato: "manca" }],
    };
    store.immobili.push(imm);
    store.avvio[imm.id] = {};
    return clone(store);
  },
};
