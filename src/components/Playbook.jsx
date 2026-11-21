import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import { EASE } from "../lib/formati.js";
import { tx } from "../lib/i18n.js";
import { FORMS, PHASES, REGION_RULES, buildPlan, decideForm, regionName } from "regole-affitti-brevi";
import { Label, Progress } from "./ui.jsx";

/* =====================================================================
   VICUS — interfaccia del playbook
   DecisionCard: forma consigliata con motivazioni e stato delle regole.
   SetupPlan:    piano di avvio dell'immobile, con spunte per passaggio.
   ===================================================================== */

const WHO = { owner: "whoOwner", pm: "whoPm", tech: "whoTech", accountant: "whoAccountant" };

export function DecisionCard({ profile, decision, t, lang, fmt }) {
  const r = REGION_RULES[profile.region];
  return (
    <motion.div layout className="flex flex-col gap-1.5 rounded-xl border border-line bg-bg px-4 py-3.5" transition={{ layout: { duration: 0.25, ease: EASE } }}>
      <Label>{t("formLabel")}</Label>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={decision.form}
          className="font-display text-[20px] font-bold"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          {tx(FORMS[decision.form].label, lang)}
        </motion.div>
      </AnimatePresence>
      <ul className="m-0 flex list-disc flex-col gap-0.5 pl-[18px] text-[13.5px]">
        {decision.reasons.map((x, i) => (
          <li key={i}>{tx(x, lang)}</li>
        ))}
      </ul>
      {decision.notes.length > 0 && (
        <ul className="m-0 flex list-disc flex-col gap-0.5 pl-[18px] text-[13.5px] text-warn">
          {decision.notes.map((x, i) => (
            <li key={i}>{tx(x, lang)}</li>
          ))}
        </ul>
      )}
      <span className={`self-start rounded-md px-2 py-1 text-[12.5px] ${r ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>
        {r ? t("regionVerified", { r: regionName(profile.region), d: fmt.longDay(r.verifiedOn) }) : t("regionTodo", { r: regionName(profile.region) })}
      </span>
    </motion.div>
  );
}

export function SetupPlan({ profile, done, onToggle, t, lang, fmt }) {
  const decision = useMemo(() => decideForm(profile), [profile]);
  const plan = useMemo(() => buildPlan(profile, decision), [profile, decision]);
  const openBlocking = plan.filter((s) => s.blocking && !done[s.id]).length;
  const pronto = openBlocking === 0;

  return (
    <div className="flex flex-col gap-4">
      <DecisionCard profile={profile} decision={decision} t={t} lang={lang} fmt={fmt} />

      <motion.div
        role="status"
        className={`overflow-hidden rounded-[10px] px-3.5 py-2.5 text-[14px] font-semibold ${pronto ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad"}`}
        layout
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={openBlocking} className="block" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            {pronto ? t("readyToOpen") : openBlocking === 1 ? t("notReady1") : t("notReady", { n: openBlocking })}
          </motion.span>
        </AnimatePresence>
      </motion.div>

      {PHASES.map((ph, k) => {
        const steps = plan.filter((s) => s.phase === ph);
        if (!steps.length) return null;
        const n = steps.filter((s) => done[s.id]).length;
        return (
          <motion.section
            key={ph}
            className="flex flex-col gap-2"
            aria-label={t(`phase${ph}`)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: 0.05 * k }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="m-0 flex items-center gap-2 text-[15px] font-bold">
                <span className={`inline-grid size-[22px] place-items-center rounded-md font-mono text-[12px] transition-colors ${n === steps.length ? "bg-accent text-on-accent" : "bg-accent-soft text-accent"}`}>
                  {ph}
                </span>
                {t(`phase${ph}`)}
              </h3>
              <span className="text-[12.5px] tabular-nums text-muted">{t("progress", { a: n, b: steps.length })}</span>
            </div>
            <Progress value={n} max={steps.length} />
            <ul className="m-0 flex list-none flex-col p-0">
              {steps.map((s) => (
                <Step key={s.id} s={s} isDone={!!done[s.id]} onToggle={onToggle} t={t} lang={lang} />
              ))}
            </ul>
          </motion.section>
        );
      })}
    </div>
  );
}

function Step({ s, isDone, onToggle, t, lang }) {
  return (
    <li className="flex gap-3 border-b border-line py-2.5 last:border-b-0">
      <motion.button
        type="button"
        role="checkbox"
        aria-checked={isDone}
        aria-label={tx(s.title, lang)}
        onClick={() => onToggle(s.id, !isDone)}
        whileTap={{ scale: 0.85 }}
        className={`mt-px grid size-[22px] shrink-0 cursor-pointer place-items-center rounded-md border-[1.5px] transition-colors ${isDone ? "border-accent bg-accent text-on-accent" : "border-line hover:border-accent"}`}
      >
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
          <motion.path
            d="M3.5 8.5l3 3 6-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: isDone ? 1 : 0, opacity: isDone ? 1 : 0 }}
            transition={{ duration: 0.25, ease: EASE }}
          />
        </svg>
      </motion.button>
      <div className="flex min-w-0 flex-col gap-[3px]">
        <span className={`text-[14px] font-semibold transition-colors ${isDone ? "text-muted line-through decoration-line" : ""}`}>{tx(s.title, lang)}</span>
        <span className="text-[13px] text-muted">{tx(s.detail, lang)}</span>
        {s.nota && !isDone && <span className="text-[12px] text-accent">{tx(s.nota, lang)}</span>}
        <span className="mt-0.5 flex flex-wrap gap-1.5">
          <Tag>{t(WHO[s.who])}</Tag>
          <AnimatePresence initial={false}>
            {s.blocking && !isDone && (
              <motion.span key="b" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.15 }}>
                <Tag tone="bad">{t("blockingTag")}</Tag>
              </motion.span>
            )}
          </AnimatePresence>
          {s.delegabile && !isDone && <Tag>{t("delegableTag")}</Tag>}
          {s.todo && <Tag tone="warn">{t("toVerify")}</Tag>}
          {s.source && (
            <a className="rounded-[5px] bg-accent-soft px-[7px] py-px text-[11.5px] font-semibold text-accent no-underline hover:underline" href={s.source} target="_blank" rel="noreferrer">
              {t("source")} ↗
            </a>
          )}
        </span>
      </div>
    </li>
  );
}

function Tag({ tone, children }) {
  const c = tone === "bad" ? "bg-bad-soft text-bad" : tone === "warn" ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent";
  return <span className={`inline-block rounded-[5px] px-[7px] py-px text-[11.5px] font-semibold ${c}`}>{children}</span>;
}
