import { AnimatePresence, motion } from "framer-motion";
import { sum } from "../data/api.js";
import { EASE } from "../lib/formati.js";
import { statoProgramma } from "../lib/operativita.js";
import { AnimatedNumber, Button, Chip, Label, Note, Rise } from "./ui.jsx";

/* =====================================================================
   VICUS — manutenzione programmata (giardiniere, derattizzazione,
   caldaie, estintori…), scadenziario dei controlli e registro dei
   pagamenti ai fornitori. Registrare un controllo crea il pagamento.
   ===================================================================== */

const STATO = { scaduto: ["bad", "progLate"], da_programmare: ["bad", "progUnplanned"], in_arrivo: ["warn", "progSoon"], ok: ["ok", "progOk"] };
const ORDINE = { scaduto: 0, da_programmare: 1, in_arrivo: 2, ok: 3 };

export function Fornitori({ db, t, fmt, onRegistra, onPatch }) {
  const nome = (id) => db.immobili.find((i) => i.id === id)?.nome ?? t("manyHouses");
  const forn = (id) => db.fornitori.find((f) => f.id === id);
  const programmi = db.programmi
    .map((p) => ({ ...p, ...statoProgramma(p, db.oggi) }))
    .sort((a, b) => ORDINE[a.stato] - ORDINE[b.stato] || (a.prossima ?? "").localeCompare(b.prossima ?? ""));
  const aperti = db.pagamenti.filter((p) => p.stato !== "pagato").sort((a, b) => a.scadenza.localeCompare(b.scadenza));
  const pagati = db.pagamenti.filter((p) => p.stato === "pagato").sort((a, b) => b.scadenza.localeCompare(a.scadenza));
  const scaduti = aperti.filter((p) => p.scadenza < db.oggi);

  const tiles = [
    { l: t("progLateN"), v: programmi.filter((p) => p.stato === "scaduto" || p.stato === "da_programmare").length, tone: "text-bad" },
    { l: t("progSoonN"), v: programmi.filter((p) => p.stato === "in_arrivo").length, tone: "text-warn" },
    { l: t("payOpen"), v: sum(aperti.map((p) => p.importo)), f: fmt.eur },
    { l: t("payLate"), v: sum(scaduti.map((p) => p.importo)), f: fmt.eur, tone: scaduti.length ? "text-bad" : "text-ok" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line min-[760px]:grid-cols-4" aria-label={t("worksSummary")}>
        {tiles.map((k) => (
          <div key={k.l} className="flex flex-col gap-0.5 bg-bg px-3.5 py-3">
            <Label>{k.l}</Label>
            <AnimatedNumber value={k.v} format={k.f} className={`font-display text-[22px] font-bold ${k.tone || ""}`} />
          </div>
        ))}
      </section>

      <Rise className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label>{t("progTitle")}</Label>
          <span className="text-[12px] text-muted">{t("progNote")}</span>
        </div>
        <ul className="m-0 flex list-none flex-col p-0">
          {programmi.map((p) => {
            const [tono, chiave] = STATO[p.stato];
            return (
              <motion.li key={p.id} layout transition={{ layout: { type: "spring", stiffness: 420, damping: 36 } }} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line py-3 last:border-b-0">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={p.stato} className="w-[104px] shrink-0" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.15 }}>
                    <Chip tone={tono}>{t(chiave)}</Chip>
                  </motion.span>
                </AnimatePresence>
                <span className="flex min-w-[200px] flex-1 flex-col">
                  <span className="font-medium">
                    {p.voce}
                    {p.obbligo && <Chip tone="accent" className="ml-2 align-middle">{t("legalDuty")}</Chip>}
                  </span>
                  <span className="text-[12.5px] text-muted">
                    {nome(p.immobileId)} · {forn(p.fornitoreId)?.nome} · {t(p.ogniMesi === 1 ? "everyMonth" : "everyMonths", { n: p.ogniMesi })}
                    {p.fonte ? ` · ${p.fonte}` : ""}
                  </span>
                </span>
                <span className="flex flex-col items-end text-[12.5px] tabular-nums">
                  <span className={p.stato === "scaduto" ? "font-semibold text-bad" : ""}>{p.prossima ? fmt.dayY(p.prossima, db.oggi) : "—"}</span>
                  <span className="text-muted">{p.ultima ? t("progLast", { d: fmt.dayY(p.ultima, db.oggi) }) : t("progNever")}</span>
                </span>
                <span className="w-[64px] text-right font-mono text-[13px]">{fmt.eur(p.costo)}</span>
                <Button size="sm" variant={p.stato === "ok" ? "ghost" : "primary"} onClick={() => onRegistra(p.id)} disabled={p.ultima === db.oggi}>
                  {p.ultima === db.oggi ? t("progDoneToday") : t("progMarkDone")}
                </Button>
              </motion.li>
            );
          })}
        </ul>
      </Rise>

      <Rise className="flex flex-col gap-2" delay={0.08}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label>{t("payTitle")}</Label>
          <span className="text-[12px] text-muted">{t("payNote")}</span>
        </div>
        <ul className="m-0 flex list-none flex-col p-0">
          <AnimatePresence initial={false}>
            {[...aperti, ...pagati].map((p) => {
              const late = p.stato !== "pagato" && p.scadenza < db.oggi;
              return (
                <motion.li key={p.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE }} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line py-2.5 last:border-b-0">
                  <span className="w-[104px] shrink-0">
                    <Chip tone={p.stato === "pagato" ? "ok" : late ? "bad" : "warn"}>{t(p.stato === "pagato" ? "payPaid" : late ? "payLateChip" : "payDue")}</Chip>
                  </span>
                  <span className="flex min-w-[200px] flex-1 flex-col">
                    <span className={`font-medium ${p.stato === "pagato" ? "text-muted" : ""}`}>
                      {forn(p.fornitoreId)?.nome}: {p.voce}
                    </span>
                    <span className="text-[12.5px] text-muted">
                      {nome(p.immobileId)} · {p.immobileId ? t("payChargedOwner") : t("payPassThrough")} · {t(`method_${p.metodo}`)}
                    </span>
                  </span>
                  <span className={`text-[12.5px] tabular-nums ${late ? "font-semibold text-bad" : "text-muted"}`}>{fmt.day(p.scadenza)}</span>
                  <span className="w-[64px] text-right font-mono text-[13px]">{fmt.eur(p.importo)}</span>
                  {p.stato !== "pagato" ? (
                    <Button size="sm" onClick={() => onPatch("pagamenti", p.id, { stato: "pagato" })}>
                      {t("payMark")}
                    </Button>
                  ) : (
                    <span className="w-[84px]" aria-hidden="true" />
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </Rise>

    </div>
  );
}
