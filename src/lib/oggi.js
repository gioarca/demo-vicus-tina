import { piuGiorni, sum } from "../data/api.js";
import { alloggiatiAperti, arriviSenzaOrario, giorniTra, statoProgramma } from "./operativita.js";
import { addetta, casa, finestraLibera, fotoComplete, prossimoArrivo, statoBiancheria, statoScorte } from "./pulizie.js";

/* =====================================================================
   VICUS — la giornata di Tina. Mette in fila, da tutte le sezioni,
   quello che succede oggi e quello che va fatto, con il collegamento
   alla schermata dove si risolve. È la lista che sostituisce WhatsApp,
   i fogli Excel e le schede aperte nel browser.
   ===================================================================== */

const PESO = { bad: 0, warn: 1, accent: 2, ok: 3 };

/** Gli eventi di oggi, in ordine di ora. */
export function agenda(db, turni) {
  const oggi = db.oggi;
  const ev = [];
  for (const b of db.prenotazioni) {
    if (b.partenza === oggi) ev.push({ ora: "10:00", tipo: "partenza", titolo: `Partenza ${b.id}`, casa: b.immobileId, dettaglio: `${b.ospiti} ospiti` });
    if (b.arrivo === oggi)
      ev.push({ ora: b.orario || "—", tipo: "arrivo", titolo: `Arrivo ${b.id}`, casa: b.immobileId, dettaglio: b.orario ? `${b.ospiti} ospiti` : `${b.ospiti} ospiti, orario non comunicato`, allarme: !b.orario });
  }
  for (const t of turni.filter((x) => x.data === oggi)) {
    const a = t.addettoId ? addetta(db, t.addettoId) : null;
    ev.push({ ora: t.dalle, tipo: "pulizia", titolo: `Pulizia${t.tipo === "meta" ? " di metà soggiorno" : ""}`, casa: t.immobileId, dettaglio: a ? `${a.nome} · ${t.stato.replace("_", " ")}` : "da assegnare", allarme: !a, turno: t.id });
  }
  for (const m of db.interventi.filter((x) => x.quando === oggi && x.stato !== "chiuso"))
    ev.push({ ora: m.ora || "—", tipo: "lavoro", titolo: m.voce, casa: m.immobileId, dettaglio: m.fornitore, intervento: m.id });
  if (db.lavanderia.prossimoRitiro === oggi) ev.push({ ora: "17:00", tipo: "lavanderia", titolo: "Ritiro della lavanderia", casa: null, dettaglio: "sacchi pronti all'ingresso della villa" });
  ev.push({ ora: db.invio.ora, tipo: "invio", titolo: "Riepilogo di domani alla squadra", casa: null, dettaglio: `automatico su ${db.invio.canale}` });
  return ev.sort((a, b) => (a.ora === "—" ? "99" : a.ora).localeCompare(b.ora === "—" ? "99" : b.ora));
}

/**
 * Tutto ciò che va fatto, da ogni sezione, con tono e collegamento.
 * @returns {Array<{ id: string, tono: "bad"|"warn"|"accent", area: string, titolo: string, dettaglio?: string, vai: object, azione?: object }>}
 */
export function daFare(db, turni, scad) {
  const oggi = db.oggi;
  const nome = (id) => casa(db, id)?.nome ?? "";
  const out = [];

  for (const b of alloggiatiAperti(db).filter((x) => x.arrivo < oggi))
    out.push({ id: `all-${b.id}`, tono: "bad", area: "Ospiti", titolo: `Schedina Alloggiati di ${b.id}`, dettaglio: `${nome(b.immobileId)} · arrivati il ${b.arrivo.slice(8)}/${b.arrivo.slice(5, 7)}, va inviata entro 24 ore`, vai: { vista: "oggi" }, azione: { tipo: "alloggiati", id: b.id, label: "Segna inviata" } });
  for (const b of arriviSenzaOrario(db).filter((x) => !x.promemoria))
    out.push({ id: `ora-${b.id}`, tono: b.arrivo === oggi ? "bad" : "warn", area: "Ospiti", titolo: `Orario di arrivo di ${b.id}`, dettaglio: `${nome(b.immobileId)} · arriva ${b.arrivo === oggi ? "oggi" : "il " + b.arrivo.slice(8)}, ${b.ospiti} ospiti`, vai: { vista: "oggi" }, azione: { tipo: "orario", id: b.id, label: "Chiedi l'orario" } });

  for (const t of turni.filter((x) => x.data >= oggi && giorniTra(oggi, x.data) <= 7)) {
    if (t.stato === "da_assegnare")
      out.push({ id: `ta-${t.id}`, tono: giorniTra(oggi, t.data) <= 3 ? "bad" : "warn", area: "Pulizie", titolo: `Pulizia da assegnare · ${nome(t.immobileId)}`, dettaglio: `${t.data.slice(8)}/${t.data.slice(5, 7)}${t.prossimo ? ` · poi arrivano ${t.prossimo.ospiti} ospiti il ${t.prossimo.arrivo.slice(8)}` : ""}`, vai: { vista: "pulizie", turno: t.id } });
    else if (t.stato === "assegnato" && giorniTra(oggi, t.data) <= 2)
      out.push({ id: `tc-${t.id}`, tono: "warn", area: "Pulizie", titolo: `${addetta(db, t.addettoId)?.nome} non ha ancora confermato · ${nome(t.immobileId)}`, dettaglio: `turno del ${t.data.slice(8)}/${t.data.slice(5, 7)} alle ${t.dalle}`, vai: { vista: "pulizie", turno: t.id } });
  }
  for (const t of turni.filter((x) => x.stato === "fatto")) {
    const arrivaOggi = t.prossimo && t.prossimo.arrivo <= oggi;
    out.push({
      id: `tv-${t.id}`, tono: arrivaOggi ? "bad" : "warn", area: "Pulizie",
      titolo: `Pulizia da verificare · ${nome(t.immobileId)}`,
      dettaglio: `${addetta(db, t.addettoId)?.nome} · foto ${t.foto} su ${t.checklist.length}${fotoComplete(t) ? "" : ", incomplete"}${arrivaOggi ? " · gli ospiti arrivano oggi" : ""}`,
      vai: { vista: "pulizie", turno: t.id },
    });
  }

  for (const m of db.interventi.filter((x) => x.stato !== "chiuso")) {
    const arr = prossimoArrivo(db, m.immobileId);
    const giorni = arr ? giorniTra(oggi, arr.arrivo) : null;
    if (m.stato === "nuovo")
      out.push({ id: `mn-${m.id}`, tono: m.priorita === "urgente" || (m.priorita === "prima_arrivo" && giorni != null && giorni <= 3) ? "bad" : "warn", area: "Manutenzione", titolo: `${m.voce} · ${nome(m.immobileId)}`, dettaglio: `segnalato da ${m.da}${m.garanzia ? " · in garanzia: chiama l'assistenza" : ""}${m.priorita === "prima_arrivo" && arr ? ` · da fare prima del ${arr.arrivo.slice(8)}/${arr.arrivo.slice(5, 7)}` : ""}`, vai: { vista: "manutenzione", intervento: m.id } });
    if (m.stato === "attesa_ok")
      out.push({ id: `mo-${m.id}`, tono: giorniTra(m.data, oggi) > 7 ? "bad" : "warn", area: "Famiglie", titolo: `Ok della ${db.proprietari.find((p) => p.id === casa(db, m.immobileId).proprietarioId)?.nome} · ${m.voce}`, dettaglio: `${m.costo.toLocaleString("it-IT")} € · in attesa da ${giorniTra(m.data, oggi)} giorni`, vai: { vista: "manutenzione", intervento: m.id } });
  }
  for (const pr of db.programmi) {
    const s = statoProgramma(pr, oggi);
    if (s.stato === "scaduto" || (s.stato === "da_programmare" && pr.obbligo))
      out.push({ id: `pr-${pr.id}`, tono: pr.obbligo ? "bad" : "warn", area: "Manutenzione", titolo: `${pr.voce} · ${nome(pr.immobileId)}`, dettaglio: s.prossima ? `scaduto il ${s.prossima.slice(8)}/${s.prossima.slice(5, 7)}${pr.obbligo ? " · obbligo di legge" : ""}` : "mai programmato · obbligo di legge", vai: { vista: "manutenzione", sub: "programmata" } });
  }

  for (const imm of db.immobili) {
    const scarse = statoBiancheria(db, imm, turni).filter((b) => b.stato === "manca");
    if (scarse.length)
      out.push({ id: `bi-${imm.id}`, tono: "warn", area: "Biancheria", titolo: `Biancheria che non basta · ${imm.nome}`, dettaglio: scarse.map((b) => `${b.tipo}: ${b.puliti} puliti, ne servono ${b.servono}`).join(" · "), vai: { vista: "pulizie", sub: "biancheria" } });
  }
  const cambi14 = turni.filter((t) => t.data >= oggi && t.data <= piuGiorni(oggi, 14) && t.tipo !== "sopralluogo").length;
  const scorte = statoScorte(db, cambi14).filter((s) => s.sotto);
  if (scorte.length)
    out.push({ id: "scorte", tono: "accent", area: "Scorte", titolo: `${scorte.length} prodotti da ricomprare`, dettaglio: `${scorte.map((s) => s.voce.toLowerCase()).slice(0, 3).join(", ")}${scorte.length > 3 ? "…" : ""} · circa ${Math.round(sum(scorte.map((s) => s.costo)))} €`, vai: { vista: "pulizie", sub: "biancheria" } });

  for (const p of db.pagamenti.filter((x) => x.stato !== "pagato" && giorniTra(oggi, x.scadenza) <= 7)) {
    const f = db.fornitori.find((x) => x.id === p.fornitoreId);
    out.push({ id: `pg-${p.id}`, tono: p.scadenza < oggi ? "bad" : "accent", area: "Pagamenti", titolo: `${f?.nome}: ${p.importo.toLocaleString("it-IT")} €`, dettaglio: `${p.voce} · ${p.scadenza < oggi ? "scaduto" : "entro il " + p.scadenza.slice(8) + "/" + p.scadenza.slice(5, 7)}`, vai: { vista: "manutenzione", sub: "programmata" } });
  }
  for (const x of scad.filter((s) => (s.area === "fisco" || s.area === "soggiorno") && giorniTra(oggi, s.data) <= 10))
    out.push({ id: `sc-${x.id}`, tono: x.stato === "scaduto" ? "bad" : "accent", area: "Fisco", titolo: typeof x.titolo === "string" ? x.titolo : null, chiave: typeof x.titolo === "string" ? null : x.titolo, dettaglio: `entro il ${x.data.slice(8)}/${x.data.slice(5, 7)}${x.importo != null ? ` · ${x.importo.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €` : ""}`, vai: { vista: "soldi" } });

  return out.sort((a, b) => PESO[a.tono] - PESO[b.tono]);
}

/** Arrivi e partenze dei prossimi giorni, raggruppati per giorno. */
export function prossimiGiorni(db, n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const d = piuGiorni(db.oggi, i);
    return {
      d,
      arrivi: db.prenotazioni.filter((b) => b.arrivo === d),
      partenze: db.prenotazioni.filter((b) => b.partenza === d),
    };
  });
}

/** Per ogni casa: ospiti in casa ora, prossimo arrivo, finestra per i lavori. */
export function statoCase(db) {
  return db.immobili.map((imm) => {
    const dentro = db.prenotazioni.find((b) => b.immobileId === imm.id && b.arrivo <= db.oggi && db.oggi < b.partenza);
    return { imm, dentro, prossimo: prossimoArrivo(db, imm.id, piuGiorni(db.oggi, dentro ? 1 : 0)), finestra: finestraLibera(db, imm.id) };
  });
}
