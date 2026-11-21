import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { api, piuGiorni } from "../data/api.js";
import { EASE, contoEconomico, formatters } from "../lib/formati.js";
import { costiGestore, entrateGestore, nettoGestore, previsionaleGestore } from "../lib/gestione.js";
import { makeT } from "../lib/i18n.js";
import { daFare } from "../lib/oggi.js";
import { statoProgramma } from "../lib/operativita.js";
import { turniTutti } from "../lib/pulizie.js";
import { scadenziario, sintesiScadenze, statoGestore } from "../lib/scadenze.js";
import { Case } from "./Case.jsx";
import { Cerca } from "./Cerca.jsx";
import { Compliance } from "./Compliance.jsx";
import { Famiglie } from "./Famiglie.jsx";
import { Manutenzione } from "./Manutenzione.jsx";
import { Oggi } from "./Oggi.jsx";
import { Pulizie } from "./Pulizie.jsx";
import { Soldi } from "./Soldi.jsx";

/* =====================================================================
   VICUS PER TINA — guscio dell'app.
   Sette sezioni, una ricerca che trova tutto, e un'agenda del giorno
   che raccoglie da ogni sezione quello che va fatto. I dati arrivano da
   data/api.js; ogni modifica va subito a schermo e poi al backend.
   ===================================================================== */

const LANG = "it";
const VISTE = [
  ["oggi", "Oggi"],
  ["pulizie", "Pulizie"],
  ["manutenzione", "Manutenzione"],
  ["case", "Case"],
  ["famiglie", "Famiglie"],
  ["soldi", "Soldi"],
  ["compliance", "Compliance"],
];

const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.22, ease: EASE } };

export default function VicusTina() {
  const [db, setDb] = useState(null);
  const [vista, setVista] = useState("oggi");
  const [sub, setSub] = useState({ pulizie: "settimana", manutenzione: "segnalazioni", soldi: "fisco" });
  const [casaSel, setCasaSel] = useState(null);
  const [casaTab, setCasaTab] = useState("scheda");
  const [famiglia, setFamiglia] = useState("p1");
  const [focus, setFocus] = useState({});
  const [cerca, setCerca] = useState(false);

  const t = useMemo(() => makeT(LANG), []);
  const fmt = useMemo(() => formatters(LANG), []);

  useEffect(() => {
    api.getPortafoglio().then(setDb);
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCerca(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const d = useMemo(() => {
    if (!db) return null;
    const turni = turniTutti(db);
    const entrate = entrateGestore(db);
    const prev = previsionaleGestore(db, entrate);
    const costi = costiGestore(db);
    const scad = scadenziario(db, prev, LANG);
    const todo = daFare(db, turni, scad);
    const ce = Object.fromEntries(db.immobili.map((i) => [i.id, contoEconomico(i, db.interventi, db.parametri)]));
    return {
      turni, entrate, prev, costi, scad, todo, ce,
      netto: nettoGestore(entrate, prev, costi),
      sintesi: sintesiScadenze(scad, db.oggi),
      sg: statoGestore(db, prev),
      badge: {
        oggi: todo.filter((x) => x.tono === "bad").length,
        pulizie: turni.filter((x) => (x.stato === "da_assegnare" && x.data >= db.oggi && x.data <= piuGiorni(db.oggi, 7)) || x.stato === "fatto").length,
        manutenzione:
          db.interventi.filter((m) => m.stato === "nuovo" || m.stato === "attesa_ok").length +
          db.programmi.filter((p) => ["scaduto", "da_programmare"].includes(statoProgramma(p, db.oggi).stato) && (p.obbligo || statoProgramma(p, db.oggi).stato === "scaduto")).length,
        compliance: sintesiScadenze(scad, db.oggi).scadute,
      },
    };
  }, [db]);

  /* ---------- aggiornamenti: subito a schermo, poi al backend ---------- */
  const patch = async (collezione, id, p) => {
    setDb((s) =>
      collezione === "destinatari"
        ? { ...s, invio: { ...s.invio, destinatari: s.invio.destinatari.map((x) => (x.id === id ? { ...x, ...p } : x)) } }
        : {
            ...s,
            [collezione]: s[collezione].map((x) => ((x.id ?? x.nome) === id ? { ...x, ...p } : x)),
            decisioni:
              collezione === "interventi" && p.stato === "programmato"
                ? s.decisioni.map((x) => (x.interventoId === id && x.decisione === "in_attesa" ? { ...x, decisione: "accettata", data: s.oggi } : x))
                : s.decisioni,
          },
    );
    await api.aggiorna(collezione, id, p);
  };
  const patchVoce = async (mappa, id, p) => {
    setDb((s) => ({ ...s, [mappa]: { ...s[mappa], [id]: { ...(s[mappa][id] || {}), ...p } } }));
    await api.aggiornaVoce(mappa, id, p);
  };
  const setTurno = (turno, p) => (turno.tipo === "partenza" ? patchVoce("turni", turno.id, p) : patch("turniExtra", turno.id, p));
  const creaIntervento = async (dati) => {
    const m = await api.creaIntervento(dati);
    setDb((s) => ({ ...s, interventi: [...s.interventi, m] }));
    return m;
  };
  const chiudiIntervento = async (id) => {
    const r = await api.chiudiIntervento(id);
    if (r) setDb((s) => ({ ...s, interventi: s.interventi.map((x) => (x.id === id ? r.intervento : x)), pagamenti: r.pagamento ? [...s.pagamenti, r.pagamento] : s.pagamenti }));
  };
  const registraProgramma = async (id) => {
    const r = await api.registraProgramma(id);
    if (r) setDb((s) => ({ ...s, programmi: s.programmi.map((x) => (x.id === id ? r.programma : x)), pagamenti: r.pagamento ? [...s.pagamenti, r.pagamento] : s.pagamenti }));
  };
  const setBiancheria = async (immobileId, tipo, p) => {
    setDb((s) => ({ ...s, immobili: s.immobili.map((i) => (i.id === immobileId ? { ...i, biancheria: i.biancheria.map((b) => (b.tipo === tipo ? { ...b, ...p } : b)) } : i)) }));
    await api.aggiornaBiancheria(immobileId, tipo, p);
  };
  const setPasso = async (immobileId, stepId, fatto) => {
    setDb((s) => ({ ...s, avvio: { ...s.avvio, [immobileId]: { ...(s.avvio[immobileId] || {}), [stepId]: fatto } } }));
    await api.aggiornaPasso(immobileId, stepId, fatto);
  };
  const setFiscale = async (p) => {
    setDb((s) => ({ ...s, gestore: { ...s.gestore, fiscale: { ...s.gestore.fiscale, ...p } } }));
    await api.aggiornaFiscale(p);
  };
  const creaImmobile = async (payload) => {
    const next = await api.creaImmobile(payload);
    setDb(next);
    setCasaSel(next.immobili[next.immobili.length - 1].id);
    setCasaTab("regola");
  };

  /** Porta alla schermata giusta. Accetta anche gli indirizzi delle schermate riusate dalla demo. */
  const vai = (v) => {
    let { vista: w } = v;
    const s = { ...sub };
    if (w === "operativita") {
      if (v.sub === "fornitori") [w, s.manutenzione] = ["manutenzione", "programmata"];
      else if (v.sub === "partner") [w, s.soldi] = ["soldi", "incassi"];
      else w = "oggi";
    }
    if (w === "portafoglio") w = v.proprietarioId ? "famiglie" : "case";
    if (w === "fisco") [w, s.soldi] = ["soldi", "fisco"];
    if (v.sub && w !== "operativita") s[w] = v.sub;
    if (v.immobileId) {
      setCasaSel(v.immobileId);
      setCasaTab({ adempimenti: "regola", setup: "regola" }[v.tab] ?? v.tab ?? "scheda");
    } else if (w === "case" && !v.immobileId) setCasaSel(null);
    if (v.proprietarioId) setFamiglia(v.proprietarioId);
    if (v.turno) s.pulizie = "settimana";
    if (v.intervento) s.manutenzione = "segnalazioni";
    setFocus({ turno: v.turno ?? null, intervento: v.intervento ?? null });
    setSub(s);
    setVista(w);
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      /* ambiente senza finestra */
    }
  };

  if (!db || !d) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg text-muted">
        <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
          Carico le tue case…
        </motion.span>
      </div>
    );
  }

  const comuni = new Set(db.immobili.map((i) => i.comune)).size;
  const props = { db, t, fmt, lang: LANG, vai, d };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-bg font-sans text-[15px] leading-normal text-ink">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-4 pt-5 pb-12">
          {/* ---------- intestazione ---------- */}
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <motion.span
                aria-hidden="true"
                className="grid size-[38px] place-items-center rounded-[10px] bg-accent text-[19px] font-bold text-on-accent"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
              >
                V
              </motion.span>
              <div>
                <div className="text-[21px] font-bold tracking-[-.02em]">
                  Vicus <span className="font-medium text-muted">· per {db.gestore.nome}</span>
                </div>
                <div className="text-[13px] text-muted">
                  {db.immobili.length} case · {db.proprietari.length} famiglie · {comuni} Comuni d'Ischia · {fmt.fullDay(db.oggi)}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCerca(true)}
                className="flex min-w-[220px] cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-left text-[13.5px] text-muted transition-colors hover:border-muted/50 max-[520px]:min-w-0 max-[520px]:flex-1"
                aria-label="Cerca in tutta la piattaforma"
              >
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <span className="flex-1">Cerca case, Wi-Fi, fornitori, prenotazioni…</span>
                <kbd className="rounded border border-line px-1.5 text-[11px] font-semibold max-[520px]:hidden">⌘K</kbd>
              </button>
              <span className="rounded-full bg-warn-soft px-2.5 py-1 text-[12px] font-semibold text-warn">Dati di esempio</span>
            </div>
          </header>

          {/* ---------- navigazione ---------- */}
          <nav aria-label="Sezioni" className="sticky top-0 z-20 -mx-1 overflow-x-auto bg-bg/90 px-1 py-1 backdrop-blur">
            <div className="flex min-w-max gap-1 rounded-xl border border-line bg-surface p-1">
              {VISTE.map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  aria-current={vista === k ? "page" : undefined}
                  onClick={() => vai({ vista: k })}
                  className={`relative inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[14px] font-semibold whitespace-nowrap transition-colors ${vista === k ? "text-on-accent" : "text-muted hover:text-ink"}`}
                >
                  {vista === k && <motion.span layoutId="vista-attiva" className="absolute inset-0 rounded-lg bg-accent" transition={{ type: "spring", stiffness: 480, damping: 40 }} />}
                  <span className="relative">{l}</span>
                  {d.badge[k] > 0 && (
                    <span className={`relative rounded-full px-1.5 text-[11px] tabular-nums ${vista === k ? "bg-on-accent/20" : "bg-bad-soft text-bad"}`} aria-label={`${d.badge[k]} da guardare`}>
                      {d.badge[k]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </nav>

          <AnimatePresence mode="wait" initial={false}>
            <motion.main key={vista} {...fade} className="min-w-0">
              {vista === "oggi" && <Oggi {...props} onPatch={patch} />}
              {vista === "pulizie" && (
                <Pulizie {...props} sub={sub.pulizie} setSub={(x) => setSub({ ...sub, pulizie: x })} focus={focus.turno} onTurno={setTurno} onPatch={patch} onBiancheria={setBiancheria} onSegnala={creaIntervento} />
              )}
              {vista === "manutenzione" && (
                <Manutenzione
                  {...props}
                  sub={sub.manutenzione}
                  setSub={(x) => setSub({ ...sub, manutenzione: x })}
                  focus={focus.intervento}
                  onPatch={patch}
                  onChiudi={chiudiIntervento}
                  onRegistra={registraProgramma}
                  onSegnala={creaIntervento}
                />
              )}
              {vista === "case" && (
                <Case
                  {...props}
                  sel={casaSel}
                  setSel={setCasaSel}
                  tab={casaTab}
                  setTab={setCasaTab}
                  onPasso={setPasso}
                  onPatch={patch}
                  onTurno={setTurno}
                  onChiudi={chiudiIntervento}
                  onRegistra={registraProgramma}
                  onCrea={creaImmobile}
                />
              )}
              {vista === "famiglie" && <Famiglie {...props} sel={famiglia} setSel={setFamiglia} onPatch={patch} />}
              {vista === "soldi" && <Soldi {...props} sub={sub.soldi} setSub={(x) => setSub({ ...sub, soldi: x })} onFiscale={setFiscale} onPatch={patch} />}
              {vista === "compliance" && (
                <section className="rounded-[14px] border border-line bg-surface p-5 max-[480px]:p-4">
                  <Compliance db={db} scad={d.scad} sg={d.sg} onVai={vai} onPatch={patch} onPatchVoce={patchVoce} t={t} fmt={fmt} lang={LANG} />
                </section>
              )}
            </motion.main>
          </AnimatePresence>

          <footer className="flex max-w-[75ch] flex-col gap-1 border-t border-line pt-3.5 text-[12.5px] text-muted">
            <p className="m-0">
              Appartamento del Pozzo e Appartamento Dracena usano i dati pubblici dell'annuncio. Famiglie, altre case, squadra, fornitori, importi, codici Wi-Fi e dettagli interni sono di esempio.
            </p>
            <p className="m-0">Gli ospiti compaiono solo con il codice di prenotazione e il numero di persone. Nomi e documenti restano nel PMS e in Alloggiati Web, su server in Europa.</p>
          </footer>
        </div>
        <AnimatePresence>{cerca && <Cerca db={db} fmt={fmt} onClose={() => setCerca(false)} onVai={(v) => (setCerca(false), vai(v))} />}</AnimatePresence>
      </div>
    </MotionConfig>
  );
}

