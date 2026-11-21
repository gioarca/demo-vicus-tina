import { L } from "./lingua.js";

/* =====================================================================
   Fisco di chi gestisce affitti brevi e dei proprietari.
   - Gestore in regime forfettario: coefficienti per codice ATECO,
     imposta sostitutiva, contributi INPS commercianti, acconti.
   - Proprietario: cedolare secca e ritenute già trattenute.
   I valori cambiano ogni anno: stanno tutti in FISCO_2026, con la fonte.
   Sono stime da validare con il commercialista, non un calcolo F24.
   ===================================================================== */

/** @typedef {import("./lingua.js").Testo} Testo */

export const FISCO_2026 = Object.freeze({
  anno: 2026,
  verificato: "2026-11-08",
  forfettario: {
    soglia: 85000, //            oltre: si esce dal regime dall'anno dopo
    uscitaImmediata: 100000, //  oltre: si esce subito, nell'anno stesso
    aliquota: 0.15,
    aliquotaAvvio: 0.05, //      primi 5 anni di una nuova attività, se ci sono i requisiti
    fonte: "L. 190/2014, art. 1, commi 54-89",
  },
  /** Coefficiente di redditività per gruppo ATECO. */
  coefficienti: {
    "68.32": {
      coeff: 0.86,
      voce: L("Gestione di immobili per conto terzi", "Property management for third parties", "Immobilienverwaltung für Dritte"),
      daVerificare: false,
    },
    "79.90": {
      coeff: 0.67,
      voce: L(
        "Prenotazione di servizi turistici (commissioni dai partner)",
        "Booking of tourist services (partner commissions)",
        "Vermittlung touristischer Leistungen (Partnerprovisionen)",
      ),
      daVerificare: true, // dipende da come è inquadrata l'attività: va confermato dal commercialista
    },
  },
  inps: {
    gestione: "commercianti",
    minimale: 18808,
    aliquota: 0.2448, //     fino a fasciaOltre
    aliquotaOltre: 0.2548,
    fasciaOltre: 56224,
    massimale: 122295, //    iscritti dal 1996
    maternita: 7.44, //      0,62 € al mese, non ridotto
    riduzione: 0.35, //      per i forfettari che la chiedono
    rateFisse: ["05-16", "08-20", "11-16", "02-16"], // l'ultima cade nell'anno dopo
    fonte: "INPS, circolare n. 14 del 9 febbraio 2026",
  },
  acconti: {
    minimo: 51.65, //   sotto: nessun acconto
    unaRata: 257.52, // sotto: una sola rata a novembre
    quotaPrima: 0.5,
    saldo: "06-30", //  nel 2026 prorogato al 20 luglio per ISA e forfettari
    secondo: "11-30",
    fonte: "D.P.R. 435/2001, art. 17; D.L. 124/2019, art. 58",
  },
  cedolare: {
    aliquota: 0.21,
    altriImmobili: 0.26, // dal secondo immobile in affitto breve
    ritenuta: 0.21,
    codiceTributo: "1919",
    fonte: "D.L. 50/2017, art. 4; L. 213/2023, art. 1, comma 63",
  },
  contanti: { limite: 5000, fonte: "D.Lgs. 231/2007, art. 49" }, // vietati pagamenti da 5.000 € in su
  bollo: { soglia: 77.47, importo: 2, scadenze: ["05-31", "09-30", "11-30", "02-28"] },
});

const r2 = (n) => Math.round(n * 100) / 100;
const somma = (a) => a.reduce((s, x) => s + x, 0);

/** Sposta al lunedì una scadenza che cade di sabato o di domenica. "2026-05-16" → "2026-05-18". */
export function giornoUtile(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const g = dt.getUTCDay();
  if (g === 6) dt.setUTCDate(dt.getUTCDate() + 2);
  if (g === 0) dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

/**
 * Contributi INPS commercianti dovuti per un anno.
 * I fissi si pagano anche con reddito sotto il minimale.
 * @param {number} reddito  reddito d'impresa (nel forfettario: ricavi × coefficiente)
 * @param {{ riduzione?: boolean }} [o]
 */
export function contributiInps(reddito, { riduzione = false } = {}, p = FISCO_2026.inps) {
  const k = riduzione ? 1 - p.riduzione : 1;
  const r = Math.min(Math.max(reddito, 0), p.massimale);
  const fissi = p.minimale * p.aliquota * k + p.maternita;
  const fascia1 = Math.max(0, Math.min(r, p.fasciaOltre) - p.minimale);
  const fascia2 = Math.max(0, r - p.fasciaOltre);
  const eccedenza = (fascia1 * p.aliquota + fascia2 * p.aliquotaOltre) * k;
  return { fissi: r2(fissi), eccedenza: r2(eccedenza), totale: r2(fissi + eccedenza), rata: r2(fissi / 4) };
}

/**
 * Acconti dovuti per l'anno dopo, con il metodo storico (100% dell'imposta dell'anno).
 * @returns {Array<{ rata: 1 | 2, importo: number }>}
 */
export function rateAcconto(imposta, a = FISCO_2026.acconti) {
  if (imposta < a.minimo) return [];
  if (imposta < a.unaRata) return [{ rata: 2, importo: r2(imposta) }];
  return [
    { rata: 1, importo: r2(imposta * a.quotaPrima) },
    { rata: 2, importo: r2(imposta * (1 - a.quotaPrima)) },
  ];
}

/**
 * Previsionale di imposta e contributi per un gestore in forfettario.
 * Tutto per cassa: ricavi incassati e contributi versati nell'anno.
 * @param {object} a
 * @param {Array<{ ateco: string, importo: number }>} a.ricavi
 * @param {number} a.contributiVersati  INPS versato nell'anno, qualunque anno si riferisca: si deduce
 * @param {number} a.accontiImposta     acconti d'imposta già versati per quest'anno
 * @param {number} a.accontiInps        acconti INPS sull'eccedenza già versati per quest'anno
 * @param {boolean} a.avvio             aliquota del 5% per i primi cinque anni
 * @param {boolean} a.riduzione         riduzione contributiva del 35%
 */
export function previsionaleForfettario(a, f = FISCO_2026) {
  const righe = a.ricavi.map((r) => {
    const c = f.coefficienti[r.ateco];
    if (!c) throw new Error(`Coefficiente non configurato per ATECO ${r.ateco}`);
    return { ...r, coeff: c.coeff, voce: c.voce, daVerificare: c.daVerificare, reddito: r2(r.importo * c.coeff) };
  });
  const ricavi = r2(somma(righe.map((r) => r.importo)));
  const reddito = r2(somma(righe.map((r) => r.reddito)));
  const inps = contributiInps(reddito, { riduzione: a.riduzione }, f.inps);
  const imponibile = r2(Math.max(0, reddito - a.contributiVersati));
  const aliquota = a.avvio ? f.forfettario.aliquotaAvvio : f.forfettario.aliquota;
  const imposta = r2(imponibile * aliquota);
  const { soglia, uscitaImmediata } = f.forfettario;
  return {
    anno: f.anno,
    righe,
    ricavi,
    reddito,
    inps,
    contributiDedotti: r2(a.contributiVersati),
    imponibile,
    aliquota,
    imposta,
    saldoImposta: r2(imposta - a.accontiImposta),
    saldoInps: r2(inps.eccedenza - a.accontiInps),
    accontiImposta: rateAcconto(imposta, f.acconti),
    accontiInps: inps.eccedenza > 0 ? [{ rata: 1, importo: r2(inps.eccedenza / 2) }, { rata: 2, importo: r2(inps.eccedenza / 2) }] : [],
    carico: r2(imposta + inps.totale),
    soglia: {
      limite: soglia,
      quota: ricavi / soglia,
      margine: r2(soglia - ricavi),
      stato: ricavi > uscitaImmediata ? "uscita" : ricavi > soglia ? "superata" : ricavi > soglia * 0.85 ? "vicina" : "ok",
    },
  };
}

/**
 * Versamenti che il previsionale genera nell'anno dopo, in ordine di data.
 * I contributi fissi dell'anno dopo sono stimati con i valori di quest'anno.
 * @param {ReturnType<typeof previsionaleForfettario>} p
 * @returns {Array<{ data: string, tipo: "inpsFissi" | "saldoImposta" | "accontoImposta" | "saldoInps" | "accontoInps", rata?: number, anno: number, importo: number, stima: boolean }>}
 */
export function versamentiAnnoDopo(p, f = FISCO_2026) {
  const a = p.anno;
  const b = a + 1;
  const [r1, r2_, r3, r4] = f.inps.rateFisse;
  const g = (anno, mmgg) => giornoUtile(`${anno}-${mmgg}`);
  const out = [
    { data: g(b, r4), tipo: "inpsFissi", rata: 4, anno: a, importo: p.inps.rata, stima: false },
    { data: g(b, r1), tipo: "inpsFissi", rata: 1, anno: b, importo: p.inps.rata, stima: true },
    { data: g(b, f.acconti.saldo), tipo: "saldoImposta", anno: a, importo: p.saldoImposta, stima: false },
    { data: g(b, f.acconti.saldo), tipo: "saldoInps", anno: a, importo: p.saldoInps, stima: false },
    ...p.accontiImposta.map((x) => ({ data: g(b, x.rata === 1 ? f.acconti.saldo : f.acconti.secondo), tipo: "accontoImposta", rata: x.rata, anno: b, importo: x.importo, stima: false })),
    ...p.accontiInps.map((x) => ({ data: g(b, x.rata === 1 ? f.acconti.saldo : f.acconti.secondo), tipo: "accontoInps", rata: x.rata, anno: b, importo: x.importo, stima: false })),
    { data: g(b, r2_), tipo: "inpsFissi", rata: 2, anno: b, importo: p.inps.rata, stima: true },
    { data: g(b, r3), tipo: "inpsFissi", rata: 3, anno: b, importo: p.inps.rata, stima: true },
  ];
  return out.filter((x) => x.importo > 0).sort((x, y) => x.data.localeCompare(y.data));
}

/**
 * Cedolare di un immobile e ritenute già trattenute da chi ha incassato.
 * Ritenute del gestore e del portale sono acconti: il conguaglio va in dichiarazione.
 * @param {object} a
 * @param {number} a.lordo
 * @param {number | null} a.aliquota       0.21, 0.26 o null se il regime è da verificare
 * @param {number} a.quotaGestore          parte del lordo incassata dal gestore
 * @param {number} a.quotaPortale          parte incassata da un portale che trattiene
 */
export function cedolareImmobile({ lordo, aliquota, quotaGestore, quotaPortale }, f = FISCO_2026) {
  const ritenuteGestore = r2(lordo * quotaGestore * f.cedolare.ritenuta);
  const ritenutePortale = r2(lordo * quotaPortale * f.cedolare.ritenuta);
  if (aliquota == null) return { aliquota: null, cedolare: null, ritenuteGestore, ritenutePortale, conguaglio: null };
  const cedolare = r2(lordo * aliquota);
  return { aliquota, cedolare, ritenuteGestore, ritenutePortale, conguaglio: r2(cedolare - ritenuteGestore - ritenutePortale) };
}

/** Un pagamento in contanti è ammesso? Il limite è "sotto 5.000 €": da 5.000 € in su è vietato. */
export function verificaContanti(importo, f = FISCO_2026) {
  if (importo >= f.contanti.limite) return "vietato";
  if (importo >= f.contanti.limite * 0.8) return "attenzione";
  return "ok";
}

/** Bollo dovuto per un gruppo di fatture senza IVA. */
export const bolloFatture = (importi, f = FISCO_2026) => importi.filter((x) => x > f.bollo.soglia).length * f.bollo.importo;
