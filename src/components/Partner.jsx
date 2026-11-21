import { AnimatePresence, motion } from "framer-motion";
import { FISCO_2026 } from "regole-affitti-brevi";
import { sum } from "../data/api.js";
import { EASE } from "../lib/formati.js";
import { entrateGestore, incassiDiretti } from "../lib/gestione.js";
import { AnimatedNumber, Button, Chip, Label, Note, Rise } from "./ui.jsx";

/* =====================================================================
   VICUS — incassi diretti dagli ospiti (carta, contanti, bonifico)
   con il controllo del limite dei contanti, e registro dei partner:
   transfer, taxi, escursioni, noleggi, con le commissioni.
   ===================================================================== */

const CONTROLLO = { ok: ["ok", "cashOkChip"], attenzione: ["warn", "cashNear"], vietato: ["bad", "cashNo"] };
const COMMISSIONE = { incassata: ["ok", "commPaid"], fatturata: ["warn", "commInvoiced"], da_fatturare: ["bad", "commToInvoice"] };

export function Partner({ db, t, fmt, onPatch }) {
  const nome = (id) => db.immobili.find((i) => i.id === id)?.nome ?? "";
  const incassi = incassiDiretti(db);
  const perMetodo = ["carta", "contanti", "bonifico"].map((m) => ({ m, v: sum(incassi.filter((b) => b.pagamento.metodo === m).map((b) => b.lordo)) }));
  const { servizi } = entrateGestore(db);
  const perPartner = db.partner.map((p) => {
    const s = servizi.filter((x) => x.partnerId === p.id);
    return {
      ...p,
      venduto: sum(s.map((x) => x.venduto)),
      incassate: sum(s.filter((x) => x.stato === "incassata").map((x) => x.commissione)),
      aperte: sum(s.filter((x) => x.stato !== "incassata").map((x) => x.commissione)),
      contanti: sum(s.filter((x) => x.metodoOspite === "contanti").map((x) => x.venduto)),
    };
  });
  const aperte = servizi.filter((x) => x.stato !== "incassata");
  const tot = (k) => sum(perPartner.map((p) => p[k]));

  return (
    <div className="flex flex-col gap-5">
      <Rise className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label>{t("directTitle")}</Label>
          <span className="text-[12px] text-muted">{t("directNote", { v: fmt.eur(FISCO_2026.contanti.limite) })}</span>
        </div>
        <ul className="m-0 flex list-none flex-col p-0">
          {incassi.map((b) => {
            const [tono, chiave] = CONTROLLO[b.controllo];
            return (
              <motion.li key={b.id} layout className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="flex min-w-[200px] flex-1 flex-col">
                    <span className="font-medium">
                      {nome(b.immobileId)} <span className="font-normal text-muted">· {b.id}</span>
                    </span>
                    <span className="text-[12.5px] text-muted">
                      {fmt.day(b.arrivo)}–{fmt.day(b.partenza)} · {b.ospiti} {t("guests")} · {t(`payState_${b.pagamento.stato}`)}
                    </span>
                  </span>
                  <Chip tone="accent">{t(`method_${b.pagamento.metodo}`)}</Chip>
                  {b.pagamento.metodo === "contanti" && <Chip tone={tono}>{t(chiave)}</Chip>}
                  <span className="w-[72px] text-right font-mono text-[13px]">{fmt.eur(b.lordo)}</span>
                </div>
                <AnimatePresence initial={false}>
                  {b.controllo === "vietato" && (
                    <motion.div
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bad-soft px-3.5 py-2.5"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                    >
                      <span className="min-w-[200px] flex-1 text-[13px] text-bad">{t("cashBlockedText", { v: fmt.eur(b.lordo), l: fmt.eur(FISCO_2026.contanti.limite) })}</span>
                      <Button size="sm" onClick={() => onPatch("prenotazioni", b.id, { pagamento: { metodo: "bonifico", stato: "richiesto" } })}>
                        {t("cashAskTransfer")}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
          {perMetodo.map(({ m, v }) => (
            <span key={m}>
              <span className="text-muted">{t(`method_${m}`)}:</span> <span className="font-mono tabular-nums">{fmt.eur(v)}</span>
            </span>
          ))}
        </div>
      </Rise>

      <Rise className="flex flex-col gap-2" delay={0.08}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Label>{t("partnersTitle")}</Label>
          <span className="text-[12px] text-muted">{t("partnersNote")}</span>
        </div>
        <div className="relative -mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[560px] border-collapse text-[13.5px] tabular-nums">
            <thead>
              <tr className="border-b border-line text-[12px] text-muted">
                <th scope="col" className="py-2 text-left font-semibold">{t("partner")}</th>
                <th scope="col" className="py-2 pl-3 text-right font-semibold">{t("commRate")}</th>
                <th scope="col" className="py-2 pl-3 text-right font-semibold">{t("sold")}</th>
                <th scope="col" className="py-2 pl-3 text-right font-semibold">{t("guestCash")}</th>
                <th scope="col" className="py-2 pl-3 text-right font-semibold">{t("commPaidCol")}</th>
                <th scope="col" className="py-2 pl-3 text-right font-semibold">{t("commOpenCol")}</th>
              </tr>
            </thead>
            <tbody>
              {perPartner.map((p) => (
                <tr key={p.id} className="border-b border-line">
                  <th scope="row" className="py-2 text-left font-medium">
                    {p.nome}
                    <Note>{t(`ptype_${p.tipo}`)}</Note>
                  </th>
                  <td className="py-2 pl-3 text-right font-mono">{fmt.pct(p.commissione)}</td>
                  <td className="py-2 pl-3 text-right font-mono">{fmt.eur(p.venduto)}</td>
                  <td className="py-2 pl-3 text-right font-mono text-muted">{fmt.eur(p.contanti)}</td>
                  <td className="py-2 pl-3 text-right font-mono">{fmt.eur(p.incassate)}</td>
                  <td className={`py-2 pl-3 text-right font-mono ${p.aperte ? "text-warn" : "text-muted"}`}>{fmt.eur(p.aperte)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <th scope="row" className="pt-2.5 text-left">{t("total")}</th>
                <td />
                <td className="pt-2.5 pl-3 text-right font-mono">{fmt.eur(tot("venduto"))}</td>
                <td className="pt-2.5 pl-3 text-right font-mono">{fmt.eur(tot("contanti"))}</td>
                <td className="pt-2.5 pl-3 text-right font-mono">
                  <AnimatedNumber value={tot("incassate")} format={fmt.eur} />
                </td>
                <td className="pt-2.5 pl-3 text-right font-mono">
                  <AnimatedNumber value={tot("aperte")} format={fmt.eur} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Note>{t("partnersTax")}</Note>
      </Rise>

      <Rise className="flex flex-col gap-2" delay={0.12}>
        <Label>{t("commOpenTitle")}</Label>
        {aperte.length === 0 && <p className="m-0 text-[13.5px] text-muted">{t("commNone")}</p>}
        <ul className="m-0 flex list-none flex-col p-0">
          <AnimatePresence initial={false}>
            {aperte.map((s) => {
              const [tono, chiave] = COMMISSIONE[s.stato];
              const p = db.partner.find((x) => x.id === s.partnerId);
              return (
                <motion.li key={s.id} layout exit={{ opacity: 0, height: 0 }} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line py-2.5 last:border-b-0">
                  <Chip tone={tono}>{t(chiave)}</Chip>
                  <span className="flex min-w-[200px] flex-1 flex-col">
                    <span className="font-medium">{p?.nome}</span>
                    <span className="text-[12.5px] text-muted">
                      {s.periodo} · {t("sold")} {fmt.eur(s.venduto)}
                    </span>
                  </span>
                  <span className="font-mono text-[13px]">{fmt.eur2(s.commissione)}</span>
                  <Button size="sm" onClick={() => onPatch("servizi", s.id, { stato: s.stato === "da_fatturare" ? "fatturata" : "incassata" })}>
                    {t(s.stato === "da_fatturare" ? "commInvoice" : "commMarkPaid")}
                  </Button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </Rise>
    </div>
  );
}
