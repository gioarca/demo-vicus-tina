import { piuGiorni } from "../data/api.js";

/* =====================================================================
   VICUS — calendario, turni di pulizia, manutenzione programmata.
   Funzioni pure: ricevono il portafoglio e la data di oggi.
   ===================================================================== */

export const giorniTra = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export function piuMesi(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, 1));
  const ultimo = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(d, ultimo));
  return dt.toISOString().slice(0, 10);
}

/** Voci della checklist di ogni cambio: l'addetto chiude ciascuna con una foto. */
export const CHECKLIST = ["letti", "bagno", "cucina", "pavimenti", "rifiuti", "kit", "danni", "chiavi"];

/** I giorni mostrati nel calendario, da oggi. */
export const giorni = (oggi, n) => Array.from({ length: n }, (_, i) => piuGiorni(oggi, i));

/**
 * Turni di pulizia: uno per ogni partenza nella finestra.
 * Se nello stesso giorno arriva un altro ospite è un cambio stretto,
 * da chiudere prima del suo orario di arrivo.
 */
export function turniPulizia(db, { da = -3, a = 14 } = {}) {
  const inizio = piuGiorni(db.oggi, da);
  const fine = piuGiorni(db.oggi, a);
  return db.prenotazioni
    .filter((b) => b.partenza >= inizio && b.partenza <= fine)
    .map((b) => {
      const dopo = db.prenotazioni.find((x) => x.immobileId === b.immobileId && x.arrivo === b.partenza);
      const s = db.turni[b.id] || { addettoId: null, stato: "da_assegnare", foto: 0 };
      return {
        id: b.id,
        immobileId: b.immobileId,
        data: b.partenza,
        dalle: "10:00",
        entro: dopo ? dopo.orario : null,
        cambioStretto: Boolean(dopo),
        prossimo: dopo ? dopo.id : null,
        ...s,
      };
    })
    .sort((x, y) => x.data.localeCompare(y.data) || x.immobileId.localeCompare(y.immobileId));
}

/** Arrivi entro due giorni senza orario: la regola della casa chiede il preavviso di 24 ore. */
export const arriviSenzaOrario = (db) =>
  db.prenotazioni.filter((b) => !b.orario && b.arrivo >= db.oggi && giorniTra(db.oggi, b.arrivo) <= 2);

/** Ospiti arrivati senza schedina: scade 24 ore dopo l'arrivo. */
export const alloggiatiAperti = (db) =>
  db.prenotazioni.filter((b) => b.arrivo <= db.oggi && b.partenza >= db.oggi && b.alloggiati !== "inviata");

/** Riepilogo di domani da inviare in automatico: arrivi, partenze, cambi. */
export function riepilogo(db, giorno = piuGiorni(db.oggi, 1)) {
  return {
    giorno,
    arrivi: db.prenotazioni.filter((b) => b.arrivo === giorno),
    partenze: db.prenotazioni.filter((b) => b.partenza === giorno),
  };
}

/** Stato di un controllo programmato. */
export function statoProgramma(pr, oggi) {
  if (!pr.ultima) return { prossima: null, stato: "da_programmare", giorni: null };
  const prossima = piuMesi(pr.ultima, pr.ogniMesi);
  const g = giorniTra(oggi, prossima);
  return { prossima, giorni: g, stato: g < 0 ? "scaduto" : g <= 21 ? "in_arrivo" : "ok" };
}

/** Il cambio fatto si può verificare solo con tutte le foto della checklist. */
export const fotoComplete = (turno) => turno.foto >= CHECKLIST.length;
