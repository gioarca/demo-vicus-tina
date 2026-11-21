import { motion } from "framer-motion";
import { FISCO_2026, tx } from "regole-affitti-brevi";
import { EASE } from "../lib/formati.js";
import { rendiconto } from "../lib/gestione.js";
import { AnimatedNumber, Button, Chip, Label, Note, Rise } from "./ui.jsx";

/* =====================================================================
   VICUS — fisco e costi del gestore. Previsionale di imposta e
   contributi sulle entrate reali (per cassa), calendario dei
   versamenti con quanto mettere da parte ogni mese, costi per tenere
   aperta l'attività, cedolare e ritenute dei proprietari.
   ===================================================================== */

const CATEGORIE = ["software", "servizi", "assicurazioni", "tasse", "operativi", "marketing"];

function Interruttore({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${checked ? "bg-accent" : "bg-line"}`}
      >
        <motion.span className="absolute size-4 rounded-full bg-surface shadow" initial={false} animate={{ x: checked ? 18 : 2 }} transition={{ type: "spring", stiffness: 600, damping: 34 }} />
      </button>
      <span className="flex flex-col">
        <span className="text-[13.5px] font-semibold">{label}</span>
        <span className="text-[12px] text-muted">{hint}</span>
      </span>
    </label>
  );
}

export function Fisco({ db, prev, entrate, costi, netto, onFiscale, onPatch, t, fmt, lang }) {
  const f = db.gestore.fiscale;
  const tot = entrate.totale;
  const barre = [
    { k: "incassate", v: entrate.incassate, c: "bg-accent", l: t("inCollected") },
    { k: "attese", v: entrate.attese, c: "bg-s2", l: t("inDue") },
    { k: "calendario", v: entrate.calendario, c: "bg-s1", l: t("inCalendar") },
  ];
  const sogliaTono = { ok: "bg-accent", vicina: "bg-warn", superata: "bg-bad", uscita: "bg-bad" }[prev.soglia.stato];
  const rend = db.proprietari.map((p) => ({ p, r: rendiconto(db, p.id) }));
  const riaddebito = costi.voci.filter((c) => c.riaddebito);
  const aCarico = costi.voci.filter((c) => !c.riaddebito).sort((a, b) => CATEGORIE.indexOf(a.categoria) - CATEGORIE.indexOf(b.categoria));

  return (
    <div className="flex flex-col gap-6">
      {/* ---------- profilo ---------- */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="m-0 font-display text-[26px] font-bold tracking-[-.015em]">{t("taxTitle", { y: prev.anno })}</h1>
          <span className="text-[13.5px] text-muted">
            {t("taxSubtitle", { n: db.gestore.nome, d: fmt.longDay(db.gestore.inizioAttivita) })}
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          <Interruttore checked={f.avvio} onChange={(v) => onFiscale({ avvio: v })} label={t("taxStartup")} hint={t("taxStartupHint")} />
          <Interruttore checked={f.riduzione} onChange={(v) => onFiscale({ riduzione: v })} label={t("taxReduction")} hint={t("taxReductionHint")} />
        </div>
      </section>

      {/* ---------- entrate ---------- */}
      <Rise className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label>{t("inTitle")}</Label>
          <span className="text-[12px] text-muted">{t("inCertain", { p: Math.round(entrate.quotaCerta * 100) })}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <AnimatedNumber value={tot} format={fmt.eur} className="font-display text-[30px] font-bold" />
          <span className="text-[13px] text-muted">{t("inTotalNote")}</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-line" role="img" aria-label={barre.map((b) => `${b.l} ${fmt.eur(b.v)}`).join(", ")}>
          {barre.map((b, i) => (
            <motion.span key={b.k} className={`h-full ${b.c}`} initial={{ width: 0 }} animate={{ width: `${(b.v / tot) * 100}%` }} transition={{ duration: 0.6, ease: EASE, delay: 0.08 * i }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
          {barre.map((b) => (
            <span key={b.k} className="inline-flex items-center gap-1.5">
              <span className={`inline-block size-2.5 rounded-sm ${b.c}`} aria-hidden="true" />
              {b.l} <span className="font-mono tabular-nums">{fmt.eur(b.v)}</span>
            </span>
          ))}
        </div>
        <Note>{t("inNextYear", { v: fmt.eur(entrate.annoDopo) })}</Note>
      </Rise>

      {/* ---------- calcolo ---------- */}
      <Rise className="grid gap-5 min-[880px]:grid-cols-[minmax(0,1fr)_300px]" delay={0.05}>
        <div className="flex min-w-0 flex-col gap-2">
          <Label>{t("calcTitle")}</Label>
          <table className="w-full border-collapse text-[13.5px] tabular-nums">
            <tbody>
              {prev.righe.map((r) => (
                <tr key={r.ateco} className="border-b border-line">
                  <th scope="row" className="py-2 pr-2 text-left align-top font-medium">
                    {tx(r.voce, lang)}
                    <Note>
                      ATECO {r.ateco} · {fmt.eur(r.importo)} × {fmt.pct(r.coeff)} {r.daVerificare && <Chip tone="warn" className="ml-1 align-middle">{t("toVerify")}</Chip>}
                    </Note>
                  </th>
                  <td className="py-2 pl-3 text-right align-top font-mono whitespace-nowrap">{fmt.eur(r.reddito)}</td>
                </tr>
              ))}
              <Riga l={t("calcIncome")} v={prev.reddito} fmt={fmt} forte />
              <Riga l={t("calcDeducted")} n={t("calcDeductedNote")} v={-prev.contributiDedotti} fmt={fmt} />
              <Riga l={t("calcTaxable")} v={prev.imponibile} fmt={fmt} />
              <Riga l={t("calcTax", { p: fmt.pct(prev.aliquota) })} v={prev.imposta} fmt={fmt} />
              <Riga l={t("calcInpsFixed")} n={t("calcInpsFixedNote", { r: fmt.eur2(prev.inps.rata) })} v={prev.inps.fissi} fmt={fmt} />
              <Riga l={t("calcInpsOver")} n={t("calcInpsOverNote", { m: fmt.eur(FISCO_2026.inps.minimale) })} v={prev.inps.eccedenza} fmt={fmt} />
              <tr>
                <th scope="row" className="pt-3 text-left align-top font-bold">
                  {t("calcTotal")}
                  <Note>{t("calcTotalNote", { p: fmt.pct(prev.carico / prev.ricavi) })}</Note>
                </th>
                <td className="pt-3 pl-3 text-right align-top font-mono text-[17px] font-bold whitespace-nowrap text-accent">
                  <AnimatedNumber value={prev.carico} format={fmt.eur} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-bg px-4 py-3">
            <Label>{t("capTitle")}</Label>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-[20px] font-bold tabular-nums">{fmt.pct(prev.soglia.quota)}</span>
              <span className="text-[12.5px] text-muted">{t("capLeft", { v: fmt.eur(prev.soglia.margine) })}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
              <motion.div className={`h-full rounded-full ${sogliaTono}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, prev.soglia.quota * 100)}%` }} transition={{ duration: 0.6, ease: EASE }} />
            </div>
            <Note>{t(`cap_${prev.soglia.stato}`)}</Note>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-line bg-bg px-4 py-3">
            <Label>{t("balanceTitle")}</Label>
            <span className="text-[13.5px]">{t("balanceTax", { v: fmt.eur(prev.saldoImposta) })}</span>
            <span className="text-[13.5px]">{t("balanceInps", { v: fmt.eur(prev.saldoInps) })}</span>
            <Note>{t("balanceNote")}</Note>
          </div>
        </div>
      </Rise>

      {/* ---------- calendario dei versamenti ---------- */}
      <Rise className="flex flex-col gap-2" delay={0.08}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col">
            <Label>{t("payCalTitle")}</Label>
            <span className="text-[12.5px] text-muted">{t("payCalNote", { v: fmt.eur(prev.totale12) })}</span>
          </div>
          <div className="flex flex-col items-end rounded-lg bg-accent-soft px-3 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-accent">{t("setAside")}</span>
            <span className="font-display text-[22px] font-bold text-accent tabular-nums">
              <AnimatedNumber value={prev.accantonamento} format={fmt.eur} />
              <span className="text-[13px] font-semibold"> {t("perMonth")}</span>
            </span>
          </div>
        </div>
        <ul className="m-0 flex list-none flex-col p-0">
          {prev.calendario.map((v) => (
            <motion.li key={v.id} layout className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line py-2 last:border-b-0">
              <span className="w-[92px] shrink-0 text-[12.5px] tabular-nums text-muted">
                {fmt.day(v.data)} {v.data.slice(0, 4)}
              </span>
              <span className="min-w-[200px] flex-1 text-[13.5px]">{v.fissato ? v.voce : t(`vers_${v.tipo}`, { r: v.rata ?? "", a: v.anno })}</span>
              {v.stima && <Chip tone="warn">{t("estimate")}</Chip>}
              <span className="w-[86px] text-right font-mono text-[13px]">{fmt.eur2(v.importo)}</span>
              {v.fissato && v.data <= db.oggi ? (
                <Button size="sm" onClick={() => onPatch("versamenti", v.id, { stato: "pagato" })}>
                  {t("payMark")}
                </Button>
              ) : (
                <span className="w-[84px]" aria-hidden="true" />
              )}
            </motion.li>
          ))}
        </ul>
        <Note>{t("payCalSource", { s: FISCO_2026.inps.fonte, d: fmt.longDay(FISCO_2026.verificato) })}</Note>
      </Rise>

      {/* ---------- costi d'esercizio ---------- */}
      <Rise className="grid gap-5 min-[880px]:grid-cols-[minmax(0,1fr)_300px]" delay={0.1}>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label>{t("costTitle")}</Label>
            <span className="text-[12px] text-muted">{t("costNote")}</span>
          </div>
          <table className="w-full border-collapse text-[13.5px] tabular-nums">
            <thead>
              <tr className="border-b border-line text-[12px] text-muted">
                <th scope="col" className="py-1.5 text-left font-semibold">{t("costItem")}</th>
                <th scope="col" className="py-1.5 pl-3 text-right font-semibold">{t("perMonthCol")}</th>
                <th scope="col" className="py-1.5 pl-3 text-right font-semibold">{t("perYear")}</th>
              </tr>
            </thead>
            <tbody>
              {aCarico.map((c) => (
                <tr key={c.id} className="border-b border-line">
                  <th scope="row" className="py-1.5 text-left font-medium">
                    {c.voce}
                    <Note>{t(`ccat_${c.categoria}`)}{c.calcolo === "quadra" ? ` · ${fmt.eur(db.parametri.prezzo.perCasa)} al mese per casa, senza quota base` : ""}</Note>
                  </th>
                  <td className="py-1.5 pl-3 text-right font-mono text-muted">{fmt.eur(c.annuo / 12)}</td>
                  <td className="py-1.5 pl-3 text-right font-mono">{fmt.eur(c.annuo)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <th scope="row" className="pt-2 text-left">{t("costTotal")}</th>
                <td className="pt-2 pl-3 text-right font-mono">{fmt.eur(costi.aCarico / 12)}</td>
                <td className="pt-2 pl-3 text-right font-mono">{fmt.eur(costi.aCarico)}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-2 flex flex-col gap-1 rounded-lg border border-dashed border-line px-3.5 py-2.5">
            <span className="text-[13px] font-semibold">{t("passTitle")}</span>
            {riaddebito.map((c) => (
              <span key={c.id} className="flex justify-between gap-2 text-[13px]">
                <span>{c.voce}</span>
                <span className="font-mono tabular-nums text-muted">{fmt.eur(c.annuo)}</span>
              </span>
            ))}
            <span className="flex justify-between gap-2 border-t border-line pt-1 text-[13px]">
              <span>{t("passCharged")}</span>
              <span className={`font-mono tabular-nums ${costi.differenza < 0 ? "text-bad" : "text-ok"}`}>
                {fmt.eur(costi.addebitatiProprietari)} ({costi.differenza >= 0 ? "+" : ""}{fmt.eur(costi.differenza)})
              </span>
            </span>
            <Note>{t("passNote")}</Note>
          </div>
        </div>

        <motion.section
          aria-label={t("netTitle")}
          className="flex h-fit flex-col gap-2 rounded-xl bg-accent px-4 py-4 text-on-accent"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.2 }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[.08em] opacity-80">{t("netTitle")}</span>
          {[
            [t("netIn"), entrate.totale],
            [t("netTaxes"), -prev.carico],
            [t("netCosts"), -costi.aCarico],
          ].map(([l, v]) => (
            <span key={l} className="flex justify-between gap-2 text-[13.5px]">
              <span className="opacity-90">{l}</span>
              <span className="font-mono tabular-nums">{fmt.eur(v)}</span>
            </span>
          ))}
          <span className="flex items-baseline justify-between gap-2 border-t border-on-accent/30 pt-2">
            <span className="text-[14px] font-semibold">{t("netLeft")}</span>
            <AnimatedNumber value={netto.netto} format={fmt.eur} className="font-display text-[24px] font-bold" />
          </span>
          <span className="text-[12.5px] opacity-85">{t("netMonth", { v: fmt.eur(netto.mese), p: Math.round(netto.quota * 100) })}</span>
        </motion.section>
      </Rise>

      {/* ---------- proprietari ---------- */}
      <Rise className="flex flex-col gap-2" delay={0.12}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label>{t("ownTaxTitle")}</Label>
          <span className="text-[12px] text-muted">{t("ownTaxNote2")}</span>
        </div>
        <div className="relative -mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[620px] border-collapse text-[13.5px] tabular-nums">
            <thead>
              <tr className="border-b border-line text-[12px] text-muted">
                <th scope="col" className="py-1.5 text-left font-semibold">{t("properties")}</th>
                <th scope="col" className="py-1.5 pl-3 text-right font-semibold">{t("rate")}</th>
                <th scope="col" className="py-1.5 pl-3 text-right font-semibold">{t("ownRowTax")}</th>
                <th scope="col" className="py-1.5 pl-3 text-right font-semibold">{t("withheldByYou")}</th>
                <th scope="col" className="py-1.5 pl-3 text-right font-semibold">{t("withheldByPortal")}</th>
                <th scope="col" className="py-1.5 pl-3 text-right font-semibold">{t("ownRowBalance")}</th>
              </tr>
            </thead>
            <tbody>
              {rend.flatMap(({ p, r }) =>
                r.righe.map((x) => (
                  <tr key={x.imm.id} className="border-b border-line">
                    <th scope="row" className="py-1.5 text-left font-medium">
                      {x.imm.nome}
                      <Note>{p.nome}</Note>
                    </th>
                    <td className="py-1.5 pl-3 text-right font-mono">{x.aliquota == null ? <Chip tone="warn">{t("toVerify")}</Chip> : fmt.pct(x.aliquota)}</td>
                    <td className="py-1.5 pl-3 text-right font-mono">{x.cedolare == null ? "—" : fmt.eur(x.cedolare)}</td>
                    <td className="py-1.5 pl-3 text-right font-mono">{fmt.eur(x.ritenuteGestore)}</td>
                    <td className="py-1.5 pl-3 text-right font-mono text-muted">{fmt.eur(x.ritenutePortale)}</td>
                    <td className={`py-1.5 pl-3 text-right font-mono ${x.conguaglio > 0 ? "text-warn" : ""}`}>{x.conguaglio == null ? "—" : fmt.eur(x.conguaglio)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
        <Note>{t("ownTaxFooter")}</Note>
      </Rise>

      <p className="m-0 max-w-[75ch] text-[12.5px] text-muted">{t("taxDisclaimer", { f: FISCO_2026.forfettario.fonte, c: FISCO_2026.cedolare.fonte })}</p>
    </div>
  );
}

function Riga({ l, n, v, fmt, forte }) {
  return (
    <tr className="border-b border-line">
      <th scope="row" className={`py-2 pr-2 text-left align-top ${forte ? "font-bold" : "font-medium"}`}>
        {l}
        {n && <Note>{n}</Note>}
      </th>
      <td className={`py-2 pl-3 text-right align-top font-mono whitespace-nowrap ${forte ? "font-bold" : v < 0 ? "text-muted" : ""}`}>{fmt.eur(v)}</td>
    </tr>
  );
}
