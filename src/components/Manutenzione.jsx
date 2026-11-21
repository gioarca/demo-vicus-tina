import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { sum } from "../data/api.js";
import { EASE } from "../lib/formati.js";
import { giorniTra } from "../lib/operativita.js";
import { casa, finestraLibera, garanzia, prossimoArrivo } from "../lib/pulizie.js";
import { Fornitori } from "./Fornitori.jsx";
import { Schede } from "./Pulizie.jsx";
import { Button, Chip, Label, Note } from "./ui.jsx";

/* =====================================================================
   VICUS — Manutenzione. Ogni problema diventa una segnalazione con la
   sua casa, chi l'ha visto, entro quando va risolto (il prossimo
   arrivo) e quando si può fare (la prima finestra libera). Sopra la
   soglia del mandato chiede l'ok alla famiglia; se l'oggetto è in
   garanzia lo dice prima di chiamare il tecnico. Poi: controlli
   programmati, pagamenti, dotazioni e rubrica dei fornitori.
   ===================================================================== */

const SOTTO = [
  ["segnalazioni", "Segnalazioni"],
  ["programmata", "Controlli e pagamenti"],
  ["dotazioni", "Dotazioni e garanzie"],
  ["fornitori", "Fornitori"],
];
const STATI = {
  nuovo: ["warn", "nuova"],
  attesa_ok: ["warn", "attesa ok famiglia"],
  programmato: ["neutro", "programmata"],
  aperto: ["accent", "in corso"],
  chiuso: ["ok", "fatta"],
};
const PRIORITA = { urgente: ["bad", "urgente"], prima_arrivo: ["warn", "prima del prossimo arrivo"], finestra: ["neutro", "quando la casa è libera"] };
const FONTE = { addetta: "dall'addetta", ospite: "dagli ospiti", controllo: "dal controllo di legge", tina: "da te", proprietario: "dalla famiglia" };
const FILTRI = [
  ["aperte", "Aperte"],
  ["nuovo", "Nuove"],
  ["attesa_ok", "Attesa ok"],
  ["programmato", "Programmate"],
  ["chiuso", "Fatte"],
];

export function Manutenzione({ sub, setSub, ...p }) {
  const badge = { segnalazioni: p.db.interventi.filter((m) => m.stato === "nuovo" || m.stato === "attesa_ok").length };
  return (
    <section className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5 max-[480px]:p-4" aria-label="Manutenzione">
      <Schede voci={SOTTO} sub={sub} setSub={setSub} id="man" badge={badge} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={sub} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: EASE }}>
          {sub === "segnalazioni" && <Segnalazioni key={p.focus ?? "tutte"} {...p} />}
          {sub === "programmata" && <Fornitori db={p.db} t={p.t} fmt={p.fmt} onRegistra={p.onRegistra} onPatch={p.onPatch} />}
          {sub === "dotazioni" && <Dotazioni {...p} />}
          {sub === "fornitori" && <Rubrica {...p} />}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

/** Soglia di spesa della famiglia: sopra serve il suo ok. Senza soglia nel mandato, l'ok serve sempre. */
const sogliaDi = (db, imm) => {
  const p = db.proprietari.find((x) => x.id === imm.proprietarioId);
  return p?.mandato?.soglia ?? 0;
};

export function Segnalazioni({ db, fmt, focus, onPatch, onChiudi, onSegnala, vai, soloCasa }) {
  const [filtro, setFiltro] = useState(focus ? "tutte" : "aperte");
  const [casaF, setCasaF] = useState(soloCasa ?? "");
  const [aperto, setAperto] = useState(focus ?? null);
  const [nuova, setNuova] = useState(false);
  const lista = db.interventi
    .filter((m) => (filtro === "aperte" ? m.stato !== "chiuso" : filtro === "tutte" ? true : m.stato === filtro))
    .filter((m) => !casaF || m.immobileId === casaF)
    .sort((a, b) => {
      const ord = { urgente: 0, prima_arrivo: 1, finestra: 2 };
      return (a.stato === "chiuso") - (b.stato === "chiuso") || ord[a.priorita] - ord[b.priorita] || b.data.localeCompare(a.data);
    });
  const aperte = db.interventi.filter((m) => m.stato !== "chiuso");
  const fatti = db.interventi.filter((m) => m.stato === "chiuso" && (m.quando ?? m.data).slice(0, 4) === db.oggi.slice(0, 4));

  return (
    <div className="flex flex-col gap-4">
      {!soloCasa && (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line min-[760px]:grid-cols-4">
          {[
            ["Nuove", aperte.filter((m) => m.stato === "nuovo").length, "text-warn"],
            ["Attesa ok famiglia", aperte.filter((m) => m.stato === "attesa_ok").length, "text-warn"],
            ["Programmate o in corso", aperte.filter((m) => m.stato === "programmato" || m.stato === "aperto").length, ""],
            [`Fatti nel ${db.oggi.slice(0, 4)}`, `${fatti.length} · ${fmt.eur(sum(fatti.map((m) => m.costo)))}`, ""],
          ].map(([l, v, c]) => (
            <div key={l} className="flex flex-col gap-0.5 bg-bg px-3.5 py-3">
              <Label>{l}</Label>
              <span className={`text-[22px] font-bold tabular-nums ${c}`}>{v}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {FILTRI.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={filtro === k} onClick={() => setFiltro(k)} className={`cursor-pointer rounded-full border px-2.5 py-1 text-[12.5px] font-semibold ${filtro === k ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-ink"}`}>
            {l}
          </button>
        ))}
        {!soloCasa && (
          <select value={casaF} onChange={(e) => setCasaF(e.target.value)} className="cursor-pointer rounded-md border border-line bg-surface px-2 py-1 text-[13px]" aria-label="Filtra per casa">
            <option value="">Tutte le case</option>
            {db.immobili.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        )}
        <Button size="sm" className="ml-auto" onClick={() => setNuova(!nuova)} aria-expanded={nuova}>
          + Nuova segnalazione
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {nuova && (
          <motion.div className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <NuovaSegnalazione
              db={db}
              casaIniziale={casaF || soloCasa || db.immobili[0].id}
              onCrea={async (dati) => {
                const m = await onSegnala(dati);
                setNuova(false);
                setFiltro("aperte");
                setAperto(m.id);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ul className="m-0 flex list-none flex-col p-0">
        <AnimatePresence initial={false}>
          {lista.map((m) => (
            <Segnalazione key={m.id} m={m} db={db} fmt={fmt} aperto={aperto === m.id} setAperto={setAperto} onPatch={onPatch} onChiudi={onChiudi} vai={vai} soloCasa={soloCasa} />
          ))}
        </AnimatePresence>
        {lista.length === 0 && <li className="py-3 text-[13.5px] text-muted">Nessuna segnalazione con questo filtro.</li>}
      </ul>
    </div>
  );
}

function NuovaSegnalazione({ db, casaIniziale, onCrea }) {
  const [f, setF] = useState({ immobileId: casaIniziale, voce: "", priorita: "prima_arrivo", fonte: "tina" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const invia = (e) => {
    e.preventDefault();
    if (!f.voce.trim()) return;
    onCrea({ ...f, voce: f.voce.trim(), da: f.fonte === "tina" ? "Tina" : f.fonte === "ospite" ? "Ospiti" : "Famiglia", fornitore: "", fornitoreId: null });
  };
  const campo = "rounded-md border border-line bg-surface px-2.5 py-1.5 text-[13.5px]";
  return (
    <form onSubmit={invia} className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl bg-bg p-4 min-[760px]:grid-cols-[1fr_2fr_1fr_1fr_auto] min-[760px]:items-end">
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-semibold text-muted">Casa</span>
        <select value={f.immobileId} onChange={set("immobileId")} className={campo}>
          {db.immobili.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-semibold text-muted">Cosa succede</span>
        <input value={f.voce} onChange={set("voce")} placeholder="es. il frigorifero fa rumore" className={campo} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-semibold text-muted">Entro quando</span>
        <select value={f.priorita} onChange={set("priorita")} className={campo}>
          {Object.entries(PRIORITA).map(([k, [, l]]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-semibold text-muted">Chi l'ha visto</span>
        <select value={f.fonte} onChange={set("fonte")} className={campo}>
          <option value="tina">io</option>
          <option value="ospite">gli ospiti</option>
          <option value="proprietario">la famiglia</option>
        </select>
      </label>
      <Button type="submit" disabled={!f.voce.trim()}>
        Crea
      </Button>
    </form>
  );
}

function Segnalazione({ m, db, fmt, aperto, setAperto, onPatch, onChiudi, vai, soloCasa }) {
  const imm = casa(db, m.immobileId);
  const fam = db.proprietari.find((p) => p.id === imm.proprietarioId);
  const soglia = sogliaDi(db, imm);
  const arr = prossimoArrivo(db, m.immobileId);
  const fin = finestraLibera(db, m.immobileId);
  const dot = m.garanzia ? imm.dotazioni.find((x) => x.voce === m.garanzia) : null;
  const mesiGaranzia = dot ? garanzia(dot, db.oggi) : null;
  const [tono, label] = STATI[m.stato];
  const [pt, pl] = PRIORITA[m.priorita];
  const sopraSoglia = m.costo > soglia;
  const quando = fin?.dal ?? db.oggi;
  const scaduto = m.stato !== "chiuso" && m.priorita !== "finestra" && arr && arr.arrivo <= db.oggi;

  return (
    <motion.li layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: EASE }} className="border-b border-line py-3 last:border-b-0">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <button type="button" aria-expanded={aperto} onClick={() => setAperto(aperto ? null : m.id)} className="flex min-w-[240px] flex-1 cursor-pointer flex-col gap-1 text-left">
          <span className="font-semibold">
            {m.voce}
            {!soloCasa && <span className="font-normal text-muted"> · {imm.nome}</span>}
          </span>
          <span className="flex flex-wrap items-center gap-1.5">
            <Chip tone={tono}>{label}</Chip>
            {m.stato !== "chiuso" && <Chip tone={pt}>{pl}</Chip>}
            {dot && mesiGaranzia > 0 && <Chip tone="ok">in garanzia per {mesiGaranzia} mesi</Chip>}
            <span className="text-[12px] text-muted">
              segnalata {FONTE[m.fonte] ?? ""} {m.da && m.fonte === "addetta" ? `(${m.da})` : ""} il {fmt.day(m.data)}
              {m.foto ? ` · ${m.foto} foto` : ""}
            </span>
          </span>
        </button>
        <span className="flex flex-col items-end text-[12.5px]">
          <span className="font-semibold tabular-nums">{m.costo ? fmt.eur(m.costo) : "—"}</span>
          <span className="text-muted">{m.fornitore || "fornitore da scegliere"}</span>
        </span>
      </div>
      <AnimatePresence initial={false}>
        {aperto && (
          <motion.div className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: EASE }}>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-4 rounded-xl bg-bg p-4 min-[860px]:grid-cols-[minmax(0,1fr)_260px]">
              <div className="flex min-w-0 flex-col gap-3">
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 text-[13px] min-[560px]:grid-cols-2">
                  <span className="flex flex-col">
                    <span className="text-muted">Prossimo arrivo</span>
                    <span className={`font-semibold ${scaduto ? "text-bad" : ""}`}>
                      {arr ? `${fmt.fullDay(arr.arrivo)} · ${arr.ospiti} ospiti (tra ${giorniTra(db.oggi, arr.arrivo)} giorni)` : "nessun arrivo in calendario"}
                    </span>
                  </span>
                  <span className="flex flex-col">
                    <span className="text-muted">Casa libera per i lavori</span>
                    <span className="font-semibold">{fin ? (fin.giorni > 1 ? `dal ${fmt.day(fin.dal)} al ${fmt.day(fin.al)}` : `il ${fmt.day(fin.dal)}`) : "—"}</span>
                  </span>
                  <span className="flex flex-col">
                    <span className="text-muted">Soglia del mandato · {fam?.nome}</span>
                    <span className="font-semibold">{soglia ? `${fmt.eur(soglia)}: ${sopraSoglia ? "serve l'ok" : "puoi decidere tu"}` : "nessuna soglia: chiedi sempre l'ok"}</span>
                  </span>
                  {dot && (
                    <span className="flex flex-col">
                      <span className="text-muted">Garanzia</span>
                      <span className="font-semibold text-ok">
                        {dot.voce} del {dot.anno}, coperta fino al {fmt.longDay(dot.garanziaFino)}: chiama l'assistenza, non il tecnico
                      </span>
                    </span>
                  )}
                </div>

                {m.stato !== "chiuso" && (
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[12px] font-semibold text-muted">Fornitore</span>
                      <select
                        value={m.fornitoreId ?? ""}
                        onChange={(e) => {
                          const f = db.fornitori.find((x) => x.id === e.target.value);
                          onPatch("interventi", m.id, { fornitoreId: f?.id ?? null, fornitore: f?.nome ?? "" });
                        }}
                        className="cursor-pointer rounded-md border border-line bg-surface px-2 py-1.5 text-[13px]"
                      >
                        <option value="">Scegli</option>
                        {db.fornitori.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nome} · {f.categoria}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[12px] font-semibold text-muted">Preventivo €</span>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={m.costo}
                        onChange={(e) => onPatch("interventi", m.id, { costo: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-[100px] rounded-md border border-line bg-surface px-2 py-1.5 text-[13px] tabular-nums"
                      />
                    </label>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {m.stato === "nuovo" &&
                    (dot && mesiGaranzia > 0 ? (
                      <Button size="sm" onClick={() => onPatch("interventi", m.id, { stato: "programmato", fornitoreId: "f13", fornitore: "Assistenza del produttore", costo: 0, quando })}>
                        Apri la pratica in garanzia
                      </Button>
                    ) : sopraSoglia ? (
                      <Button size="sm" onClick={() => onPatch("interventi", m.id, { stato: "attesa_ok" })} disabled={!m.fornitoreId}>
                        Chiedi l'ok alla {fam?.nome}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => onPatch("interventi", m.id, { stato: "programmato", quando })} disabled={!m.fornitoreId}>
                        Programma per il {fmt.day(quando)}
                      </Button>
                    ))}
                  {m.stato === "attesa_ok" && (
                    <>
                      <span className="text-[12.5px] text-warn">In attesa da {giorniTra(m.data, db.oggi)} giorni.</span>
                      <Button size="sm" onClick={() => onPatch("interventi", m.id, { stato: "programmato", quando })}>
                        La famiglia ha detto sì
                      </Button>
                      <button type="button" className="cursor-pointer text-[12.5px] font-semibold text-accent hover:underline" onClick={() => vai({ vista: "famiglie", proprietarioId: fam?.id })}>
                        Apri il rendiconto della famiglia →
                      </button>
                    </>
                  )}
                  {m.stato === "programmato" && (
                    <>
                      <span className="text-[12.5px] text-muted">
                        {m.quando ? `Il ${fmt.day(m.quando)}${m.ora ? ` alle ${m.ora}` : ""}` : "Data da fissare"}
                        {m.fornitore ? ` · ${m.fornitore}` : ""}
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => onPatch("interventi", m.id, { stato: "aperto" })}>
                        In corso
                      </Button>
                      <Button size="sm" onClick={() => onChiudi(m.id)}>
                        Fatto
                      </Button>
                    </>
                  )}
                  {m.stato === "aperto" && (
                    <Button size="sm" onClick={() => onChiudi(m.id)}>
                      Fatto
                    </Button>
                  )}
                  {m.stato === "chiuso" && (
                    <span className="text-[13px] text-ok">
                      Fatta il {fmt.day(m.quando ?? m.data)}
                      {m.costo ? ` · ${fmt.eur(m.costo)} nel rendiconto della ${fam?.nome}` : ""}
                    </span>
                  )}
                </div>
                {m.stato === "nuovo" && !m.fornitoreId && !(dot && mesiGaranzia > 0) && <Note>Scegli il fornitore e il preventivo: se supera la soglia, Vicus chiede l'ok alla famiglia e lo scrive nel registro delle decisioni.</Note>}
              </div>
              <div className="flex flex-col gap-1.5 text-[13px]">
                <Label>La casa</Label>
                <button type="button" className="cursor-pointer text-left font-semibold hover:text-accent" onClick={() => vai({ vista: "case", immobileId: imm.id, tab: "manutenzione" })}>
                  {imm.nome} →
                </button>
                <span className="text-muted">{imm.scheda.impianti}</span>
                <span className="text-muted">Chiavi: {imm.scheda.chiavi}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

/* ------------------------------------------------------------------ */

export function Dotazioni({ db, fmt, soloCasa }) {
  const case_ = db.immobili.filter((i) => !soloCasa || i.id === soloCasa);
  const tutte = case_.flatMap((i) => i.dotazioni.map((x) => ({ ...x, imm: i, mesi: garanzia(x, db.oggi) })));
  const coperte = tutte.filter((x) => x.mesi > 0);
  return (
    <div className="flex flex-col gap-3">
      {!soloCasa && (
        <div className="rounded-lg bg-ok-soft px-4 py-3 text-[13.5px] text-ok">
          {coperte.length} dotazioni sono ancora in garanzia: {coperte.map((x) => `${x.voce.toLowerCase()} (${x.imm.nome})`).join(", ")}. Prima di chiamare un tecnico, guarda qui.
        </div>
      )}
      <div className={`grid gap-3 ${soloCasa ? "" : "min-[900px]:grid-cols-2"}`}>
        {case_.map((imm) => (
          <div key={imm.id} className="flex flex-col gap-1 rounded-xl border border-line px-4 py-3">
            {!soloCasa && <span className="font-semibold">{imm.nome}</span>}
            <ul className="m-0 flex list-none flex-col p-0">
              {imm.dotazioni.map((x) => {
                const mesi = garanzia(x, db.oggi);
                return (
                  <li key={x.voce} className="flex flex-wrap items-center justify-between gap-2 border-t border-line py-1.5 text-[13px] first:border-t-0">
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium">{x.voce}</span>
                      <span className="text-[12px] text-muted">
                        {x.anno ? `dal ${x.anno}` : "anno non indicato"}
                        {x.nota ? ` · ${x.nota}` : ""}
                      </span>
                    </span>
                    {mesi == null ? <span className="text-[12px] text-muted">—</span> : mesi > 0 ? <Chip tone="ok">garanzia fino al {fmt.day(x.garanziaFino)} {x.garanziaFino.slice(0, 4)}</Chip> : <Chip tone="warn">garanzia scaduta</Chip>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Rubrica({ db, fmt }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2">
        {db.fornitori.map((f) => {
          const lavori = db.interventi.filter((m) => m.fornitoreId === f.id);
          const aperti = lavori.filter((m) => m.stato !== "chiuso");
          const pag = db.pagamenti.filter((p) => p.fornitoreId === f.id);
          const registrati = new Set(pag.map((p) => p.voce));
          // pagamenti registrati più lavori chiusi non ancora passati dal registro
          const speso = sum(pag.map((p) => p.importo)) + sum(lavori.filter((m) => m.stato === "chiuso" && !registrati.has(m.voce)).map((m) => m.costo));
          const daPagare = sum(pag.filter((p) => p.stato !== "pagato").map((p) => p.importo));
          return (
            <div key={f.id} className="flex flex-col gap-1 rounded-xl border border-line px-3.5 py-3">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold">{f.nome}</span>
                {f.voto && <span className="text-[12.5px] font-semibold text-accent">★ {fmt.x(f.voto)}</span>}
              </span>
              <span className="text-[12.5px] text-muted">
                {f.categoria} · {f.zona} · risponde {f.risposta}
              </span>
              <span className="text-[12.5px]">
                {lavori.length} lavori quest'anno · speso {fmt.eur(speso)}
                {daPagare ? <span className="text-warn"> · da pagare {fmt.eur(daPagare)}</span> : ""}
              </span>
              {aperti.length > 0 && <span className="text-[12px] text-accent">{aperti.map((m) => m.voce).join(" · ")}</span>}
            </div>
          );
        })}
      </div>
      <Note>Il voto e i tempi di risposta vengono dai lavori registrati: dopo ogni lavoro chiuso il fornitore sale o scende.</Note>
    </div>
  );
}
