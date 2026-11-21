import { motion } from "framer-motion";
import { EASE } from "../lib/formati.js";
import { AnimatedNumber, Label, Note } from "./ui.jsx";

/* =====================================================================
   VICUS — scheda "Conto economico": ricavi per mese, voci di costo,
   netto al proprietario e riquadro "Valore in gioco".
   ===================================================================== */

const FINE = { cin: "valFineCin", display: "valFineDisplay", safety: "valFineSafety", scia: "valFineScia" };

export function Conto({ imm, ce, par, t, fmt, months, valore }) {
  if (!ce.lordo) {
    return (
      <div className="flex flex-col gap-4">
        <Valore v={valore} par={par} t={t} fmt={fmt} operating={false} />
        <p className="m-0 py-6 text-muted">{t("noBookings")}</p>
      </div>
    );
  }
  const max = Math.max(...imm.ricaviMese);
  const step = max > 10000 ? 5000 : 2500;
  const top = Math.ceil(max / step) * step;
  const righe = [
    [t("rowGross"), ce.lordo, t("rowGrossNote", { n: ce.notti })],
    [t("rowOta"), -ce.ota, t("rowOtaNote", { p: fmt.pct(par.commissioneOta) })],
    [t("rowFee"), -ce.fee, fmt.pct(par.feeGestione)],
    [t("rowCleaning"), -ce.pulizie, t("rowCleaningNote", { n: imm.soggiorni })],
    [t("rowMaint"), -ce.manutenzione, t("rowMaintNote")],
    ce.cedolare != null ? [t("rowTax"), -ce.cedolare, t("rowTaxNote", { p: fmt.pct(ce.aliquota) })] : [t("rowTaxNone"), null, t("rowTaxNoneNote")],
  ];

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-2.5" role="img" aria-label={t("chartTitle")}>
        <div className="flex items-baseline justify-between gap-2">
          <Label>{t("chartTitle")}</Label>
          <span className="text-[12px] tabular-nums text-muted">{t("chartScale", { v: fmt.eur(top) })}</span>
        </div>
        <div className="grid h-[170px] grid-cols-7 gap-2">
          {imm.ricaviMese.map((v, i) => (
            <div key={i} className="flex min-w-0 flex-col items-center gap-1">
              <motion.span className="text-[11.5px] tabular-nums text-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.04 }}>
                {fmt.k(v)}
              </motion.span>
              <div className="flex w-full flex-1 items-end bg-[linear-gradient(var(--q-line),var(--q-line))] bg-bottom bg-no-repeat [background-size:100%_1px]">
                <motion.div
                  className="min-h-0.5 w-full rounded-t bg-accent"
                  initial={{ height: 0 }}
                  animate={{ height: `${(v / top) * 100}%` }}
                  transition={{ duration: 0.6, ease: EASE, delay: i * 0.045 }}
                  title={`${months[i]} · ${fmt.eur(v)}`}
                />
              </div>
              <span className="text-[12px] text-muted">{months[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <table className="w-full border-collapse tabular-nums">
        <tbody>
          {righe.map(([l, v, n], i) => (
            <motion.tr key={l} className="border-b border-line" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: EASE, delay: 0.15 + i * 0.04 }}>
              <th scope="row" className="py-2.5 text-left align-top font-medium">
                {l}
                <Note>{n}</Note>
              </th>
              <td className={`py-2.5 pl-3 text-right align-top font-mono text-[14px] whitespace-nowrap ${v == null ? "text-bad" : v < 0 ? "text-muted" : ""}`}>{v == null ? "—" : fmt.eur(v)}</td>
            </motion.tr>
          ))}
          <tr>
            <th scope="row" className="pt-3.5 text-left align-top font-bold">
              {t("rowNet")}
              <Note>{t("rowNetNote", { p: fmt.pct(ce.netto / ce.lordo) })}</Note>
            </th>
            <td className="pt-3.5 pl-3 text-right align-top font-mono text-[17px] font-bold whitespace-nowrap text-accent">
              <AnimatedNumber value={ce.netto} format={fmt.eur} />
            </td>
          </tr>
        </tbody>
      </table>

      <p className="m-0 text-[13.5px] text-muted">{t("touristTax", { v: fmt.eur(ce.soggiorno), c: imm.comune })}</p>
      <Valore v={valore} par={par} t={t} fmt={fmt} taxKnown={ce.cedolare != null} />
    </div>
  );
}

function Valore({ v, par, t, fmt, operating = true, taxKnown = true }) {
  const exposed = v.esposizione.items.length > 0;
  const voci = [
    v.nettoInPiu > 0 && {
      key: "upside",
      n: <>+<AnimatedNumber value={v.nettoInPiu} format={fmt.eur} /></>,
      tone: "text-ok",
      l: t("valUpside"),
      note: `${t("valUpsideNote", { v: fmt.eur(v.lordoInPiu) })}${taxKnown ? "" : ` · ${t("valBeforeTax")}`}`,
    },
    {
      key: "exposure",
      n: exposed ? `${fmt.eur(v.esposizione.min)}–${fmt.eur(v.esposizione.max)}` : fmt.eur(0),
      tone: exposed ? "text-bad" : "text-ok",
      l: t(operating ? "valExposure" : "valExposureIfOpen"),
      note: exposed ? v.esposizione.items.map((k) => t(FINE[k])).join(" · ") : t("valExposureNone"),
    },
    par.prezzo.mostra && {
      key: "cost",
      n: <AnimatedNumber value={v.costo} format={fmt.eur} />,
      tone: "",
      l: t("valCost"),
      note: t("valCostNote", { p: fmt.pct(par.prezzo.pctLordo), m: fmt.eur(par.prezzo.minMese) }),
    },
  ].filter(Boolean);

  return (
    <motion.section
      aria-label={t("valTitle")}
      className="flex flex-col gap-3 rounded-xl border border-line bg-bg px-4 py-3.5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE, delay: 0.3 }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <Label>{t("valTitle")}</Label>
        <span className="rounded-full bg-warn-soft px-2 py-px text-[11.5px] font-semibold text-warn">{t("valEstimate")}</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-x-5 gap-y-3.5">
        {voci.map((x, i) => (
          <motion.div key={x.key} className="flex min-w-0 flex-col gap-px" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE, delay: 0.4 + i * 0.07 }}>
            <div className={`font-display text-[22px] font-bold tracking-[-.01em] tabular-nums ${x.tone}`}>{x.n}</div>
            <div className="text-[13.5px] font-semibold">{x.l}</div>
            <Note>{x.note}</Note>
          </motion.div>
        ))}
      </div>
      {par.prezzo.mostra && v.multiplo && v.multiplo >= 1.5 && (
        <motion.p
          className="m-0 border-t border-line pt-2.5 text-[14px] font-semibold text-accent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {t("valMultiple", { x: fmt.x(v.multiplo) })}
        </motion.p>
      )}
    </motion.section>
  );
}
