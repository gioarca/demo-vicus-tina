import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { EASE } from "../lib/formati.js";
import { Button, Chip } from "./ui.jsx";

/* =====================================================================
   VICUS — scheda "Adempimenti": bloccanti in cima, poi da fare, poi
   fatti. Quando cambia lo stato la riga scivola al suo nuovo posto.
   ===================================================================== */

const ORDINE = { critico: 0, da_fare: 1, ok: 2 };
const LABEL = { ok: "taskDone", da_fare: "taskTodo", critico: "taskBlocking" };
const TONO = { ok: "ok", da_fare: "warn", critico: "bad" };

export function Adempimenti({ items, onSet, t, fmt }) {
  const sorted = [...items].sort((a, b) => ORDINE[a.stato] - ORDINE[b.stato]);
  if (!sorted.length) return <p className="m-0 py-6 text-muted">—</p>;
  return (
    <LayoutGroup>
      <ul className="m-0 flex list-none flex-col p-0">
        <AnimatePresence initial={false}>
          {sorted.map((a, i) => (
            <motion.li
              key={a.id}
              layout
              className="flex flex-wrap items-center gap-3 border-b border-line py-3 last:border-b-0"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ layout: { type: "spring", stiffness: 420, damping: 36 }, duration: 0.3, ease: EASE, delay: i * 0.03 }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={a.stato} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.15 }}>
                  <Chip tone={TONO[a.stato]}>{t(LABEL[a.stato])}</Chip>
                </motion.span>
              </AnimatePresence>
              <span className="flex min-w-[180px] flex-1 flex-col">
                <span className={`font-medium transition-colors ${a.stato === "ok" ? "text-muted" : ""}`}>{a.voce}</span>
                <span className="text-[12.5px] text-muted">{t("due", { d: a.scadenza ? fmt.day(a.scadenza) : t("ongoing") })}</span>
              </span>
              {a.stato !== "ok" ? (
                <Button onClick={() => onSet(a.id, "ok")}>{t("markDone")}</Button>
              ) : (
                <Button variant="ghost" onClick={() => onSet(a.id, "da_fare")}>
                  {t("reopen")}
                </Button>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </LayoutGroup>
  );
}
