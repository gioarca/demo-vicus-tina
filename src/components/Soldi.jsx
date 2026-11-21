import { AnimatePresence, motion } from "framer-motion";
import { EASE } from "../lib/formati.js";
import { Fisco } from "./Fisco.jsx";
import { Partner } from "./Partner.jsx";
import { Schede } from "./Pulizie.jsx";

/* =====================================================================
   VICUS — Soldi. Le tasse e i contributi di Tina stimati sulle entrate
   vere, i costi per tenere viva l'attività, gli incassi diretti, le
   fatture alle famiglie e i servizi dei partner.
   ===================================================================== */

const SOTTO = [
  ["fisco", "Tasse, contributi e costi"],
  ["incassi", "Incassi, fatture e partner"],
];

export function Soldi({ db, d, sub, setSub, onFiscale, onPatch, t, fmt, lang }) {
  return (
    <section className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-5 max-[480px]:p-4" aria-label="Soldi">
      <Schede voci={SOTTO} sub={sub} setSub={setSub} id="soldi" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={sub} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: EASE }}>
          {sub === "fisco" && <Fisco db={db} prev={d.prev} entrate={d.entrate} costi={d.costi} netto={d.netto} onFiscale={onFiscale} onPatch={onPatch} t={t} fmt={fmt} lang={lang} />}
          {sub === "incassi" && <Partner db={db} t={t} fmt={fmt} onPatch={onPatch} />}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
