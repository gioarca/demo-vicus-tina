import { piuGiorni, sum } from "../data/api.js";
import { giorniTra } from "./operativita.js";

/* =====================================================================
   VICUS — pulizie, biancheria, scorte e finestre per i lavori.
   Funzioni pure: ricevono il portafoglio e restituiscono dati pronti
   per le schermate. Ogni turno nasce da una partenza, da un cambio di
   metà soggiorno o da un sopralluogo, e porta con sé la checklist della
   casa, chi arriva dopo e quanto costa.
   ===================================================================== */

/** Stato di un turno: tono del chip ed etichetta. */
export const STATO_TURNO = {
  da_assegnare: ["bad", "da assegnare"],
  assegnato: ["warn", "assegnato, da confermare"],
  confermato: ["neutro", "confermato"],
  fatto: ["warn", "fatto, da verificare"],
  ripasso: ["bad", "ripasso richiesto"],
  verificato: ["ok", "verificato"],
};

export const CHECK_SOPRALLUOGO = ["Arieggiare le stanze", "Umidità e muffa", "Acqua e gas chiusi", "Infiltrazioni dal terrazzo", "Foto delle stanze"];

export const casa = (db, id) => db.immobili.find((i) => i.id === id);
export const addetta = (db, id) => db.addetti.find((a) => a.id === id);

/** La casa ha ospiti la notte del giorno d? */
export const occupata = (db, immobileId, d) => db.prenotazioni.some((b) => b.immobileId === immobileId && b.arrivo <= d && d < b.partenza);

/** Prossimo arrivo in una casa, da oggi compreso. */
export const prossimoArrivo = (db, immobileId, da = db.oggi) =>
  db.prenotazioni.filter((b) => b.immobileId === immobileId && b.arrivo >= da).sort((a, b) => a.arrivo.localeCompare(b.arrivo))[0] ?? null;

/** Il primo giorno, da oggi, in cui la casa è vuota anche di giorno: è lì che si fanno i lavori. */
export function finestraLibera(db, immobileId, da = db.oggi, max = 60) {
  const imm = casa(db, immobileId);
  for (let i = 0; i < max; i++) {
    const d = piuGiorni(da, i);
    const dentro = db.prenotazioni.some((b) => b.immobileId === immobileId && b.arrivo < d && d < b.partenza);
    const arriva = db.prenotazioni.some((b) => b.immobileId === immobileId && b.arrivo === d);
    if (!dentro && !arriva) {
      let fine = d;
      while (giorniTra(d, fine) < 30 && !db.prenotazioni.some((b) => b.immobileId === immobileId && b.arrivo <= piuGiorni(fine, 1) && piuGiorni(fine, 1) < b.partenza)) fine = piuGiorni(fine, 1);
      return { dal: d, al: fine, giorni: giorniTra(d, fine) + 1, chiusa: Boolean(imm?.chiusa) };
    }
  }
  return null;
}

function compenso(db, t) {
  const imm = casa(db, t.immobileId);
  const a = t.addettoId ? addetta(db, t.addettoId) : null;
  const base = t.tipo === "meta" ? Math.round(imm.pulizia.compenso * 0.6) : t.tipo === "sopralluogo" ? 15 : imm.pulizia.compenso;
  return Math.round(base * (1 + (a?.maggiorazione ?? 0)));
}

/**
 * Tutti i turni nella finestra: partenze, metà soggiorno, sopralluoghi.
 * Il turno di partenza sa se nello stesso giorno arriva un altro ospite
 * (cambio stretto) e con quante persone.
 */
export function turniTutti(db, { da = -5, a = 14 } = {}) {
  const inizio = piuGiorni(db.oggi, da);
  const fine = piuGiorni(db.oggi, a);
  const partenze = db.prenotazioni
    .filter((b) => b.partenza >= inizio && b.partenza <= fine)
    .map((b) => {
      const dopo = prossimoArrivo(db, b.immobileId, b.partenza);
      const stretto = dopo && dopo.arrivo === b.partenza;
      const s = db.turni[b.id] || { addettoId: null, stato: "da_assegnare", foto: 0 };
      return {
        id: b.id, immobileId: b.immobileId, data: b.partenza, tipo: "partenza", dalle: "10:30",
        entro: stretto ? dopo.orario || "15:00" : null, cambioStretto: Boolean(stretto),
        prossimo: dopo, ...s,
      };
    });
  const extra = db.turniExtra.filter((t) => t.data >= inizio && t.data <= fine).map((t) => ({ ...t, prossimo: prossimoArrivo(db, t.immobileId, piuGiorni(t.data, 1)) }));
  return [...partenze, ...extra]
    .map((t) => {
      const imm = casa(db, t.immobileId);
      const checklist = t.tipo === "sopralluogo" ? CHECK_SOPRALLUOGO : imm.pulizia.checklist;
      return { ...t, checklist, compenso: compenso(db, t), urgente: t.prossimo && giorniTra(t.data, t.prossimo.arrivo) <= 0 };
    })
    .sort((x, y) => x.data.localeCompare(y.data) || (x.dalle || "").localeCompare(y.dalle || ""));
}

export const fotoComplete = (t) => t.foto >= t.checklist.length;

/** Affidabilità di un'addetta: un numero solo, dai dati della stagione. */
export function affidabilita(a) {
  const s = a.storico;
  return Math.round((s.puntualita * 0.35 + s.foto * 0.35 + (s.voto / 5) * 0.3) * 100);
}

/** Quanto si deve a ogni addetta per il mese: storico più i turni verificati da oggi in poi. */
export function compensiMese(db, turni) {
  return db.addetti.map((a) => {
    const nuovi = turni.filter((t) => t.addettoId === a.id && t.stato === "verificato" && t.data >= db.oggi && t.data.slice(0, 7) === db.oggi.slice(0, 7));
    return { ...a, turniMese: a.mese.turni + nuovi.length, importoMese: a.mese.importo + sum(nuovi.map((t) => t.compenso)) };
  });
}

/** Biancheria: per ogni tipo, bastano i set puliti per il prossimo cambio? E per i due successivi? */
export function statoBiancheria(db, imm, turni) {
  const cambi = turni.filter((t) => t.immobileId === imm.id && t.tipo !== "sopralluogo" && t.data >= db.oggi).length;
  return imm.biancheria.map((b) => {
    const subito = b.puliti >= b.servono;
    const due = b.puliti + b.lavanderia >= b.servono * Math.min(2, Math.max(1, cambi));
    return { ...b, cambi, stato: !subito ? "manca" : !due ? "stretto" : "ok", mancano: Math.max(0, b.servono - b.puliti) };
  });
}

/** Scorte: per quanti cambi bastano, e cosa comprare. */
export function statoScorte(db, cambi14) {
  return db.scorte.map((s) => {
    const bastaPer = s.perCambio > 0 ? Math.floor(s.quantita / s.perCambio) : null;
    const serve = s.perCambio * cambi14;
    const sotto = s.quantita < s.soglia || (bastaPer != null && bastaPer < cambi14);
    const daComprare = sotto ? Math.max(Math.ceil(s.soglia * 2 - s.quantita), Math.ceil(serve - s.quantita)) : 0;
    return { ...s, bastaPer, sotto, daComprare, costo: daComprare * s.prezzo };
  });
}

/** Mesi di garanzia rimasti a una dotazione (negativo se scaduta). */
export const garanzia = (d, oggi) => (d.garanziaFino ? Math.round(giorniTra(oggi, d.garanziaFino) / 30.4) : null);
