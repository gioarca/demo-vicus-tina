import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import { EASE } from "../lib/formati.js";
import { rendiconto } from "../lib/gestione.js";
import { Proprietario } from "./Proprietario.jsx";
import { Chip, Note } from "./ui.jsx";

/* =====================================================================
   VICUS — Famiglie. Una scheda per famiglia proprietaria: le sue case,
   il rendiconto fino al netto reale, le spese da approvare e il
   registro di cosa ha deciso. Quello che oggi Tina manda a mano su
   WhatsApp o in un Excel a fine stagione.
   ===================================================================== */

export function Famiglie({ db, sel, setSel, onPatch, vai, t, fmt }) {
  const prop = db.proprietari.find((p) => p.id === sel) ?? db.proprietari[0];
  const rend = useMemo(() => rendiconto(db, prop.id), [db, prop.id]);
  return (
    <section className="flex flex-col gap-4" aria-label="Famiglie">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2" role="tablist" aria-label="Scegli la famiglia">
        {db.proprietari.map((p) => {
          const case_ = db.immobili.filter((i) => i.proprietarioId === p.id);
          const ids = case_.map((i) => i.id);
          const daApprovare = db.interventi.filter((m) => ids.includes(m.immobileId) && m.stato === "attesa_ok").length;
          const attivo = p.id === prop.id;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={attivo}
              onClick={() => setSel(p.id)}
              className={`relative flex cursor-pointer flex-col gap-1 rounded-xl border px-3.5 py-3 text-left transition-colors ${attivo ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent/50"}`}
            >
              <span className="font-semibold">{p.nome}</span>
              <span className="text-[12.5px] text-muted">
                {case_.length === 1 ? "1 casa" : `${case_.length} case`} · vive a {p.residenza}
              </span>
              <span className="flex flex-wrap gap-1">
                {daApprovare > 0 && <Chip tone="warn">{daApprovare} da approvare</Chip>}
                {p.mandato?.scadenza && <Chip tone="bad">mandato scade {fmt.day(p.mandato.scadenza)}</Chip>}
                {p.mandato?.soglia == null && <Chip tone="warn">mandato senza soglia</Chip>}
              </span>
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={prop.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2, ease: EASE }} className="rounded-[14px] border border-line bg-surface p-5 max-[480px]:p-4">
          <Proprietario
            db={db}
            prop={prop}
            rend={rend}
            onApprove={(id) => onPatch("interventi", id, { stato: "programmato" })}
            onOpenImm={(id) => vai({ vista: "case", immobileId: id, tab: "conto" })}
            t={t}
            fmt={fmt}
          />
        </motion.div>
      </AnimatePresence>
      <Note>
        Ogni famiglia vedrà solo le sue case, dal suo accesso: rendiconto, spese approvate e lavori fatti, con le foto. Gli ospiti compaiono solo come codice di prenotazione e numero di persone.
      </Note>
    </section>
  );
}
