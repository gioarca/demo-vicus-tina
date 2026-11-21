import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { EASE } from "../lib/formati.js";
import { PHASES, REGIONS, REGION_RULES, buildPlan, decideForm } from "regole-affitti-brevi";
import { DecisionCard } from "./Playbook.jsx";
import { AnimatedNumber, Button, Label } from "./ui.jsx";

/* =====================================================================
   VICUS — procedura "Nuovo immobile": poche domande, poi il playbook
   sceglie la forma e genera i passaggi. L'anteprima si aggiorna a ogni
   risposta.
   ===================================================================== */

const campo = "flex min-w-0 flex-col gap-[5px] text-[13px] font-semibold text-muted";
const input = "w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-[14.5px] font-normal text-ink";

function YesNo({ id, value, onChange, t }) {
  return (
    <div className="flex gap-1.5" role="radiogroup" aria-labelledby={`${id}-l`}>
      {[true, false].map((v) => (
        <button
          key={String(v)}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`relative cursor-pointer rounded-lg border px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors ${value === v ? "border-accent text-on-accent" : "border-line text-muted hover:text-ink"}`}
        >
          {value === v && <motion.span layoutId={`yn-${id}`} className="absolute inset-0 rounded-[7px] bg-accent" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
          <span className="relative">{v ? t("yes") : t("no")}</span>
        </button>
      ))}
    </div>
  );
}

export function Wizard({ owners, ownerUnits, onCreate, onCancel, t, lang, fmt }) {
  const [f, setF] = useState({
    nome: "",
    ownerId: owners[0] ? owners[0].id : "new",
    ownerName: "",
    region: "campania",
    comune: "",
    extraUnits: 0,
    services: false,
    resides: false,
    rooms: 2,
    sqm: 70,
    floors: 1,
    condo: false,
    nonResident: false,
  });
  const [error, setError] = useState("");
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const units = (f.ownerId !== "new" ? ownerUnits[f.ownerId] || 0 : 0) + 1 + (Number(f.extraUnits) || 0);
  const profile = {
    region: f.region,
    comune: f.comune.trim(),
    services: f.services,
    resides: f.resides,
    rooms: Number(f.rooms) || 1,
    sqm: Number(f.sqm) || 0,
    floors: Number(f.floors) || 1,
    condo: f.condo,
    nonResident: f.nonResident,
    extraUnits: Number(f.extraUnits) || 0,
    units,
  };
  const decision = decideForm(profile);
  const plan = buildPlan(profile, decision);

  const submit = (e) => {
    e.preventDefault();
    if (!f.nome.trim() || !f.comune.trim() || (f.ownerId === "new" && !f.ownerName.trim())) {
      setError(t("nameRequired"));
      return;
    }
    const { units: _units, ...profilo } = profile;
    onCreate({ nome: f.nome.trim(), proprietarioId: f.ownerId === "new" ? null : f.ownerId, nuovoProprietario: f.ownerName.trim(), profilo });
  };

  return (
    <form className="flex flex-col gap-[18px]" onSubmit={submit} noValidate>
      <div>
        <h1 className="m-0 font-display text-[28px] font-bold tracking-[-.015em]">{t("wizTitle")}</h1>
        <p className="m-0 text-[13.5px] text-muted">{t("wizIntro")}</p>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
        <label className={campo} htmlFor="w-nome">
          <span>{t("fName")}</span>
          <input id="w-nome" className={input} value={f.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Casa Sant'Angelo" />
        </label>
        <label className={campo} htmlFor="w-owner">
          <span>{t("fOwner")}</span>
          <select id="w-owner" className={input} value={f.ownerId} onChange={(e) => set("ownerId", e.target.value)}>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
            <option value="new">{t("fOwnerNew")}</option>
          </select>
        </label>
        <AnimatePresence initial={false}>
          {f.ownerId === "new" && (
            <motion.label
              key="ownername"
              className={campo}
              htmlFor="w-ownername"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              <span>{t("fOwnerName")}</span>
              <input id="w-ownername" className={input} value={f.ownerName} onChange={(e) => set("ownerName", e.target.value)} />
            </motion.label>
          )}
        </AnimatePresence>
        <label className={campo} htmlFor="w-region">
          <span>{t("fRegion")}</span>
          <select id="w-region" className={input} value={f.region} onChange={(e) => set("region", e.target.value)}>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {REGION_RULES[r.id] ? " ✓" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className={campo} htmlFor="w-comune">
          <span>{t("fComune")}</span>
          <input id="w-comune" className={input} value={f.comune} onChange={(e) => set("comune", e.target.value)} placeholder="Serrara Fontana" />
        </label>
        <label className={campo} htmlFor="w-extra">
          <span>{t("fUnits")}</span>
          <input id="w-extra" type="number" min="0" max="20" className={input} value={f.extraUnits} onChange={(e) => set("extraUnits", e.target.value)} />
          <em className={`text-[12.5px] font-normal not-italic transition-colors ${units >= 3 ? "text-bad" : "text-accent"}`}>{t("unitsTotal", { n: units })}</em>
        </label>
        <label className={campo} htmlFor="w-sqm">
          <span>{t("fSqm")}</span>
          <input id="w-sqm" type="number" min="10" className={input} value={f.sqm} onChange={(e) => set("sqm", e.target.value)} />
        </label>
        <label className={campo} htmlFor="w-floors">
          <span>{t("fFloors")}</span>
          <input id="w-floors" type="number" min="1" max="6" className={input} value={f.floors} onChange={(e) => set("floors", e.target.value)} />
        </label>
        <label className={campo} htmlFor="w-rooms">
          <span>{t("fRooms")}</span>
          <input id="w-rooms" type="number" min="1" max="12" className={input} value={f.rooms} onChange={(e) => set("rooms", e.target.value)} />
        </label>

        {[
          ["services", "fServices"],
          ["resides", "fResides"],
          ["condo", "fCondo"],
          ["nonResident", "fNonRes"],
        ].map(([k, label]) => (
          <div key={k} className={campo}>
            <span id={`w-${k}-l`}>{t(label)}</span>
            <YesNo id={`w-${k}`} value={f[k]} onChange={(v) => set(k, v)} t={t} />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2.5 border-t border-line pt-4">
        <Label>{t("wizPreview")}</Label>
        <DecisionCard profile={profile} decision={decision} t={t} lang={lang} fmt={fmt} />
        <Label>{t("stepsPerPhase")}</Label>
        <ul className="m-0 grid list-none grid-cols-1 gap-x-4 gap-y-1 p-0 text-[13.5px] sm:grid-cols-2">
          {PHASES.map((ph) => (
            <li key={ph} className="flex justify-between gap-2 border-b border-line py-1">
              <span>
                {ph}. {t(`phase${ph}`)}
              </span>
              <strong>
                <AnimatedNumber value={plan.filter((s) => s.phase === ph).length} />
              </strong>
            </li>
          ))}
        </ul>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p role="alert" className="m-0 text-[13.5px] font-semibold text-bad" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: [0, -4, 4, -2, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="submit">{t("wizCreate")}</Button>
      </div>
    </form>
  );
}
