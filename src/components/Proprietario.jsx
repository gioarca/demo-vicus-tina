import { AnimatePresence, motion } from "framer-motion";
import { EASE } from "../lib/formati.js";
import { problemiMandati } from "../lib/scadenze.js";
import { AnimatedNumber, Button, Chip, Label, Note, Rise } from "./ui.jsx";

/* =====================================================================
   VICUS — scheda del proprietario: rendiconto per immobile fino al
   netto reale, decisioni da approvare e registro delle decisioni.
   Il registro mette per iscritto cosa ha deciso il proprietario e cosa
   è costato: è la difesa del gestore quando le scelte vengono imposte.
   ===================================================================== */

const DECISIONE = { accettata: ["ok", "decAccepted"], rifiutata: ["bad", "decRefused"], in_attesa: ["warn", "decPending"] };

export function Proprietario({ db, prop, rend, onApprove, onOpenImm, t, fmt }) {
  const mandato = prop.mandato || {};
  const problemi = problemiMandati(db).filter((m) => m.p.id === prop.id);
  const ids = rend.righe.map((r) => r.imm.id);
  const daApprovare = db.interventi.filter((m) => ids.includes(m.immobileId) && m.stato === "attesa_ok");
  const decisioni = db.decisioni.filter((d) => d.proprietarioId === prop.id).sort((a, b) => b.data.localeCompare(a.data));
  const costoRifiuti = decisioni.filter((d) => d.decisione === "rifiutata" && d.impatto < 0).reduce((s, d) => s + d.impatto, 0);
  const T = rend.totale;

  const kpi = [
    { l: t("ownGross"), v: T.lordo, n: t("ownGrossNote", { n: rend.righe.length }) },
    { l: t("ownBefore"), v: T.primaImposte, n: t("ownBeforeNote") },
    { l: t("ownTax"), v: T.cedolare, n: t("ownTaxNote", { r: fmt.eur(T.ritenute), c: fmt.eur(T.conguaglio) }) },
    { l: t("ownReal"), v: T.nettoReale, n: t("ownRealNote", { c: fmt.eur(T.casa) }), tone: "text-accent" },
  ];

  const righe = [
    ["ownRowGross", (r) => r.ce.lordo, false],
    ["ownRowOta", (r) => -r.ce.ota, false],
    ["ownRowFee", (r) => -r.ce.fee, false],
    ["ownRowClean", (r) => -r.ce.pulizie, false],
    ["ownRowMaint", (r) => -r.ce.manutenzione, false],
    ["ownBefore", (r) => r.primaImposte, true],
    ["ownRowTax", (r) => (r.cedolare == null ? null : -r.cedolare), false],
    ["ownRowWithheld", (r) => r.ritenuteGestore + r.ritenutePortale, false, true],
    ["ownRowBalance", (r) => r.conguaglio, false, true],
    ["ownRowHouse", (r) => -r.casa, false],
    ["ownReal", (r) => r.nettoReale, true],
  ];
  const totale = (f) => rend.righe.reduce((s, r) => s + (f(r) ?? 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="m-0 font-display text-[28px] font-bold tracking-[-.015em] text-balance">{prop.nome}</h1>
          <div className="text-[13.5px] text-muted">
            {prop.residenza} · {rend.righe.length} {rend.righe.length === 1 ? t("property1") : t("propertyN")} · {t("season")} {db.gestore.stagione}
          </div>
        </div>
        <div className="flex flex-col gap-0.5 min-[640px]:items-end min-[640px]:text-right">
          <Label>{t("mandate")}</Label>
          <span className="text-[13px]">
            {mandato.firmato ? t("mandateSigned", { d: fmt.longDay(mandato.firmato) }) : t("mandateMissing")}
          </span>
          <span className="text-[12.5px] text-muted">{mandato.soglia != null ? t("mandateCap", { v: fmt.eur(mandato.soglia) }) : t("mandateNoCapShort")}</span>
        </div>
      </div>

      {problemi.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg bg-warn-soft px-3.5 py-2.5 text-[13.5px] text-warn" role="status">
          {problemi.map((m) => (
            <span key={m.k}>{t(m.k, { p: prop.nome, d: m.d ? fmt.longDay(m.d) : "" })}</span>
          ))}
        </div>
      )}

      <section aria-label={t("ownSummary")} className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line min-[900px]:grid-cols-4">
        {kpi.map((k, i) => (
          <motion.div key={k.l} className="flex min-w-0 flex-col gap-0.5 bg-bg px-3.5 py-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE, delay: 0.05 * i }}>
            <Label>{k.l}</Label>
            <AnimatedNumber value={k.v} format={fmt.eur} className={`font-display text-[22px] font-bold ${k.tone || ""}`} />
            <Note>{k.n}</Note>
          </motion.div>
        ))}
      </section>

      <Rise className="flex flex-col gap-2" delay={0.1}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label>{t("ownStatement")}</Label>
          <span className="text-[12px] text-muted">{t("ownStatementNote")}</span>
        </div>
        <div className="relative -mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[560px] border-collapse text-[13.5px] tabular-nums">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-2 text-left font-semibold text-muted">
                  <span className="sr-only">{t("ownItem")}</span>
                </th>
                {rend.righe.map((r) => (
                  <th key={r.imm.id} scope="col" className="py-2 pl-3 text-right font-semibold">
                    <button type="button" onClick={() => onOpenImm(r.imm.id)} className="cursor-pointer text-right underline decoration-line underline-offset-4 hover:decoration-accent">
                      {r.imm.nome}
                    </button>
                  </th>
                ))}
                <th scope="col" className="py-2 pl-3 text-right font-semibold">
                  {t("total")}
                </th>
              </tr>
            </thead>
            <tbody>
              {righe.map(([k, f, forte, info]) => (
                <tr key={k} className={`border-b border-line ${forte ? "bg-bg" : ""}`}>
                  <th scope="row" className={`py-2 pr-2 text-left align-top ${forte ? "font-bold" : "font-medium"}`}>
                    {t(k)}
                    {k === "ownRowWithheld" && <Note>{t("ownRowWithheldNote")}</Note>}
                    {k === "ownRowHouse" && <Note>{t("ownRowHouseNote")}</Note>}
                  </th>
                  {rend.righe.map((r) => {
                    const v = f(r);
                    return (
                      <td key={r.imm.id} className={`py-2 pl-3 text-right align-top font-mono whitespace-nowrap ${v == null ? "text-warn" : info ? "text-muted" : forte ? "font-bold" : v < 0 ? "text-muted" : ""} ${k === "ownReal" ? "text-accent" : ""}`}>
                        {v == null ? t("toVerify") : fmt.eur(v)}
                        {k === "ownRowTax" && r.aliquota != null && <Note className="font-sans">{fmt.pct(r.aliquota)}</Note>}
                      </td>
                    );
                  })}
                  <td className={`py-2 pl-3 text-right align-top font-mono whitespace-nowrap ${forte ? "font-bold" : info ? "text-muted" : ""} ${k === "ownReal" ? "text-accent" : ""}`}>{fmt.eur(totale(f))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {T.regimeAperto && <p className="m-0 text-[13px] text-warn">{t("ownRegimeOpen", { i: rend.righe.filter((r) => r.aliquota == null).map((r) => r.imm.nome).join(", ") })}</p>}
      </Rise>

      <Rise className="flex flex-col gap-2" delay={0.15}>
        <Label>{t("ownToApprove")}</Label>
        <AnimatePresence initial={false}>
          {daApprovare.length === 0 ? (
            <motion.p key="none" className="m-0 text-[13.5px] text-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {t("ownNothingToApprove")}
            </motion.p>
          ) : (
            daApprovare.map((m) => (
              <motion.div key={m.id} layout exit={{ opacity: 0, height: 0 }} className="flex flex-wrap items-center gap-3 rounded-lg border border-line px-3.5 py-2.5">
                <span className="flex min-w-[200px] flex-1 flex-col">
                  <span className="font-medium">{m.voce}</span>
                  <span className="text-[12.5px] text-muted">
                    {db.immobili.find((i) => i.id === m.immobileId)?.nome} · {m.fornitore} · {t("ownOverCap", { v: fmt.eur(db.parametri.sogliaAutorizzazione) })}
                  </span>
                </span>
                <span className="font-mono text-[13px]">{fmt.eur(m.costo)}</span>
                <Button onClick={() => onApprove(m.id)}>{t("approve")}</Button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </Rise>

      <Rise className="flex flex-col gap-2" delay={0.2}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label>{t("decLog")}</Label>
          <span className="text-[12px] text-muted">{t("decLogNote")}</span>
        </div>
        <ul className="m-0 flex list-none flex-col p-0">
          {decisioni.map((d) => {
            const [tono, chiave] = DECISIONE[d.decisione];
            return (
              <motion.li key={d.id} layout className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 border-b border-line py-3 last:border-b-0 min-[640px]:grid-cols-[92px_minmax(0,1fr)_auto]">
                <span className="text-[12.5px] text-muted tabular-nums">{fmt.day(d.data)}</span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">{d.tema}</span>
                  <span className="text-[13px] text-muted">
                    {t("decProposal")}: {d.proposta}
                    {d.esito ? ` · ${d.esito}` : ""}
                  </span>
                </span>
                <span className="col-start-2 flex items-center gap-2 min-[640px]:col-start-3 min-[640px]:flex-col min-[640px]:items-end">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span key={d.decisione} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}>
                      <Chip tone={tono}>{t(chiave)}</Chip>
                    </motion.span>
                  </AnimatePresence>
                  {d.impatto != null && <span className={`font-mono text-[13px] ${d.impatto < 0 ? "text-bad" : "text-ok"}`}>{d.impatto > 0 ? "+" : ""}{fmt.eur(d.impatto)}</span>}
                </span>
              </motion.li>
            );
          })}
        </ul>
        {costoRifiuti < 0 && <p className="m-0 text-[13.5px] font-semibold text-bad">{t("decCost", { v: fmt.eur(-costoRifiuti) })}</p>}
      </Rise>

      <Rise className="flex flex-col gap-1 rounded-xl border border-line bg-bg px-4 py-3" delay={0.25}>
        <Label>{t("ownDocs")}</Label>
        <span className="text-[13.5px]">{t("ownDocCu", { v: fmt.eur(T.ritenuteGestore), d: fmt.longDay("2027-03-16") })}</span>
        {rend.righe.some((r) => r.imm.profilo.nonResident) && <span className="text-[13.5px]">{t("ownDocNonRes")}</span>}
      </Rise>
    </div>
  );
}
