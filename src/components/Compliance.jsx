import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { AREE_GESTORE, FORMS, adempimentiGestore, statoPiano, tx } from "regole-affitti-brevi";
import { profiloCompleto } from "../data/api.js";
import { EASE } from "../lib/formati.js";
import { giorniTra, piuMesi } from "../lib/operativita.js";
import { fineExposure } from "../lib/value.js";
import { Button, Chip, Label, Note, Progress, Rise } from "./ui.jsx";

/* =====================================================================
   VICUS — compliance in un posto solo: scadenziario unico, obblighi
   del gestore come attività, imposta di soggiorno per Comune, stato
   di ogni immobile. Le regole arrivano dal motore condiviso.
   ===================================================================== */

const STATO = { ok: ["ok", "taskDone"], da_fare: ["warn", "taskTodo"], critico: ["bad", "taskBlocking"] };
const FASE = { scaduto: ["bad", "dueLate"], critico: ["bad", "taskBlocking"], oggi: ["bad", "dueToday"], presto: ["warn", "dueSoon"], ok: ["accent", "dueLater"] };
// voci il cui stato si legge dai dati: non si segnano a mano
const CALCOLATE = new Set(["g-inps", "g-alloggiati", "g-soggiorno", "g-contanti", "g-forf", "g-mandato"]);

const titolo = (x, t) => (typeof x === "string" ? x : t(x.k, x.v));

export function Compliance({ db, scad, sg, onVai, onPatch, onPatchVoce, t, fmt, lang }) {
  const [aperta, setAperta] = useState(null);
  const [tutte, setTutte] = useState(false);
  const voci = adempimentiGestore(db.gestore.profilo);
  const inRegola = voci.filter((v) => sg[v.id]?.stato === "ok").length;
  const urgenti = scad.filter((x) => x.stato === "scaduto" || x.stato === "critico" || x.stato === "oggi");
  const settimana = scad.filter((x) => x.stato === "presto");
  const visibili = tutte ? scad : scad.slice(0, 12);
  const quando = (d) => {
    const g = giorniTra(db.oggi, d);
    return g < 0 ? t("daysLate", { n: -g }) : g === 0 ? t("today") : g === 1 ? t("tomorrow") : t("inDays", { n: g });
  };

  const tiles = [
    { l: t("cmpUrgent"), v: urgenti.length, tone: urgenti.length ? "text-bad" : "text-ok" },
    { l: t("cmpWeek"), v: settimana.length, tone: settimana.length ? "text-warn" : "" },
    { l: t("cmpWindow"), v: scad.length, tone: "" },
    { l: t("cmpManager"), v: `${inRegola}/${voci.length}`, tone: inRegola === voci.length ? "text-ok" : "" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 font-display text-[26px] font-bold tracking-[-.015em]">{t("cmpTitle")}</h1>
        <span className="max-w-[70ch] text-[13.5px] text-muted">{t("cmpIntro")}</span>
      </div>

      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line min-[760px]:grid-cols-4" aria-label={t("cmpTitle")}>
        {tiles.map((k) => (
          <div key={k.l} className="flex flex-col gap-0.5 bg-bg px-3.5 py-3">
            <Label>{k.l}</Label>
            <span className={`font-display text-[22px] font-bold tabular-nums ${k.tone}`}>{k.v}</span>
          </div>
        ))}
      </section>

      {/* ---------- scadenziario unico ---------- */}
      <Rise className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label>{t("dlTitle")}</Label>
          <span className="text-[12px] text-muted">{t("dlNote")}</span>
        </div>
        <ul className="m-0 flex list-none flex-col p-0">
          <AnimatePresence initial={false}>
            {visibili.map((x) => {
              const [tono, chiave] = FASE[x.stato];
              return (
                <motion.li
                  key={x.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="grid grid-cols-[86px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-line py-2.5 last:border-b-0"
                >
                  <span className="flex flex-col text-[12.5px] leading-tight tabular-nums">
                    <span className="font-semibold">{fmt.dayY(x.data, db.oggi)}</span>
                    <span className={x.stato === "scaduto" ? "text-bad" : "text-muted"}>{quando(x.data)}</span>
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[13.5px] font-medium">{titolo(x.titolo, t)}</span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Chip tone={tono}>{t(chiave)}</Chip>
                      <span className="text-[12px] text-muted">{t(`area_${x.area}`)}</span>
                      {x.bloccante && <Chip tone="bad">{t("blockingTag")}</Chip>}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    {x.importo != null && <span className="font-mono text-[13px] tabular-nums">{fmt.eur2(x.importo)}</span>}
                    {x.vai && (
                      <button type="button" onClick={() => onVai(x.vai)} className="cursor-pointer text-[12.5px] font-semibold text-accent hover:underline">
                        {t("open")} →
                      </button>
                    )}
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
        {scad.length > 12 && (
          <Button variant="ghost" size="sm" className="self-start" onClick={() => setTutte(!tutte)} aria-expanded={tutte}>
            {tutte ? t("showLess") : t("showAll", { n: scad.length })}
          </Button>
        )}
      </Rise>

      {/* ---------- obblighi del gestore ---------- */}
      <Rise className="flex flex-col gap-3" delay={0.06}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label>{t("mgrTitle", { n: db.gestore.nome })}</Label>
          <span className="text-[12px] text-muted">{t("mgrNote")}</span>
        </div>
        {AREE_GESTORE.map((area) => {
          const lista = voci.filter((v) => v.area === area);
          if (!lista.length) return null;
          return (
            <div key={area} className="flex flex-col">
              <span className="border-b border-line pb-1 text-[12.5px] font-semibold text-muted">{t(`area_${area}`)}</span>
              {lista.map((v) => {
                const s = sg[v.id] || { stato: "da_fare" };
                const [tono, chiave] = STATO[s.stato];
                const esp = aperta === v.id;
                const nota = s.nota ? (typeof s.nota === "string" ? s.nota : t(s.nota.k, s.nota.v)) : null;
                return (
                  <div key={v.id} className="border-b border-line py-2.5 last:border-b-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span key={s.stato} className="w-[86px] shrink-0" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.15 }}>
                          <Chip tone={tono}>{t(chiave)}</Chip>
                        </motion.span>
                      </AnimatePresence>
                      <button type="button" aria-expanded={esp} onClick={() => setAperta(esp ? null : v.id)} className="flex min-w-[200px] flex-1 cursor-pointer flex-col text-left">
                        <span className="flex flex-wrap items-center gap-1.5 font-medium">
                          {tx(v.title, lang)}
                          {v.daVerificare && <Chip tone="warn">{t("toVerify")}</Chip>}
                          {!v.obbligo && <Chip tone="accent">{t("advised")}</Chip>}
                        </span>
                        {nota && <span className="text-[12.5px] text-muted">{nota}</span>}
                        {v.id === "g-mandato" &&
                          s.problemi?.map((m) => (
                            <span key={`${m.p.id}-${m.k}`} className="text-[12.5px] text-warn">
                              {t(m.k, { p: m.p.nome, d: m.d ? fmt.longDay(m.d) : "" })}
                            </span>
                          ))}
                      </button>
                      <span className="flex flex-col items-end text-[12.5px] tabular-nums">
                        {s.prossima && <span>{t(s.stato === "ok" ? "nextOn" : "due", { d: fmt.dayY(s.prossima, db.oggi) })}</span>}
                        {s.importo != null && <span className="font-mono">{fmt.eur2(s.importo)}</span>}
                        <span className="text-muted">{t(v.who === "pm" ? "whoPm" : "whoAccountant")}</span>
                      </span>
                      {!CALCOLATE.has(v.id) &&
                        (s.stato !== "ok" ? (
                          <Button size="sm" onClick={() => onPatchVoce("complianceGestore", v.id, { stato: "ok" })}>
                            {t("markDone")}
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => onPatchVoce("complianceGestore", v.id, { stato: "da_fare" })}>
                            {t("reopen")}
                          </Button>
                        ))}
                    </div>
                    <AnimatePresence initial={false}>
                      {esp && (
                        <motion.div className="overflow-hidden pl-[98px] max-[640px]:pl-0" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: EASE }}>
                          <p className="m-0 pt-1.5 text-[13px] text-ink/85">{tx(v.detail, lang)}</p>
                          {v.source && <Note>{t("source")}: {v.source}</Note>}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          );
        })}
      </Rise>

      {/* ---------- imposta di soggiorno per Comune ---------- */}
      <Rise className="flex flex-col gap-2" delay={0.1}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label>{t("taxByTown")}</Label>
          <span className="text-[12px] text-muted">{t("taxByTownNote")}</span>
        </div>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-2 p-0">
          {db.comuni.map((c) => (
            <motion.li key={c.nome} layout className="flex flex-col gap-1 rounded-lg border border-line px-3 py-2.5">
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold">{c.nome}</span>
                <Chip tone={c.stato === "ok" ? "ok" : "warn"}>{t(c.stato === "ok" ? "taxPaidOver" : "taxToPay")}</Chip>
              </span>
              <span className="text-[12.5px] text-muted">
                {t(`period_${c.periodicita}`)} · {t("nextPayover", { d: fmt.dayY(c.prossima, db.oggi) })}
              </span>
              {c.stato !== "ok" && (
                <Button size="sm" className="self-start" onClick={() => onPatch("comuni", c.nome, { stato: "ok", prossima: piuMesi(c.prossima, c.periodicita === "mensile" ? 1 : 3) })}>
                  {t("taxMarkPaid")}
                </Button>
              )}
            </motion.li>
          ))}
        </ul>
      </Rise>

      {/* ---------- immobili ---------- */}
      <Rise className="flex flex-col gap-2" delay={0.14}>
        <Label>{t("cmpProperties")}</Label>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2">
          {db.immobili.map((imm) => {
            const prof = profiloCompleto(db, imm);
            const done = db.avvio[imm.id] || {};
            const sp = statoPiano(prof, done);
            const esp = fineExposure(prof, done);
            const aperti = db.adempimenti.filter((a) => a.immobileId === imm.id && a.stato !== "ok").length;
            return (
              <div key={imm.id} className="flex flex-col gap-1.5 rounded-lg border border-line px-3 py-2.5">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{imm.nome}</span>
                  <span className={`font-mono text-[11.5px] ${imm.cin ? "text-muted" : "text-bad"}`}>{imm.cin ? "CIN ✓" : t("noCin")}</span>
                </span>
                <span className="text-[12.5px] text-muted">
                  {tx(FORMS[sp.decisione.form].label, lang)} · {t("progress", { a: sp.completati, b: sp.passi.length })}
                </span>
                <Progress value={sp.completati} max={sp.passi.length} />
                <span className="text-[12.5px]">
                  {aperti === 1 ? t("openTask") : aperti ? t("openTasks", { n: aperti }) : t("noOpenTasks")}
                  {esp.items.length > 0 && <span className="text-bad"> · {t("exposure", { a: fmt.eur(esp.min), b: fmt.eur(esp.max) })}</span>}
                </span>
                <Button size="sm" variant="ghost" className="self-start" onClick={() => onVai({ vista: "portafoglio", immobileId: imm.id, tab: "setup" })}>
                  {t("openSetup")}
                </Button>
              </div>
            );
          })}
        </div>
      </Rise>
    </div>
  );
}
