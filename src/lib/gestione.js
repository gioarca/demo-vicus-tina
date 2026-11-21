import { FISCO_2026, cedolareImmobile, previsionaleForfettario, verificaContanti, versamentiAnnoDopo } from "regole-affitti-brevi";
import { piuGiorni, sum } from "../data/api.js";
import { contoEconomico } from "./formati.js";
import { quadraCost } from "./value.js";

/* =====================================================================
   VICUS — fisco del gestore, costi d'esercizio, rendiconto ai
   proprietari. Le regole stanno nel motore condiviso: qui si leggono
   i dati del portafoglio e si passano al motore.
   ===================================================================== */

const r2 = (n) => Math.round(n * 100) / 100;
const anno = (iso) => Number(iso.slice(0, 4));

/**
 * Entrate del gestore per cassa, divise per quanto sono certe:
 * incassate, fatturate da incassare, prenotazioni già in calendario.
 * Le fee di dicembre si fatturano a gennaio: entrano nel reddito dell'anno dopo.
 */
export function entrateGestore(db) {
  const fee = db.parametri.feeGestione;
  const incassate = sum(db.fatture.filter((f) => f.stato === "incassata").map((f) => f.importo));
  const daIncassare = sum(db.fatture.filter((f) => f.stato !== "incassata").map((f) => f.importo));
  const novembre = db.prenotazioni.filter((b) => b.arrivo >= "2026-11-01" && b.arrivo < "2026-12-01");
  const dicembre = db.prenotazioni.filter((b) => b.arrivo >= "2026-12-01");
  const feeCalendario = r2(sum(novembre.map((b) => b.lordo)) * fee);
  const feeAnnoDopo = r2(sum(dicembre.map((b) => b.lordo)) * fee);

  const comm = (s) => {
    const p = db.partner.find((x) => x.id === s.partnerId);
    return r2(s.venduto * (p ? p.commissione : 0));
  };
  const servizi = db.servizi.map((s) => ({ ...s, commissione: comm(s) }));
  const commIncassate = sum(servizi.filter((s) => s.stato === "incassata").map((s) => s.commissione));
  const commDaIncassare = sum(servizi.filter((s) => s.stato !== "incassata").map((s) => s.commissione));

  const certe = r2(incassate + commIncassate);
  const attese = r2(daIncassare + commDaIncassare);
  const totale = r2(certe + attese + feeCalendario);
  return {
    incassate: certe,
    attese,
    calendario: feeCalendario,
    annoDopo: feeAnnoDopo,
    totale,
    quotaCerta: totale > 0 ? certe / totale : 0,
    perAteco: [
      { ateco: "68.32", importo: r2(incassate + daIncassare + feeCalendario) },
      { ateco: "79.90", importo: r2(commIncassate + commDaIncassare) },
    ],
    servizi,
    fattureAperte: db.fatture.filter((f) => f.stato !== "incassata"),
  };
}

/** Somma dei versamenti dell'anno di un certo tipo, pagati o già in calendario. */
const versati = (db, tipi, y = FISCO_2026.anno) => r2(sum(db.versamenti.filter((v) => tipi.includes(v.tipo) && anno(v.data) === y).map((v) => v.importo)));

/** Previsionale di imposta e contributi dell'anno sulle entrate reali. */
export function previsionaleGestore(db, entrate = entrateGestore(db)) {
  const { avvio, riduzione } = db.gestore.fiscale;
  const p = previsionaleForfettario({
    ricavi: entrate.perAteco.filter((r) => r.importo > 0),
    contributiVersati: versati(db, ["inps", "accontoInps"]),
    accontiImposta: versati(db, ["accontoImposta"]),
    accontiInps: versati(db, ["accontoInps"]),
    avvio,
    riduzione,
  });
  // Calendario dei versamenti da oggi: quelli già fissati quest'anno e quelli che il previsionale genera.
  const restanti = db.versamenti.filter((v) => v.stato !== "pagato" && v.data >= db.oggi).map((v) => ({ ...v, stima: false, fissato: true }));
  const prossimi = versamentiAnnoDopo(p).map((v) => ({ ...v, id: `${v.tipo}-${v.rata ?? 0}-${v.anno}`, fissato: false }));
  const calendario = [...restanti, ...prossimi].sort((a, b) => a.data.localeCompare(b.data));
  const entro12 = calendario.filter((v) => v.data <= piuGiorni(db.oggi, 365));
  return { ...p, calendario, accantonamento: r2(sum(entro12.map((v) => v.importo)) / 12), totale12: r2(sum(entro12.map((v) => v.importo))) };
}

/** Costi d'esercizio del gestore. Nel forfettario non si deducono: il coefficiente li copre in modo forfettario. */
export function costiGestore(db) {
  const quadra = sum(db.immobili.map((i) => quadraCost(contoEconomico(i, db.interventi, db.parametri).lordo, db.parametri.prezzo)));
  const voci = db.costiGestore.map((c) => ({ ...c, annuo: c.calcolo === "quadra" ? quadra : c.annuo }));
  const aCarico = sum(voci.filter((c) => !c.riaddebito).map((c) => c.annuo));
  const riaddebitati = sum(voci.filter((c) => c.riaddebito).map((c) => c.annuo));
  const addebitatiProprietari = sum(db.immobili.map((i) => i.soggiorni * (i.pulizia?.addebito ?? db.parametri.pulizieSoggiorno)));
  return { voci, aCarico, riaddebitati, addebitatiProprietari, differenza: addebitatiProprietari - riaddebitati };
}

/** Quanto resta al gestore, in cassa, dopo imposta, contributi e costi. */
export function nettoGestore(entrate, prev, costi) {
  const netto = entrate.totale - prev.carico - costi.aCarico;
  return { netto: r2(netto), mese: r2(netto / 12), quota: entrate.totale > 0 ? netto / entrate.totale : 0 };
}

/** Rendiconto per proprietario: conto economico, cedolare, ritenute, costi della casa. */
export function rendiconto(db, proprietarioId) {
  const righe = db.immobili
    .filter((i) => i.proprietarioId === proprietarioId)
    .map((imm) => {
      const ce = contoEconomico(imm, db.interventi, db.parametri);
      const prima = ce.lordo - ce.ota - ce.fee - ce.pulizie - ce.manutenzione;
      const c = cedolareImmobile({ lordo: ce.lordo, aliquota: imm.cedolare, quotaGestore: imm.incasso.gestore, quotaPortale: imm.incasso.portale });
      const casa = sum(Object.values(imm.costiFissi));
      const imposte = c.cedolare ?? 0;
      return { imm, ce, primaImposte: prima, ...c, casa, nettoReale: prima - imposte - casa };
    });
  const tot = (k) => sum(righe.map((r) => r[k] ?? 0));
  return {
    righe,
    totale: {
      lordo: sum(righe.map((r) => r.ce.lordo)),
      primaImposte: tot("primaImposte"),
      cedolare: tot("cedolare"),
      ritenute: tot("ritenuteGestore") + tot("ritenutePortale"),
      ritenuteGestore: tot("ritenuteGestore"),
      conguaglio: tot("conguaglio"),
      casa: tot("casa"),
      nettoReale: tot("nettoReale"),
      regimeAperto: righe.some((r) => r.aliquota == null),
    },
  };
}

/** Ritenute trattenute dal gestore su un mese della stagione (0 = aprile): vanno nell'F24 del 16 del mese dopo. */
export const ritenuteMese = (db, k) =>
  r2(sum(db.immobili.map((i) => i.ricaviMese[k] * i.incasso.gestore * FISCO_2026.cedolare.ritenuta)));

/** Incassi diretti dagli ospiti, con il controllo sul limite dei contanti. */
export const incassiDiretti = (db) =>
  db.prenotazioni.filter((b) => b.pagamento).map((b) => ({ ...b, controllo: b.pagamento.metodo === "contanti" ? verificaContanti(b.lordo) : "ok" }));

/** Fatture emesse in un trimestre: per il bollo da 2 €. */
export function fattureTrimestre(db, y, q) {
  const da = `${y}-${String(q * 3 - 2).padStart(2, "0")}-01`;
  const a = q === 4 ? `${y + 1}-01-01` : `${y}-${String(q * 3 + 1).padStart(2, "0")}-01`;
  return db.fatture.filter((f) => f.emessa >= da && f.emessa < a);
}
