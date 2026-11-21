import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { piuGiorni } from "../data/api.js";
import { EASE } from "../lib/formati.js";
import { agenda, statoCase } from "../lib/oggi.js";
import { giorni, giorniTra } from "../lib/operativita.js";
import { addetta } from "../lib/pulizie.js";
import { Chip, Label, Note, Rise } from "./ui.jsx";

/* =====================================================================
   VICUS — Oggi. La prima schermata di Tina: cosa succede oggi, cosa va
   fatto (raccolto da tutte le sezioni), le case in questo momento, il
   calendario di due settimane e l'arrivo della spedizione Vicus.
   ===================================================================== */

const CANALE = {
  Booking: "bg-s3 text-on-accent",
  Airbnb: "bg-s2 text-on-accent",
  Diretto: "bg-warn-soft text-warn ring-1 ring-inset ring-warn/40",
  Vicus: "bg-accent text-on-accent",
};
const ICONA = { partenza: "↗", arrivo: "↘", pulizia: "✦", lavoro: "⚒", lavanderia: "◎", invio: "✉" };
const AREA_TONO = { bad: "bad", warn: "warn", accent: "accent", ok: "ok" };

export function Oggi({ db, t, fmt, vai, d, onPatch }) {
  const [tutte, setTutte] = useState(false);
  const ev = agenda(db, d.turni);
  const nome = (id) => db.immobili.find((i) => i.id === id)?.nome ?? "";
  const urgenti = d.todo.filter((x) => x.tono === "bad").length;
  const lista = tutte ? d.todo : d.todo.slice(0, 9);
  const vicus = db.prenotazioni.find((b) => b.canale === "Vicus" && b.partenza > db.oggi);
  const conta = (tipo) => ev.filter((e) => e.tipo === tipo).length;

  const azione = (a) => {
    if (a.tipo === "alloggiati") onPatch("prenotazioni", a.id, { alloggiati: "inviata" });
    if (a.tipo === "orario") onPatch("prenotazioni", a.id, { promemoria: true });
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-wrap items-end justify-between gap-3 rounded-[14px] border border-line bg-surface px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="m-0 text-[26px] font-bold tracking-[-.02em]">Buongiorno {db.gestore.nome}</h1>
          <p className="m-0 max-w-[62ch] text-[14px] text-muted">
            Oggi {conta("partenza")} {conta("partenza") === 1 ? "partenza" : "partenze"}, {conta("arrivo")} {conta("arrivo") === 1 ? "arrivo" : "arrivi"}, {conta("pulizia")} {conta("pulizia") === 1 ? "pulizia" : "pulizie"} e {conta("lavoro")} {conta("lavoro") === 1 ? "lavoro" : "lavori"} in casa.{" "}
            {urgenti ? (
              <span className="font-semibold text-bad">
                {urgenti} {urgenti === 1 ? "cosa urgente" : "cose urgenti"} qui sotto.
              </span>
            ) : (
              "Niente di urgente."
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
          {[
            ["Da mettere da parte", `${fmt.eur(d.prev.accantonamento)} al mese`, "soldi"],
            ["Scadenze entro 30 giorni", `${d.sintesi.n}, ${d.sintesi.scadute} in ritardo`, "compliance"],
          ].map(([l, v, w]) => (
            <button key={l} type="button" onClick={() => vai({ vista: w })} className="flex cursor-pointer flex-col text-left">
              <Label>{l}</Label>
              <span className="font-semibold">{v}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid items-start gap-4 min-[960px]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* ---------- da fare ---------- */}
        <section className="flex min-w-0 flex-col gap-2 rounded-[14px] border border-line bg-surface p-5 max-[480px]:p-4" aria-label="Da fare">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label>Da fare, da tutte le sezioni</Label>
            <span className="text-[12px] text-muted">prima l'urgente · tocca per aprire</span>
          </div>
          <ul className="m-0 flex list-none flex-col p-0">
            <AnimatePresence initial={false}>
              {lista.map((x) => (
                <motion.li
                  key={x.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="flex items-center gap-3 border-b border-line py-2.5 last:border-b-0"
                >
                  <span aria-hidden="true" className={`h-9 w-1 shrink-0 rounded-full ${x.tono === "bad" ? "bg-bad" : x.tono === "warn" ? "bg-warn" : "bg-accent/50"}`} />
                  <button type="button" onClick={() => vai(x.vai)} className="flex min-w-0 flex-1 cursor-pointer flex-col text-left">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Chip tone={AREA_TONO[x.tono]}>{x.area}</Chip>
                      <span className="text-[14px] font-semibold">{x.titolo ?? t(x.chiave.k, x.chiave.v)}</span>
                    </span>
                    {x.dettaglio && <span className="text-[12.5px] text-muted">{x.dettaglio}</span>}
                  </button>
                  {x.azione ? (
                    <button type="button" onClick={() => azione(x.azione)} className="shrink-0 cursor-pointer rounded-lg bg-accent px-2.5 py-1.5 text-[12.5px] font-semibold text-on-accent hover:brightness-110">
                      {x.azione.label}
                    </button>
                  ) : (
                    <span aria-hidden="true" className="shrink-0 text-muted">
                      →
                    </span>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {d.todo.length > 9 && (
            <button type="button" onClick={() => setTutte(!tutte)} className="cursor-pointer self-start text-[13px] font-semibold text-accent hover:underline" aria-expanded={tutte}>
              {tutte ? "Mostra meno" : `Mostra tutte (${d.todo.length})`}
            </button>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-4">
          {/* ---------- la giornata ---------- */}
          <section className="flex flex-col gap-2 rounded-[14px] border border-line bg-surface p-5 max-[480px]:p-4" aria-label="La giornata">
            <Label>La giornata</Label>
            <ol className="relative m-0 flex list-none flex-col gap-0 p-0">
              {ev.map((e, i) => (
                <motion.li key={`${e.tipo}-${i}`} className="relative grid grid-cols-[48px_22px_minmax(0,1fr)] items-start gap-x-2 py-1.5" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: 0.03 * i }}>
                  <span className={`pt-0.5 text-[12.5px] font-semibold tabular-nums ${e.allarme ? "text-bad" : "text-muted"}`}>{e.ora}</span>
                  <span aria-hidden="true" className={`grid size-[22px] place-items-center rounded-full text-[11px] ${e.allarme ? "bg-bad-soft text-bad" : "bg-accent-soft text-accent"}`}>
                    {ICONA[e.tipo]}
                  </span>
                  <button
                    type="button"
                    className="flex min-w-0 cursor-pointer flex-col text-left"
                    onClick={() => vai(e.turno ? { vista: "pulizie", turno: e.turno } : e.intervento ? { vista: "manutenzione", intervento: e.intervento } : e.casa ? { vista: "case", immobileId: e.casa } : { vista: "pulizie", sub: e.tipo === "invio" ? "invio" : "biancheria" })}
                  >
                    <span className="text-[13.5px] font-semibold">
                      {e.titolo}
                      {e.casa && <span className="font-normal text-muted"> · {nome(e.casa)}</span>}
                    </span>
                    <span className={`text-[12.5px] ${e.allarme ? "text-bad" : "text-muted"}`}>{e.dettaglio}</span>
                  </button>
                </motion.li>
              ))}
            </ol>
          </section>

          {/* ---------- spedizione Vicus ---------- */}
          {vicus && <Spedizione db={db} b={vicus} d={d} fmt={fmt} vai={vai} />}
        </div>
      </div>

      {/* ---------- le case adesso ---------- */}
      <Rise className="flex flex-col gap-2" delay={0.05}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
          <Label>Le case adesso</Label>
          <span className="text-[12px] text-muted">tocca una casa per la sua scheda completa</span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2">
          {statoCase(db).map(({ imm, dentro, prossimo, finestra }) => {
            const aperti = db.interventi.filter((m) => m.immobileId === imm.id && m.stato !== "chiuso").length;
            return (
              <button key={imm.id} type="button" onClick={() => vai({ vista: "case", immobileId: imm.id })} className="flex cursor-pointer flex-col gap-1 rounded-xl border border-line bg-surface px-3.5 py-3 text-left transition-colors hover:border-accent/50">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{imm.nome}</span>
                  {imm.partnerVicus && <Chip tone="accent">Vicus</Chip>}
                </span>
                <span className="text-[12.5px] text-muted">{imm.comune} · {imm.proprietarioId && db.proprietari.find((p) => p.id === imm.proprietarioId)?.nome}</span>
                <span className="text-[13px]">
                  {imm.chiusa ? (
                    <span className="text-muted">Chiusa per l'inverno · {finestra ? "finestra per i lavori" : ""}</span>
                  ) : dentro ? (
                    <>
                      <span className="font-semibold text-ok">Ospiti in casa</span> · {dentro.ospiti} fino al {fmt.day(dentro.partenza)}
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">Libera</span>
                      {prossimo ? ` · arrivo ${fmt.day(prossimo.arrivo)}` : " · nessun arrivo"}
                    </>
                  )}
                </span>
                {aperti > 0 && <span className="text-[12px] text-warn">{aperti} {aperti === 1 ? "lavoro aperto" : "lavori aperti"}</span>}
              </button>
            );
          })}
        </div>
      </Rise>

      {/* ---------- calendario ---------- */}
      <Rise className="rounded-[14px] border border-line bg-surface p-5 max-[480px]:p-4" delay={0.1}>
        <CalendarioCase db={db} turni={d.turni} fmt={fmt} vai={vai} />
      </Rise>

      {/* ---------- al posto di ---------- */}
      <Rise className="grid gap-2 rounded-[14px] border border-dashed border-line px-5 py-4 min-[760px]:grid-cols-4" delay={0.15}>
        <div className="flex flex-col gap-0.5 min-[760px]:col-span-4">
          <Label>Cosa non ti serve più aprire</Label>
        </div>
        {[
          ["Il gruppo WhatsApp delle pulizie", "Turni, conferme, foto e il riepilogo delle 19 stanno in Pulizie."],
          ["L'Excel di fornitori e pagamenti", "Segnalazioni, preventivi, garanzie e pagamenti stanno in Manutenzione."],
          ["Le note su Wi-Fi, chiavi e contatori", "Stanno nella scheda di ogni casa, trovabili con la ricerca."],
          ["Il calendario da mandare a mano", "Arriva da Beddy e ai proprietari va il loro rendiconto."],
        ].map(([a, b]) => (
          <div key={a} className="flex flex-col gap-0.5">
            <span className="text-[13.5px] font-semibold line-through decoration-accent/60">{a}</span>
            <span className="text-[12.5px] text-muted">{b}</span>
          </div>
        ))}
      </Rise>
    </div>
  );
}

function Spedizione({ db, b, d, fmt, vai }) {
  const imm = db.immobili.find((i) => i.id === b.immobileId);
  const wifi = db.interventi.find((m) => m.immobileId === imm.id && /wi-fi/i.test(m.voce));
  const post = db.adempimenti.find((a) => a.immobileId === imm.id && /postazione/i.test(a.voce));
  const pul = d.turni.find((x) => x.immobileId === imm.id && x.data <= b.arrivo && x.data >= db.oggi && x.tipo === "partenza");
  const meta = d.turni.find((x) => x.immobileId === imm.id && x.tipo === "meta");
  const voci = [
    { ok: wifi?.stato === "chiuso", testo: "Wi-Fi in camera sopra i 20 Mbps", nota: wifi?.stato === "chiuso" ? "ripetitore installato" : `${imm.scheda.mbps.camera} Mbps oggi · ripetitore alle ${wifi?.ora ?? "—"}`, vai: { vista: "manutenzione", intervento: wifi?.id } },
    { ok: post?.stato === "ok", testo: "Postazione di lavoro: tavolo, sedia, luce, presa", nota: post?.stato === "ok" ? "pronta" : "da controllare", vai: { vista: "case", immobileId: imm.id, tab: "regola" } },
    { ok: pul?.stato === "verificato", testo: "Pulizia prima dell'arrivo", nota: pul ? `${fmt.day(pul.data)} · ${pul.addettoId ? addetta(db, pul.addettoId)?.nome : "da assegnare"} · ${pul.stato.replace("_", " ")}` : "—", vai: { vista: "pulizie", turno: pul?.id } },
    { ok: meta?.stato === "verificato", testo: "Cambio di metà soggiorno", nota: meta ? `${fmt.day(meta.data)} alle ${meta.dalle} · ${addetta(db, meta.addettoId)?.nome}` : "—", vai: { vista: "pulizie", turno: meta?.id } },
  ];
  const giorniMancano = giorniTra(db.oggi, b.arrivo);
  return (
    <section className="flex flex-col gap-2 rounded-[14px] border border-accent/30 bg-accent-soft/50 p-5 max-[480px]:p-4" aria-label="Arrivo della spedizione Vicus">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Label className="text-accent">Arriva Vicus · tra {giorniMancano} giorni</Label>
        <span className="text-[12px] text-muted">{b.id}</span>
      </div>
      <p className="m-0 text-[14px]">
        <strong>{imm.nome}</strong>, {fmt.fullDay(b.arrivo)} alle {b.orario}: {b.ospiti} ospiti per {giorniTra(b.arrivo, b.partenza)} notti, check-in di persona con te. Lavorano in casa, quindi Wi-Fi e postazione contano quanto la pulizia.
      </p>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {voci.map((v) => (
          <li key={v.testo}>
            <button type="button" onClick={() => vai(v.vai)} className="flex w-full cursor-pointer items-start gap-2 text-left">
              <span aria-hidden="true" className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-bold ${v.ok ? "bg-ok text-on-accent" : "border-2 border-warn"}`}>
                {v.ok ? "✓" : ""}
              </span>
              <span className="flex flex-col">
                <span className="text-[13.5px] font-medium">{v.testo}</span>
                <span className="text-[12px] text-muted">{v.nota}</span>
              </span>
              <span className="sr-only">{v.ok ? "fatto" : "da fare"}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CalendarioCase({ db, turni, fmt, vai, n = 14 }) {
  const days = giorni(db.oggi, n);
  return (
    <section className="flex flex-col gap-2" aria-label="Calendario delle case">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Label>Prossimi {n} giorni</Label>
        <span className="flex flex-wrap items-center gap-3 text-[12px] text-muted">
          {Object.entries(CANALE).map(([k, c]) => (
            <span key={k} className="inline-flex items-center gap-1">
              <span className={`inline-block size-2.5 rounded-sm ${c}`} aria-hidden="true" />
              {k}
            </span>
          ))}
          <span className="inline-flex items-center gap-1">
            <span className="inline-block size-2.5 rounded-full border-2 border-warn" aria-hidden="true" />
            pulizia
          </span>
        </span>
      </div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="min-w-[680px]" role="table" aria-label="Calendario delle case">
          <div className="grid grid-cols-[150px_repeat(14,minmax(0,1fr))] border-b border-line" role="row">
            <span role="columnheader" className="sr-only">
              Casa
            </span>
            <span aria-hidden="true" />
            {days.map((g) => (
              <span key={g} role="columnheader" className={`flex flex-col items-center py-1 text-[11px] leading-tight ${g === db.oggi ? "font-bold text-accent" : "text-muted"}`}>
                <span>{fmt.wd(g)}</span>
                <span className="text-[13px] tabular-nums">{fmt.dn(g)}</span>
              </span>
            ))}
          </div>
          {db.immobili.map((imm) => {
            const pren = db.prenotazioni.filter((b) => b.immobileId === imm.id && b.partenza > db.oggi && b.arrivo < piuGiorni(db.oggi, n));
            return (
              <div key={imm.id} role="row" className="relative grid h-11 grid-cols-[150px_repeat(14,minmax(0,1fr))] items-center border-b border-line last:border-b-0">
                <button type="button" role="rowheader" onClick={() => vai({ vista: "case", immobileId: imm.id })} className="cursor-pointer truncate pr-2 text-left text-[13px] font-semibold hover:text-accent" style={{ gridRow: 1, gridColumn: 1 }}>
                  {imm.nome}
                </button>
                {days.map((g, i) => (
                  <span key={g} aria-hidden="true" className={`h-full border-l border-line/60 ${g === db.oggi ? "bg-accent-soft/60" : ""}`} style={{ gridRow: 1, gridColumn: i + 2 }} />
                ))}
                {imm.chiusa && (
                  <span role="cell" className="mx-1 rounded-md bg-line/60 px-2 py-1 text-center text-[12px] font-semibold text-muted" style={{ gridRow: 1, gridColumn: `2 / ${n + 2}` }}>
                    Chiusa per l'inverno: finestra per i lavori
                  </span>
                )}
                {pren.map((b, k) => {
                  const da = Math.max(0, giorniTra(db.oggi, b.arrivo));
                  const a = Math.min(n, giorniTra(db.oggi, b.partenza));
                  return (
                    <motion.span
                      key={b.id}
                      role="cell"
                      title={`${b.id} · ${b.canale} · ${fmt.day(b.arrivo)}–${fmt.day(b.partenza)} · ${b.ospiti} ospiti`}
                      className={`relative z-[1] mx-[3px] flex h-7 items-center overflow-hidden rounded-md px-1.5 text-[11px] font-semibold whitespace-nowrap ${CANALE[b.canale]} ${giorniTra(db.oggi, b.arrivo) < 0 ? "rounded-l-none" : ""}`}
                      style={{ gridRow: 1, gridColumn: `${da + 2} / ${a + 2}`, originX: 0 }}
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      transition={{ duration: 0.45, ease: EASE, delay: 0.04 * k }}
                    >
                      {b.canale === "Vicus" ? "Vicus" : b.id} · {b.ospiti}
                    </motion.span>
                  );
                })}
                {turni
                  .filter((x) => x.immobileId === imm.id && x.data >= db.oggi && x.data < piuGiorni(db.oggi, n))
                  .map((x) => (
                    <button
                      key={`p-${x.id}`}
                      type="button"
                      onClick={() => vai({ vista: "pulizie", turno: x.id })}
                      aria-label={`Pulizia del ${fmt.day(x.data)}`}
                      className={`relative z-[2] size-3 cursor-pointer justify-self-start rounded-full border-2 bg-surface ${x.stato === "da_assegnare" ? "border-bad" : "border-warn"}`}
                      style={{ gridRow: 1, gridColumn: giorniTra(db.oggi, x.data) + 2, marginLeft: x.tipo === "partenza" ? -6 : 6 }}
                    />
                  ))}
              </div>
            );
          })}
        </div>
      </div>
      <Note>Le prenotazioni arrivano da Beddy e dai portali. Il cerchio è la pulizia: rosso se nessuno è ancora assegnato.</Note>
    </section>
  );
}
