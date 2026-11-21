import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { profiloCompleto } from "../data/api.js";
import { EASE, MONTHS } from "../lib/formati.js";
import { statoProgramma } from "../lib/operativita.js";
import { STATO_TURNO, addetta, finestraLibera, prossimoArrivo, statoBiancheria } from "../lib/pulizie.js";
import { valueFor } from "../lib/value.js";
import { Adempimenti } from "./Adempimenti.jsx";
import { Conto } from "./Conto.jsx";
import { Dotazioni, Segnalazioni } from "./Manutenzione.jsx";
import { SetupPlan } from "./Playbook.jsx";
import { Button, Chip, Label, Note } from "./ui.jsx";
import { Wizard } from "./Wizard.jsx";

/* =====================================================================
   VICUS — Case. Una scheda per casa con tutto: annuncio, chiavi,
   Wi-Fi, impianti, documenti e collegamenti utili, poi pulizia,
   manutenzione, conto economico e pratiche. Nessun dettaglio sta più
   in un foglio a parte o in una chat.
   ===================================================================== */

const TABS = [
  ["scheda", "Scheda"],
  ["pulizia", "Pulizia"],
  ["manutenzione", "Manutenzione"],
  ["conto", "Conto"],
  ["regola", "In regola"],
];
const DOC = { ok: ["ok", "a posto"], manca: ["bad", "manca"], in_scadenza: ["warn", "in scadenza"] };
const LINK = [
  ["Alloggiati Web", "https://alloggiatiweb.poliziadistato.it/", "schedine degli ospiti"],
  ["Banca dati CIN", "https://bdsr.ministeroturismo.gov.it/", "codice identificativo nazionale"],
];

export function Case(p) {
  const { db, sel, setSel, t, fmt, lang } = p;
  const [wizard, setWizard] = useState(false);
  const imm = sel ? db.immobili.find((i) => i.id === sel) : null;

  if (wizard)
    return (
      <section className="rounded-[14px] border border-line bg-surface p-5 max-[480px]:p-4">
        <Wizard
          owners={db.proprietari}
          ownerUnits={Object.fromEntries(db.proprietari.map((x) => [x.id, db.immobili.filter((i) => i.proprietarioId === x.id).length]))}
          onCreate={async (x) => {
            await p.onCrea(x);
            setWizard(false);
          }}
          onCancel={() => setWizard(false)}
          t={t}
          lang={lang}
          fmt={fmt}
        />
      </section>
    );

  if (!imm)
    return (
      <section className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-5 max-[480px]:p-4" aria-label="Case">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Le tue case</Label>
          <Button size="sm" onClick={() => setWizard(true)}>
            + Nuova casa
          </Button>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
          {db.immobili.map((i, n) => {
            const fam = db.proprietari.find((x) => x.id === i.proprietarioId);
            const arr = prossimoArrivo(db, i.id);
            const aperti = db.interventi.filter((m) => m.immobileId === i.id && m.stato !== "chiuso").length;
            const mancano = i.documenti.filter((x) => x.stato !== "ok").length;
            return (
              <motion.button
                key={i.id}
                type="button"
                onClick={() => setSel(i.id)}
                className="flex cursor-pointer flex-col gap-1.5 rounded-xl border border-line bg-bg px-4 py-3.5 text-left transition-colors hover:border-accent/50"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE, delay: 0.04 * n }}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="flex flex-col">
                    <span className="text-[16px] font-bold">{i.nome}</span>
                    <span className="text-[12.5px] text-muted">
                      {i.comune} · {fam?.nome}
                    </span>
                  </span>
                  {i.partnerVicus && <Chip tone="accent">partner Vicus</Chip>}
                </span>
                <span className="text-[13px] text-muted">
                  {i.scheda.mq} m² · fino a {i.scheda.ospiti} ospiti · {i.scheda.bagni}
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {i.chiusa ? <Chip tone="neutro">chiusa per l'inverno</Chip> : arr ? <Chip tone="neutro">arrivo {fmt.day(arr.arrivo)}</Chip> : <Chip tone="neutro">nessun arrivo</Chip>}
                  {aperti > 0 && <Chip tone="warn">{aperti} lavori aperti</Chip>}
                  {mancano > 0 && <Chip tone="bad">{mancano} documenti da sistemare</Chip>}
                  {i.recensioni && <Chip tone={i.recensioni.pulizia < 8.5 ? "bad" : "ok"}>pulizia {fmt.x(i.recensioni.pulizia)}</Chip>}
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>
    );

  return <SchedaCasa {...p} imm={imm} />;
}

function SchedaCasa(p) {
  const { db, imm, setSel, tab, setTab, fmt, vai } = p;
  const fam = db.proprietari.find((x) => x.id === imm.proprietarioId);
  return (
    <section className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5 max-[480px]:p-4" aria-label={imm.nome}>
      <button type="button" onClick={() => setSel(null)} className="cursor-pointer self-start text-[13px] font-semibold text-muted hover:text-ink">
        ← Tutte le case
      </button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="m-0 text-[28px] font-bold tracking-[-.02em] text-balance">{imm.nome}</h1>
          <div className="text-[13.5px] text-muted">
            {imm.tipo} · {imm.comune} ·{" "}
            <button type="button" className="cursor-pointer underline decoration-line underline-offset-4 hover:decoration-accent" onClick={() => vai({ vista: "famiglie", proprietarioId: fam.id })}>
              {fam.nome}
            </button>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Label>CIN</Label>
          <span className={`text-[13px] font-semibold tabular-nums ${imm.cin ? "" : "text-bad"}`}>{imm.cin || "da richiedere"}</span>
          {imm.partnerVicus && <Chip tone="accent">partner Vicus</Chip>}
        </div>
      </div>
      <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1" role="tablist">
        {TABS.map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`relative cursor-pointer whitespace-nowrap px-3 py-2 text-[14px] font-semibold transition-colors ${tab === k ? "text-ink" : "text-muted hover:text-ink"}`}
          >
            {l}
            {tab === k && <motion.span layoutId="scheda-casa" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} role="tabpanel" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: EASE }}>
          {tab === "scheda" && <Scheda {...p} />}
          {tab === "pulizia" && <PuliziaCasa {...p} />}
          {tab === "manutenzione" && <ManutenzioneCasa {...p} />}
          {tab === "conto" && (
            <Conto
              imm={imm}
              ce={p.d.ce[imm.id]}
              par={db.parametri}
              t={p.t}
              fmt={fmt}
              months={MONTHS[p.lang]}
              valore={valueFor({ imm, profile: profiloCompleto(db, imm), done: db.avvio[imm.id] || {}, par: db.parametri, manutenzione: p.d.ce[imm.id].manutenzione })}
            />
          )}
          {tab === "regola" && (
            <div className="flex flex-col gap-6">
              <SetupPlan profile={profiloCompleto(db, imm)} done={db.avvio[imm.id] || {}} onToggle={(stepId, v) => p.onPasso(imm.id, stepId, v)} t={p.t} lang={p.lang} fmt={fmt} />
              <div className="flex flex-col gap-2">
                <Label>Adempimenti ricorrenti</Label>
                <Adempimenti items={db.adempimenti.filter((a) => a.immobileId === imm.id)} onSet={(id, stato) => p.onPatch("adempimenti", id, { stato })} t={p.t} fmt={fmt} />
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function Riga({ l, children }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 border-b border-line py-1.5 text-[13.5px] last:border-b-0 max-[420px]:grid-cols-1">
      <dt className="text-muted">{l}</dt>
      <dd className="m-0">{children}</dd>
    </div>
  );
}

function Scheda({ db, imm, fmt, d, vai }) {
  const [mostra, setMostra] = useState(false);
  const s = imm.scheda;
  const dentro = db.prenotazioni.find((b) => b.immobileId === imm.id && b.arrivo <= db.oggi && db.oggi < b.partenza);
  const arr = prossimoArrivo(db, imm.id, dentro ? dentro.partenza : db.oggi);
  const fin = finestraLibera(db, imm.id);
  const ultima = d.turni.filter((x) => x.immobileId === imm.id && x.stato === "verificato").at(-1);
  const aperti = db.interventi.filter((m) => m.immobileId === imm.id && m.stato !== "chiuso");
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line min-[820px]:grid-cols-4">
        {[
          ["In casa ora", dentro ? `${dentro.ospiti} ospiti fino al ${fmt.day(dentro.partenza)}` : imm.chiusa ? "chiusa" : "nessuno"],
          ["Prossimo arrivo", arr ? `${fmt.day(arr.arrivo)} · ${arr.ospiti} ospiti${arr.canale === "Vicus" ? " · Vicus" : ""}` : "nessuno"],
          ["Libera per i lavori", fin ? (fin.giorni > 1 ? `${fmt.day(fin.dal)}–${fmt.day(fin.al)}` : fmt.day(fin.dal)) : "—"],
          ["Lavori aperti", aperti.length ? `${aperti.length}: ${aperti[0].voce.split(":")[0].toLowerCase()}${aperti.length > 1 ? "…" : ""}` : "nessuno"],
        ].map(([l, v]) => (
          <div key={l} className="flex min-w-0 flex-col gap-0.5 bg-bg px-3.5 py-3">
            <Label>{l}</Label>
            <span className="text-[14px] font-semibold">{v}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 min-[900px]:grid-cols-2">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label>L'annuncio</Label>
            {s.fonte && (
              <a href={s.fonte} target="_blank" rel="noreferrer" className="text-[12.5px] font-semibold text-accent hover:underline">
                Apri l'annuncio ↗
              </a>
            )}
          </div>
          <dl className="m-0">
            <Riga l="Indirizzo">{s.indirizzo}</Riga>
            {s.piano && <Riga l="Piano">{s.piano}</Riga>}
            <Riga l="Spazi">
              {s.mq} m² · fino a {s.ospiti} ospiti
            </Riga>
            <Riga l="Camere">{s.camere}</Riga>
            <Riga l="Letti">{s.letti}</Riga>
            <Riga l="Bagni">{s.bagni}</Riga>
            <Riga l="Cucina">{s.cucina}</Riga>
            <Riga l="Comfort">{s.comfort}</Riga>
            <Riga l="Esterni">{s.esterni}</Riga>
            <Riga l="Tariffa">{s.tariffa}</Riga>
            <Riga l="Orari">{s.orari}</Riga>
          </dl>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>Per entrare e lavorare</Label>
            <dl className="m-0">
              <Riga l="Chiavi">{s.chiavi}</Riga>
              <Riga l="Wi-Fi">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{s.wifi.rete}</span>
                  <span className="tabular-nums">{mostra ? s.wifi.password : "••••••••"}</span>
                  <button type="button" onClick={() => setMostra(!mostra)} className="cursor-pointer text-[12.5px] font-semibold text-accent hover:underline" aria-pressed={mostra}>
                    {mostra ? "nascondi" : "mostra"}
                  </button>
                </span>
              </Riga>
              <Riga l="Velocità">
                <span className="flex flex-wrap gap-1.5">
                  <Chip tone={s.mbps.soggiorno >= 20 ? "ok" : "bad"}>soggiorno {s.mbps.soggiorno} Mbps</Chip>
                  <Chip tone={s.mbps.camera >= 20 ? "ok" : "bad"}>camera {s.mbps.camera} Mbps</Chip>
                </span>
              </Riga>
              <Riga l="Impianti">{s.impianti}</Riga>
              <Riga l="Per l'addetta">{s.noteAddetta}</Riga>
            </dl>
            <Note>Qui Wi-Fi, chiavi e impianti sono di esempio. Li scrivi una volta e restano qui, trovabili con la ricerca.</Note>
          </div>

          <div className="flex flex-col gap-1">
            <Label>Documenti</Label>
            <ul className="m-0 flex list-none flex-col p-0">
              {imm.documenti.map((x) => (
                <li key={x.voce} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-1.5 text-[13.5px] last:border-b-0">
                  <span className="flex min-w-0 flex-col">
                    <span>{x.voce}</span>
                    {(x.nota || x.scadenza) && (
                      <span className="text-[12px] text-muted">
                        {x.nota}
                        {x.nota && x.scadenza ? " · " : ""}
                        {x.scadenza ? `scadenza ${fmt.longDay(x.scadenza)}` : ""}
                      </span>
                    )}
                  </span>
                  <Chip tone={DOC[x.stato][0]}>{DOC[x.stato][1]}</Chip>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Collegamenti</Label>
            <div className="flex flex-wrap gap-2">
              {s.prenota && <LinkEsterno href={s.prenota} titolo="Prenotazioni su Beddy" sotto="calendario e tariffe" />}
              {LINK.map(([t, h, sotto]) => (
                <LinkEsterno key={t} href={h} titolo={t} sotto={sotto} />
              ))}
              {ultima && (
                <button type="button" onClick={() => vai({ vista: "pulizie", turno: ultima.id })} className="flex cursor-pointer flex-col rounded-lg border border-line px-3 py-2 text-left hover:border-accent/50">
                  <span className="text-[13px] font-semibold">Ultima pulizia</span>
                  <span className="text-[12px] text-muted">
                    {fmt.day(ultima.data)} · {addetta(db, ultima.addettoId)?.nome}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkEsterno({ href, titolo, sotto }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex flex-col rounded-lg border border-line px-3 py-2 hover:border-accent/50">
      <span className="text-[13px] font-semibold">{titolo} ↗</span>
      <span className="text-[12px] text-muted">{sotto}</span>
    </a>
  );
}

function PuliziaCasa({ db, imm, d, fmt, vai }) {
  const turni = d.turni.filter((x) => x.immobileId === imm.id);
  const rif = addetta(db, imm.pulizia.addettaRif);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 min-[900px]:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label>Checklist della casa, una foto per voce</Label>
          <ol className="m-0 grid grid-cols-[minmax(0,1fr)] gap-x-5 gap-y-1 pl-5 text-[13.5px] min-[600px]:grid-cols-2">
            {imm.pulizia.checklist.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Turni</Label>
          <ul className="m-0 flex list-none flex-col p-0">
            {turni.length === 0 && <li className="text-[13.5px] text-muted">Nessun turno nelle prossime due settimane.</li>}
            {turni.map((x) => {
              const [tono, l] = STATO_TURNO[x.stato];
              return (
                <li key={x.id}>
                  <button type="button" onClick={() => vai({ vista: "pulizie", turno: x.id })} className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 border-b border-line py-1.5 text-left text-[13.5px]">
                    <span>
                      {fmt.fullDay(x.data)} · {x.dalle} · {x.addettoId ? addetta(db, x.addettoId)?.nome : "da assegnare"}
                    </span>
                    <Chip tone={tono}>{l}</Chip>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1 rounded-xl border border-line px-4 py-3 text-[13.5px]">
          <Label>Come si pulisce</Label>
          <span>
            Di solito: <strong>{rif?.nome}</strong> · {imm.pulizia.durata}
          </span>
          <span>
            Compenso {fmt.eur(imm.pulizia.compenso)} · addebito alla famiglia {fmt.eur(imm.pulizia.addebito)} con biancheria e kit
          </span>
          <span className="text-muted">{imm.scheda.noteAddetta}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-line px-4 py-3 text-[13.5px]">
          <Label>Biancheria</Label>
          {statoBiancheria(db, imm, d.turni).map((b) => (
            <span key={b.tipo} className="flex justify-between gap-2">
              <span>
                {b.tipo}: {b.servono} a cambio
              </span>
              <span className={b.stato === "manca" ? "font-semibold text-bad" : "text-muted"}>
                {b.puliti} puliti · {b.lavanderia} in lavanderia
              </span>
            </span>
          ))}
        </div>
        {imm.recensioni && (
          <div className="flex flex-col gap-1 rounded-xl border border-line px-4 py-3 text-[13.5px]">
            <Label>Cosa dicono gli ospiti</Label>
            <span>
              Pulizia <strong className={imm.recensioni.pulizia < 8.5 ? "text-bad" : "text-ok"}>{fmt.x(imm.recensioni.pulizia)}</strong> · voto generale {fmt.x(imm.recensioni.voto)} su {imm.recensioni.n} recensioni
            </span>
            {imm.recensioni.critichePulizia > 0 && <span className="text-warn">{imm.recensioni.critichePulizia} recensioni criticano la pulizia</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function ManutenzioneCasa(p) {
  const { db, imm, fmt, onRegistra } = p;
  const programmi = db.programmi.filter((x) => x.immobileId === imm.id).map((x) => ({ ...x, ...statoProgramma(x, db.oggi) }));
  const TONO = { scaduto: ["bad", "scaduto"], da_programmare: ["bad", "da programmare"], in_arrivo: ["warn", "in arrivo"], ok: ["ok", "in regola"] };
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label>Segnalazioni</Label>
        <Segnalazioni {...p} soloCasa={imm.id} focus={null} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Controlli programmati</Label>
        <ul className="m-0 flex list-none flex-col p-0">
          {programmi.length === 0 && <li className="text-[13.5px] text-muted">Nessun controllo programmato.</li>}
          {programmi.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line py-2 text-[13.5px] last:border-b-0">
              <Chip tone={TONO[x.stato][0]}>{TONO[x.stato][1]}</Chip>
              <span className="min-w-[200px] flex-1">
                {x.voce}
                {x.obbligo && <span className="text-muted"> · obbligo</span>}
              </span>
              <span className="text-muted tabular-nums">{x.prossima ? fmt.dayY(x.prossima, db.oggi) : "—"}</span>
              <Button size="sm" variant={x.stato === "ok" ? "ghost" : "primary"} disabled={x.ultima === db.oggi} onClick={() => onRegistra(x.id)}>
                {x.ultima === db.oggi ? "Fatto oggi" : "Registra fatto oggi"}
              </Button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Dotazioni e garanzie</Label>
        <Dotazioni db={db} fmt={fmt} soloCasa={imm.id} />
      </div>
    </div>
  );
}
