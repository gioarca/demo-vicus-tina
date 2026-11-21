import { adempimentiGestore, bolloFatture, localeOf, prossimaScadenza, tx } from "regole-affitti-brevi";
import { piuGiorni, sum } from "../data/api.js";
import { fattureTrimestre, incassiDiretti, ritenuteMese } from "./gestione.js";
import { alloggiatiAperti, arriviSenzaOrario, giorniTra, statoProgramma } from "./operativita.js";

/* =====================================================================
   VICUS — stato degli obblighi del gestore e scadenziario unico.
   Lo scadenziario mette in fila tutto ciò che ha una data: immobili,
   F24, imposta di soggiorno, manutenzione obbligatoria, fornitori,
   ospiti. Un titolo è una stringa (dato inserito) o { k, v } (testo
   dell'interfaccia da tradurre).
   ===================================================================== */

const MESE_DELLA_STAGIONE = { 11: 6, 10: 5, 9: 4, 8: 3, 7: 2, 6: 1, 5: 0 }; // F24 di novembre → ritenute di ottobre

/** Problemi dei mandati: senza firma, senza soglia di spesa, in scadenza entro 90 giorni. */
export function problemiMandati(db) {
  return db.proprietari.flatMap((p) => {
    const m = p.mandato || {};
    const out = [];
    if (!m.firmato) out.push({ p, k: "mandateMissing" });
    else {
      if (m.soglia == null) out.push({ p, k: "mandateNoCap" });
      if (m.scadenza && giorniTra(db.oggi, m.scadenza) <= 90) out.push({ p, k: "mandateExpiring", d: m.scadenza });
    }
    return out;
  });
}

/** Stato effettivo di ogni obbligo del gestore: alcuni si leggono dai dati, gli altri dal registro. */
export function statoGestore(db, prev) {
  const voci = adempimentiGestore(db.gestore.profilo);
  const reg = db.complianceGestore;
  const out = {};
  for (const v of voci) {
    const base = reg[v.id] || { stato: "da_fare" };
    out[v.id] = { ...base, prossima: prossimaScadenza(v.scadenza, db.oggi) };
  }
  const meseF24 = Number(out["g-ritenute"]?.prossima?.slice(5, 7));
  if (out["g-ritenute"] && MESE_DELLA_STAGIONE[meseF24] != null) out["g-ritenute"].importo = ritenuteMese(db, MESE_DELLA_STAGIONE[meseF24]);
  if (out["g-bollo"]) {
    const n = fattureTrimestre(db, 2026, 3);
    out["g-bollo"].importo = bolloFatture(n.map((f) => f.importo));
    out["g-bollo"].nota = { k: "bolloNote", v: { n: n.length, q: 3 } };
  }
  if (out["g-inps"]) {
    const r = db.versamenti.find((x) => x.tipo === "inps" && x.stato !== "pagato");
    out["g-inps"] = r ? { ...out["g-inps"], stato: "da_fare", prossima: r.data, importo: r.importo } : { ...out["g-inps"], stato: "ok" };
  }
  const allog = alloggiatiAperti(db);
  out["g-alloggiati"] = {
    stato: allog.some((b) => piuGiorni(b.arrivo, 1) < db.oggi) ? "critico" : allog.length ? "da_fare" : "ok",
    prossima: allog.length ? piuGiorni(allog[0].arrivo, 1) : null,
    nota: allog.length ? { k: "allogOpen", v: { n: allog.length, ref: allog.map((b) => b.id).join(", ") } } : { k: "allogOk" },
  };
  if (out["g-soggiorno"]) {
    const aperti = db.comuni.filter((c) => c.stato !== "ok");
    out["g-soggiorno"] = {
      stato: aperti.length ? "da_fare" : "ok",
      prossima: aperti.map((c) => c.prossima).sort()[0] ?? null,
      nota: { k: "taxComuni", v: { n: db.comuni.length, a: aperti.length } },
    };
  }
  const contanti = incassiDiretti(db).filter((x) => x.controllo === "vietato");
  out["g-contanti"] = { stato: contanti.length ? "critico" : "ok", prossima: null, nota: contanti.length ? { k: "cashBlocked", v: { ref: contanti.map((b) => b.id).join(", ") } } : { k: "cashOk" } };
  if (out["g-forf"] && prev) {
    const s = prev.soglia.stato;
    out["g-forf"] = { stato: s === "ok" ? "ok" : s === "vicina" ? "da_fare" : "critico", prossima: null, nota: { k: "forfNote", v: { p: Math.round(prev.soglia.quota * 100) } } };
  }
  const mand = problemiMandati(db);
  out["g-mandato"] = { stato: mand.length ? "da_fare" : "ok", prossima: mand.find((m) => m.d)?.d ?? null, problemi: mand };
  return out;
}

const fase = (data, oggi) => {
  const g = giorniTra(oggi, data);
  return g < 0 ? "scaduto" : g === 0 ? "oggi" : g <= 7 ? "presto" : "ok";
};

/**
 * Tutte le scadenze aperte: quelle passate e quelle entro `giorni`.
 * @returns {Array<{ id: string, data: string, area: string, titolo: string | { k: string, v?: object }, importo?: number, stato: string, vai?: object }>}
 */
export function scadenziario(db, prev, lang, giorni = 45) {
  const limite = piuGiorni(db.oggi, giorni);
  const nome = (id) => db.immobili.find((i) => i.id === id)?.nome ?? "";
  const out = [];
  const add = (x) => {
    if (x.data && x.data <= limite) out.push({ ...x, stato: x.stato ?? fase(x.data, db.oggi) });
  };

  for (const a of db.adempimenti) {
    if (a.scadenza && a.stato !== "ok") add({ id: a.id, data: a.scadenza, area: "immobile", titolo: `${a.voce} · ${nome(a.immobileId)}`, vai: { vista: "portafoglio", immobileId: a.immobileId, tab: "adempimenti" }, bloccante: a.stato === "critico" });
  }

  const sg = statoGestore(db, prev);
  const salta = new Set(["g-inps", "g-alloggiati", "g-soggiorno", "g-contanti", "g-forf", "g-mandato"]);
  for (const v of adempimentiGestore(db.gestore.profilo)) {
    const s = sg[v.id];
    if (salta.has(v.id) || !s || s.stato === "ok" || !s.prossima) continue;
    const titolo =
      v.id === "g-ritenute" ? { k: "dlRitenute" } : v.id === "g-bollo" ? { k: "dlBollo", v: { q: 3 } } : tx(v.title, lang);
    add({ id: v.id, data: s.prossima, area: v.area, titolo, importo: s.importo, vai: { vista: "compliance" } });
  }

  for (const c of db.comuni) if (c.stato !== "ok") add({ id: `sog-${c.nome}`, data: c.prossima, area: "soggiorno", titolo: { k: "dlSoggiorno", v: { c: c.nome } }, vai: { vista: "compliance" } });

  for (const v of prev.calendario) {
    add({ id: `f24-${v.id}`, data: v.data, area: "fisco", titolo: v.fissato ? v.voce : { k: `vers_${v.tipo}`, v: { r: v.rata ?? "", a: v.anno } }, importo: v.importo, vai: { vista: "fisco" } });
  }

  for (const pr of db.programmi) {
    const s = statoProgramma(pr, db.oggi);
    if (s.stato === "da_programmare" && pr.obbligo) add({ id: pr.id, data: db.oggi, area: "manutenzione", titolo: { k: "dlProgram", v: { v: pr.voce, i: nome(pr.immobileId) } }, stato: "scaduto", vai: { vista: "operativita", sub: "fornitori" } });
    else if (s.prossima) add({ id: pr.id, data: s.prossima, area: "manutenzione", titolo: `${pr.voce} · ${nome(pr.immobileId)}`, importo: pr.costo, vai: { vista: "operativita", sub: "fornitori" } });
  }

  for (const p of db.pagamenti) {
    if (p.stato === "pagato") continue;
    const f = db.fornitori.find((x) => x.id === p.fornitoreId);
    add({ id: p.id, data: p.scadenza, area: "fornitori", titolo: `${f?.nome ?? ""}: ${p.voce}`, importo: p.importo, vai: { vista: "operativita", sub: "fornitori" } });
  }

  for (const b of alloggiatiAperti(db)) add({ id: `all-${b.id}`, data: piuGiorni(b.arrivo, 1), area: "ospiti", titolo: { k: "dlAlloggiati", v: { ref: b.id, i: nome(b.immobileId) } }, vai: { vista: "operativita", sub: "calendario" } });
  for (const b of arriviSenzaOrario(db)) if (!b.promemoria) add({ id: `ora-${b.id}`, data: piuGiorni(b.arrivo, -1), area: "ospiti", titolo: { k: "dlOrario", v: { ref: b.id, i: nome(b.immobileId) } }, vai: { vista: "operativita", sub: "calendario" } });
  for (const b of incassiDiretti(db)) if (b.controllo === "vietato") add({ id: `cash-${b.id}`, data: db.oggi, area: "pagamenti", titolo: { k: "dlContanti", v: { ref: b.id, v: b.lordo.toLocaleString(localeOf(lang)) } }, vai: { vista: "operativita", sub: "partner" }, stato: "critico" });
  for (const m of problemiMandati(db)) if (m.d) add({ id: `man-${m.p.id}`, data: m.d, area: "mandati", titolo: { k: "dlMandato", v: { p: m.p.nome } }, vai: { vista: "portafoglio", proprietarioId: m.p.id } });

  // prima ciò che è già in ritardo o blocca, poi tutto il resto in ordine di data
  const urgente = (x) => (x.stato === "scaduto" || x.stato === "critico" ? 0 : 1);
  return out.sort((a, b) => urgente(a) - urgente(b) || a.data.localeCompare(b.data));
}

/** Riepilogo per i numeri in alto: quante scadenze nei prossimi 30 giorni, quante già passate. */
export function sintesiScadenze(lista, oggi) {
  const entro30 = lista.filter((x) => x.data <= piuGiorni(oggi, 30));
  return { n: entro30.length, scadute: lista.filter((x) => x.stato === "scaduto" || x.stato === "critico").length, importo: sum(entro30.map((x) => x.importo ?? 0)) };
}

