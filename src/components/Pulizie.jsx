import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { piuGiorni, sum } from "../data/api.js";
import { EASE } from "../lib/formati.js";
import { giorniTra, riepilogo } from "../lib/operativita.js";
import { STATO_TURNO, addetta, affidabilita, casa, compensiMese, fotoComplete, statoBiancheria, statoScorte } from "../lib/pulizie.js";
import { Button, Chip, Label, Note, Progress, Rise } from "./ui.jsx";

/* =====================================================================
   VICUS — Pulizie. Tutto il giro delle pulizie in un posto:
   turni legati alle partenze con la checklist della casa e le foto,
   verifica con voto e ripasso, problemi che diventano segnalazioni,
   squadra con affidabilità e compensi, biancheria, scorte e il
   riepilogo automatico della sera.
   ===================================================================== */

const SOTTO = [
  ["settimana", "Turni"],
  ["squadra", "Squadra"],
  ["biancheria", "Biancheria e scorte"],
  ["invio", "Riepilogo della sera"],
];

const TIPO = { partenza: "Cambio dopo la partenza", meta: "Pulizia di metà soggiorno", sopralluogo: "Sopralluogo casa chiusa" };

export function Pulizie({ sub, setSub, ...p }) {
  return (
    <section className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5 max-[480px]:p-4" aria-label="Pulizie">
      <Schede voci={SOTTO} sub={sub} setSub={setSub} id="pul" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={sub} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: EASE }}>
          {sub === "settimana" && <Turni key={p.focus ?? "tutti"} {...p} />}
          {sub === "squadra" && <Squadra {...p} />}
          {sub === "biancheria" && <Biancheria {...p} />}
          {sub === "invio" && <Invio {...p} />}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

export function Schede({ voci, sub, setSub, id, badge = {} }) {
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="tablist">
      {voci.map(([k, l]) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={sub === k}
          onClick={() => setSub(k)}
          className={`relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[13.5px] font-semibold whitespace-nowrap transition-colors ${sub === k ? "text-on-accent" : "text-muted hover:text-ink"}`}
        >
          {sub === k && <motion.span layoutId={`sotto-${id}`} className="absolute inset-0 rounded-full bg-accent" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
          <span className="relative">{l}</span>
          {badge[k] > 0 && <span className={`relative rounded-full px-1.5 text-[11px] tabular-nums ${sub === k ? "bg-on-accent/20" : "bg-bad-soft text-bad"}`}>{badge[k]}</span>}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Turni({ db, d, fmt, focus, onTurno, onSegnala, vai }) {
  const [aperto, setAperto] = useState(focus ?? null);
  const daVerificare = d.turni.filter((x) => x.stato === "fatto" || x.stato === "ripasso");
  const prossimi = d.turni.filter((x) => x.data >= db.oggi && !daVerificare.includes(x));
  const giorniLista = [...new Set(prossimi.map((x) => x.data))];
  const verificati = d.turni.filter((x) => x.data < db.oggi && x.stato === "verificato").reverse();
  const assegnati = prossimi.filter((x) => x.addettoId).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line min-[760px]:grid-cols-4">
        {[
          ["Da verificare", daVerificare.length, daVerificare.length ? "text-warn" : "text-ok"],
          ["Da assegnare, 7 giorni", prossimi.filter((x) => x.stato === "da_assegnare" && giorniTra(db.oggi, x.data) <= 7).length, "text-bad"],
          ["Turni in arrivo", prossimi.length, ""],
          ["Con un'addetta", `${assegnati}/${prossimi.length}`, ""],
        ].map(([l, v, c]) => (
          <div key={l} className="flex flex-col gap-0.5 bg-bg px-3.5 py-3">
            <Label>{l}</Label>
            <span className={`text-[22px] font-bold tabular-nums ${c}`}>{v}</span>
          </div>
        ))}
      </div>

      {daVerificare.length > 0 && (
        <Gruppo titolo="Da verificare" nota="l'addetta ha finito: guarda le foto, dai un voto">
          {daVerificare.map((x) => (
            <Turno key={x.id} x={x} db={db} fmt={fmt} aperto={aperto === x.id} setAperto={setAperto} onTurno={onTurno} onSegnala={onSegnala} vai={vai} />
          ))}
        </Gruppo>
      )}
      {giorniLista.map((g) => (
        <Gruppo key={g} titolo={g === db.oggi ? `Oggi, ${fmt.fullDay(g)}` : g === piuGiorni(db.oggi, 1) ? `Domani, ${fmt.fullDay(g)}` : fmt.fullDay(g)}>
          {prossimi
            .filter((x) => x.data === g)
            .map((x) => (
              <Turno key={x.id} x={x} db={db} fmt={fmt} aperto={aperto === x.id} setAperto={setAperto} onTurno={onTurno} onSegnala={onSegnala} vai={vai} />
            ))}
        </Gruppo>
      ))}
      {verificati.length > 0 && (
        <Gruppo titolo="Verificati negli ultimi giorni">
          {verificati.map((x) => (
            <Turno key={x.id} x={x} db={db} fmt={fmt} aperto={aperto === x.id} setAperto={setAperto} onTurno={onTurno} onSegnala={onSegnala} vai={vai} />
          ))}
        </Gruppo>
      )}
    </div>
  );
}

function Gruppo({ titolo, nota, children }) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-1">
        <span className="text-[13px] font-bold first-letter:uppercase">{titolo}</span>
        {nota && <span className="text-[12px] text-muted">{nota}</span>}
      </div>
      <ul className="m-0 flex list-none flex-col p-0">{children}</ul>
    </div>
  );
}

function Turno({ x, db, fmt, aperto, setAperto, onTurno, onSegnala, vai }) {
  const imm = casa(db, x.immobileId);
  const [tono, label] = STATO_TURNO[x.stato];
  const passato = x.data <= db.oggi;
  return (
    <motion.li layout className="border-b border-line py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button type="button" aria-expanded={aperto} onClick={() => setAperto(aperto ? null : x.id)} className="flex min-w-[220px] flex-1 cursor-pointer flex-col text-left">
          <span className="font-semibold">
            {imm.nome} <span className="font-normal text-muted">· {x.dalle}{x.entro ? `–${x.entro}` : ""}</span>
          </span>
          <span className={`text-[12.5px] ${x.cambioStretto || x.urgente ? "text-warn" : "text-muted"}`}>
            {TIPO[x.tipo]}
            {x.cambioStretto ? " · cambio stretto: arrivano lo stesso giorno" : ""}
            {x.prossimo && x.tipo !== "meta" ? ` · poi ${x.prossimo.ospiti} ospiti il ${fmt.day(x.prossimo.arrivo)}` : ""}
            {x.tipo === "meta" && x.nota ? ` · ${x.nota}` : ""}
          </span>
        </button>
        <label className="flex items-center gap-1.5">
          <span className="sr-only">Addetta</span>
          <select
            value={x.addettoId || ""}
            disabled={x.stato === "verificato"}
            onChange={(e) => onTurno(x, { addettoId: e.target.value || null, stato: e.target.value ? "assegnato" : "da_assegnare" })}
            className="cursor-pointer rounded-md border border-line bg-surface px-2 py-1 text-[13px] text-ink disabled:cursor-default disabled:opacity-70"
          >
            <option value="">Scegli chi pulisce</option>
            {db.addetti.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome} · {a.zona}
              </option>
            ))}
          </select>
        </label>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={x.stato} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.15 }}>
            <Chip tone={tono}>{label}</Chip>
          </motion.span>
        </AnimatePresence>
        <span className="w-[52px] text-right text-[13px] font-semibold tabular-nums">{fmt.eur(x.compenso)}</span>
        <button type="button" aria-expanded={aperto} onClick={() => setAperto(aperto ? null : x.id)} className="cursor-pointer text-[12.5px] font-semibold text-accent hover:underline">
          {aperto ? "Chiudi" : `Checklist ${Math.min(x.foto, x.checklist.length)}/${x.checklist.length}`}
        </button>
      </div>
      <AnimatePresence initial={false}>
        {aperto && (
          <motion.div className="overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24, ease: EASE }}>
            <Dettaglio x={x} imm={imm} db={db} passato={passato} onTurno={onTurno} onSegnala={onSegnala} vai={vai} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function Dettaglio({ x, imm, db, passato, onTurno, onSegnala, vai }) {
  const [voto, setVoto] = useState(5);
  const [problema, setProblema] = useState("");
  const [creato, setCreato] = useState(null);
  const a = x.addettoId ? addetta(db, x.addettoId) : null;
  const complete = fotoComplete(x);
  const segnala = async (e) => {
    e.preventDefault();
    if (!problema.trim()) return;
    const m = await onSegnala({ immobileId: imm.id, voce: problema.trim(), fonte: "addetta", da: a?.nome ?? "Tina", priorita: "prima_arrivo", fornitore: "", turnoId: x.id });
    setCreato(m.id);
    setProblema("");
  };
  return (
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-4 rounded-xl bg-bg p-4 min-[860px]:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label>Checklist di {imm.nome}</Label>
          <ul className="m-0 grid grid-cols-[minmax(0,1fr)] list-none gap-x-4 gap-y-1 p-0 min-[600px]:grid-cols-2">
            {x.checklist.map((c, i) => (
              <li key={c} className={`flex items-start gap-1.5 text-[13px] ${i < x.foto ? "" : "text-muted"}`}>
                <span aria-hidden="true" className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-sm text-[10px] font-bold ${i < x.foto ? "bg-ok text-on-accent" : "border border-line bg-surface"}`}>
                  {i < x.foto ? "✓" : ""}
                </span>
                <span>
                  {c}
                  <span className="sr-only">{i < x.foto ? ", foto caricata" : ", foto mancante"}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {x.stato === "assegnato" && (
            <Button size="sm" variant="ghost" onClick={() => onTurno(x, { stato: "confermato" })}>
              {a?.nome} ha confermato
            </Button>
          )}
          {x.stato === "confermato" && passato && (
            <Button size="sm" onClick={() => onTurno(x, { stato: "fatto", foto: x.checklist.length })}>
              Segna fatto, con le foto
            </Button>
          )}
          {x.stato === "confermato" && !passato && <span className="text-[12.5px] text-muted">Il giorno del turno {a?.nome} chiude la checklist con una foto per voce.</span>}
          {(x.stato === "fatto" || x.stato === "ripasso") && (
            <>
              {!complete && !x.richiestaFoto && (
                <Button size="sm" variant="ghost" onClick={() => onTurno(x, { richiestaFoto: true })}>
                  Chiedi le {x.checklist.length - x.foto} foto mancanti
                </Button>
              )}
              {!complete && x.richiestaFoto && <Chip tone="accent">foto richieste a {a?.nome}</Chip>}
              <fieldset className="m-0 flex items-center gap-1 border-0 p-0">
                <legend className="sr-only">Voto della pulizia</legend>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" aria-label={`${n} su 5`} aria-pressed={voto === n} onClick={() => setVoto(n)} className={`cursor-pointer text-[18px] leading-none ${n <= voto ? "text-accent" : "text-line"}`}>
                    ★
                  </button>
                ))}
              </fieldset>
              <Button size="sm" onClick={() => onTurno(x, voto <= 2 ? { stato: "ripasso", voto } : { stato: "verificato", voto, controllo: complete ? "foto" : "di persona" })}>
                {voto <= 2 ? "Chiedi il ripasso" : complete ? "Verifica" : "Verifica, ho controllato di persona"}
              </Button>
            </>
          )}
          {x.stato === "verificato" && (
            <span className="text-[13px] text-ok">
              Verificato{x.voto ? ` · ${"★".repeat(x.voto)}` : ""}
              {x.controllo === "di persona" ? " · controllo di persona" : ""}
            </span>
          )}
        </div>

        <form onSubmit={segnala} className="flex flex-wrap items-center gap-2">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1">
            <span className="text-[12px] font-semibold text-muted">Un problema trovato durante la pulizia?</span>
            <input value={problema} onChange={(e) => setProblema(e.target.value)} placeholder="es. lampadina del bagno fulminata" className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-[13.5px]" />
          </label>
          <Button size="sm" type="submit" className="self-end" disabled={!problema.trim()}>
            Manda in manutenzione
          </Button>
          {creato && (
            <button type="button" className="cursor-pointer self-end text-[12.5px] font-semibold text-ok hover:underline" onClick={() => vai({ vista: "manutenzione", intervento: creato })}>
              Segnalazione creata → apri
            </button>
          )}
        </form>
      </div>

      <div className="flex flex-col gap-2 text-[13px]">
        <Label>Cosa serve</Label>
        <span>
          <strong>Letti:</strong> {imm.scheda.letti}
        </span>
        <span>
          <strong>Biancheria:</strong> {imm.biancheria.map((b) => `${b.servono} ${b.tipo.toLowerCase()}`).join(", ")}
        </span>
        <span>
          <strong>Tempo:</strong> {imm.pulizia.durata}
        </span>
        {imm.scheda.noteAddetta && <span className="rounded-md bg-surface px-2.5 py-2 text-[12.5px]">{imm.scheda.noteAddetta}</span>}
        <span>
          <strong>Chiavi:</strong> {imm.scheda.chiavi}
        </span>
        {x.ritardo && <span className="text-warn">Arrivata con {x.ritardo} minuti di ritardo</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Squadra({ db, d, fmt, onPatch }) {
  const squadra = compensiMese(db, d.turni);
  const totale = sum(squadra.filter((a) => !a.mese.pagato).map((a) => a.importoMese));
  const peggiore = [...db.immobili].filter((i) => i.recensioni).sort((a, b) => a.recensioni.pulizia - b.recensioni.pulizia)[0];
  const sua = peggiore ? addetta(db, peggiore.pulizia.addettaRif) : null;
  return (
    <div className="flex flex-col gap-4">
      {peggiore && sua && (
        <div className="rounded-lg bg-warn-soft px-4 py-3 text-[13.5px]">
          <strong>{peggiore.nome}</strong> ha il voto più basso sulla pulizia ({fmt.x(peggiore.recensioni.pulizia)} su 10, {peggiore.recensioni.critichePulizia} recensioni critiche). Di solito la pulisce{" "}
          <strong>{sua.nome}</strong>, che chiude le foto nel {Math.round(sua.storico.foto * 100)}% dei turni. Prova ad affiancarla con Assunta per due cambi, o a spostare la casa su un'altra addetta.
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 min-[760px]:grid-cols-2">
        {squadra.map((a) => {
          const aff = affidabilita(a);
          const prossimi = d.turni.filter((x) => x.addettoId === a.id && x.data >= db.oggi);
          return (
            <motion.div key={a.id} layout className="flex flex-col gap-2 rounded-xl border border-line px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-[16px] font-bold">{a.nome}</span>
                  <span className="text-[12.5px] text-muted">
                    {a.zona}
                    {a.tipo === "impresa" ? ` · impresa, +${Math.round(a.maggiorazione * 100)}% sul compenso` : ""}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-[22px] font-bold tabular-nums ${aff >= 90 ? "text-ok" : aff >= 80 ? "text-warn" : "text-bad"}`}>{aff}</span>
                  <span className="text-[11px] text-muted">affidabilità</span>
                </div>
              </div>
              <Progress value={aff} max={100} />
              <div className="grid grid-cols-4 gap-2 text-[12.5px]">
                {[
                  ["Puntuale", `${Math.round(a.storico.puntualita * 100)}%`],
                  ["Foto complete", `${Math.round(a.storico.foto * 100)}%`],
                  ["Voto medio", fmt.x(a.storico.voto)],
                  ["Ripassi", a.storico.ripassi],
                ].map(([l, v]) => (
                  <span key={l} className="flex flex-col">
                    <span className="text-muted">{l}</span>
                    <span className="font-semibold tabular-nums">{v}</span>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-[13px]">
                <span>
                  Novembre: <strong>{a.turniMese === 1 ? "1 turno" : `${a.turniMese} turni`}</strong>, {fmt.eur(a.importoMese)}
                  <span className="text-muted"> · {prossimi.length} in programma</span>
                </span>
                {a.mese.pagato ? (
                  <Chip tone="ok">pagato</Chip>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => onPatch("addetti", a.id, { mese: { ...a.mese, pagato: true } })}>
                    Segna pagato
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      <Note>
        Da pagare alla squadra a fine mese: {fmt.eur(totale)}. L'affidabilità pesa puntualità, foto complete e voto medio delle verifiche. Le pulizie si riaddebitano alle famiglie nel rendiconto, ognuna con il prezzo della sua casa.
      </Note>
      <div className="flex flex-col gap-1">
        <Label>Recensioni sulla pulizia, per casa</Label>
        <div className="relative -mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[520px] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-[12px] text-muted">
                <th scope="col" className="py-1.5 text-left font-semibold">Casa</th>
                <th scope="col" className="py-1.5 pl-3 text-left font-semibold">Di solito</th>
                <th scope="col" className="py-1.5 pl-3 text-right font-semibold">Pulizia</th>
                <th scope="col" className="py-1.5 pl-3 text-right font-semibold">Voto generale</th>
                <th scope="col" className="py-1.5 pl-3 text-right font-semibold">Recensioni critiche</th>
              </tr>
            </thead>
            <tbody>
              {db.immobili
                .filter((i) => i.recensioni)
                .sort((a, b) => a.recensioni.pulizia - b.recensioni.pulizia)
                .map((i) => (
                  <tr key={i.id} className="border-b border-line">
                    <th scope="row" className="py-1.5 text-left font-medium">{i.nome}</th>
                    <td className="py-1.5 pl-3">{addetta(db, i.pulizia.addettaRif)?.nome}</td>
                    <td className={`py-1.5 pl-3 text-right font-semibold tabular-nums ${i.recensioni.pulizia < 8.5 ? "text-bad" : i.recensioni.pulizia < 9.2 ? "text-warn" : "text-ok"}`}>{fmt.x(i.recensioni.pulizia)}</td>
                    <td className="py-1.5 pl-3 text-right tabular-nums">{fmt.x(i.recensioni.voto)}</td>
                    <td className="py-1.5 pl-3 text-right tabular-nums">{i.recensioni.critichePulizia}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Biancheria({ db, d, fmt, onBiancheria, onPatch }) {
  const lav = db.lavanderia;
  const f = db.fornitori.find((x) => x.id === lav.fornitoreId);
  const cambi14 = d.turni.filter((t) => t.data >= db.oggi && t.data <= piuGiorni(db.oggi, 14) && t.tipo !== "sopralluogo").length;
  const scorte = statoScorte(db, cambi14);
  const spesa = scorte.filter((s) => s.sotto);
  const TONO = { ok: ["ok", "basta"], stretto: ["warn", "al limite"], manca: ["bad", "non basta"] };
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-bg px-4 py-3 text-[13.5px]">
        <span>
          <strong>{f?.nome}</strong> · ritiro {lav.giri} · riconsegna {lav.consegna}
        </span>
        <span>
          Prossimo ritiro: <strong>{lav.prossimoRitiro === db.oggi ? "oggi alle 17" : fmt.day(lav.prossimoRitiro)}</strong> · novembre finora {fmt.eur(lav.mese)}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label>Biancheria per casa</Label>
          <span className="text-[12px] text-muted">basta per il prossimo cambio? e per i due successivi, contando la lavanderia?</span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 min-[900px]:grid-cols-2">
          {db.immobili
            .filter((i) => i.biancheria.length)
            .map((imm) => (
              <div key={imm.id} className="flex flex-col gap-1.5 rounded-xl border border-line px-4 py-3">
                <span className="font-semibold">
                  {imm.nome} {imm.chiusa && <span className="font-normal text-muted">· chiusa</span>}
                </span>
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="text-[11.5px] text-muted">
                      <th scope="col" className="py-1 text-left font-semibold">Set</th>
                      <th scope="col" className="py-1 pl-2 text-right font-semibold">a cambio</th>
                      <th scope="col" className="py-1 pl-2 text-right font-semibold">puliti</th>
                      <th scope="col" className="py-1 pl-2 text-right font-semibold">in lavanderia</th>
                      <th scope="col" className="py-1 pl-2 text-right font-semibold">
                        <span className="sr-only">Stato e azioni</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {statoBiancheria(db, imm, d.turni).map((b) => (
                      <tr key={b.tipo} className="border-t border-line">
                        <th scope="row" className="py-1 text-left font-medium">{b.tipo}</th>
                        <td className="py-1 pl-2 text-right tabular-nums">{b.servono}</td>
                        <td className={`py-1 pl-2 text-right font-semibold tabular-nums ${b.stato === "manca" ? "text-bad" : ""}`}>{b.puliti}</td>
                        <td className="py-1 pl-2 text-right tabular-nums">{b.lavanderia}</td>
                        <td className="py-1 pl-2 text-right">
                          {b.lavanderia > 0 && b.stato !== "ok" ? (
                            <button type="button" onClick={() => onBiancheria(imm.id, b.tipo, { puliti: b.puliti + b.lavanderia, lavanderia: 0 })} className="cursor-pointer text-[12px] font-semibold text-accent hover:underline">
                              Ritirati
                            </button>
                          ) : (
                            <Chip tone={TONO[b.stato][0]}>{TONO[b.stato][1]}</Chip>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 min-[900px]:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label>Scorte nel magazzino</Label>
            <span className="text-[12px] text-muted">{cambi14} cambi nei prossimi 14 giorni</span>
          </div>
          <div className="relative -mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[480px] border-collapse text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-[12px] text-muted">
                  <th scope="col" className="py-1.5 text-left font-semibold">Prodotto</th>
                  <th scope="col" className="py-1.5 pl-3 text-right font-semibold">In magazzino</th>
                  <th scope="col" className="py-1.5 pl-3 text-right font-semibold">Bastano per</th>
                  <th scope="col" className="py-1.5 pl-3 text-right font-semibold">
                    <span className="sr-only">Stato</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {scorte.map((s) => (
                  <tr key={s.id} className="border-b border-line">
                    <th scope="row" className="py-1.5 text-left font-medium">{s.voce}</th>
                    <td className="py-1.5 pl-3 text-right tabular-nums">
                      {s.quantita} {s.unita}
                    </td>
                    <td className="py-1.5 pl-3 text-right tabular-nums">{s.bastaPer == null ? "—" : `${s.bastaPer} cambi`}</td>
                    <td className="py-1.5 pl-3 text-right">{s.sotto ? <Chip tone="warn">da comprare</Chip> : <Chip tone="ok">ok</Chip>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex h-fit flex-col gap-2 rounded-xl border border-line px-4 py-3">
          <Label>Lista della spesa</Label>
          {spesa.length === 0 ? (
            <span className="text-[13px] text-muted">Niente da comprare.</span>
          ) : (
            <>
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px]">
                {spesa.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <span>
                      {s.daComprare} {s.unita} · {s.voce.toLowerCase()}
                    </span>
                    <span className="tabular-nums text-muted">{fmt.eur2(s.costo)}</span>
                  </li>
                ))}
              </ul>
              <span className="flex justify-between border-t border-line pt-1 text-[13px] font-semibold">
                <span>Totale</span>
                <span className="tabular-nums">{fmt.eur2(sum(spesa.map((s) => s.costo)))}</span>
              </span>
              <Button size="sm" onClick={() => spesa.forEach((s) => onPatch("scorte", s.id, { quantita: s.quantita + s.daComprare }))}>
                Segna tutto comprato
              </Button>
            </>
          )}
          <Note>Le quantità tengono conto dei cambi in calendario: con più arrivi, la lista cresce da sola.</Note>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Invio({ db, d, fmt, onPatch }) {
  const domani = riepilogo(db);
  const nome = (id) => casa(db, id)?.nome ?? "";
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 min-[760px]:grid-cols-[minmax(0,1fr)_280px]">
      <Rise className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label>Il messaggio di stasera</Label>
          <span className="text-[12px] text-muted">
            ogni giorno alle {db.invio.ora} su {db.invio.canale}, da solo
          </span>
        </div>
        <div className="rounded-xl border border-line bg-bg px-4 py-3 text-[13.5px] leading-relaxed">
          <div className="font-semibold">Domani, {fmt.fullDay(domani.giorno)}</div>
          <div className="mt-1">
            <span className="font-semibold">Partenze e pulizie</span>
            {domani.partenze.length === 0 && <div>—</div>}
            {domani.partenze.map((b) => {
              const tr = d.turni.find((x) => x.id === b.id);
              const a = tr?.addettoId ? addetta(db, tr.addettoId)?.nome : "da assegnare";
              return (
                <div key={b.id}>
                  {nome(b.immobileId)} · {b.id} · pulizia {a} dalle {tr?.dalle ?? "10:30"}
                  {tr?.prossimo ? ` · poi ${tr.prossimo.ospiti} ospiti il ${fmt.day(tr.prossimo.arrivo)}` : ""}
                </div>
              );
            })}
          </div>
          <div className="mt-1">
            <span className="font-semibold">Arrivi</span>
            {domani.arrivi.length === 0 && <div>—</div>}
            {domani.arrivi.map((b) => (
              <div key={b.id}>
                {nome(b.immobileId)} · {b.id} · {b.ospiti} ospiti · {b.orario || "orario da confermare"}
              </div>
            ))}
          </div>
        </div>
        <Note>Ogni addetta riceve solo le sue case e un calendario da aggiungere al telefono, che si aggiorna da solo quando cambia una prenotazione.</Note>
      </Rise>
      <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
        <legend className="mb-1 text-[11px] font-semibold uppercase tracking-[.08em] text-muted">Chi lo riceve</legend>
        {db.invio.destinatari.map((x) => {
          const who = x.tipo === "addetto" ? addetta(db, x.id) : db.proprietari.find((p) => p.id === x.id);
          return (
            <label key={x.id} className="flex cursor-pointer items-center justify-between gap-2 text-[13.5px]">
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{who?.nome}</span>
                <span className="text-[12px] text-muted">{x.tipo === "addetto" ? "squadra pulizie" : "famiglia, solo le sue case"}</span>
              </span>
              <input type="checkbox" className="size-4 cursor-pointer accent-[var(--q-accent)]" checked={x.attivo} onChange={(e) => onPatch("destinatari", x.id, { attivo: e.target.checked })} />
            </label>
          );
        })}
      </fieldset>
    </div>
  );
}
