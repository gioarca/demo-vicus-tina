import { animate, motion, useReducedMotion } from "framer-motion";
import { useLayoutEffect, useRef } from "react";
import { EASE } from "../lib/formati.js";

/* =====================================================================
   VICUS — elementi comuni: etichette, chip, pulsanti, numeri animati,
   barre di avanzamento. Colori e font arrivano dai token di index.css.
   ===================================================================== */

const unisci = (...c) => c.filter(Boolean).join(" ");

export function Label({ children, className, ...props }) {
  return (
    <span className={unisci("text-[11px] font-semibold uppercase tracking-[.08em] text-muted", className)} {...props}>
      {children}
    </span>
  );
}

const TONI = {
  ok: "text-ok bg-ok-soft",
  warn: "text-warn bg-warn-soft",
  bad: "text-bad bg-bad-soft",
  accent: "text-accent bg-accent-soft",
  neutro: "text-ink bg-bg ring-1 ring-inset ring-line",
};

export function Chip({ tone = "accent", children, className }) {
  return (
    <span className={unisci("inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[11.5px] font-semibold", TONI[tone], className)}>
      {children}
    </span>
  );
}

const VARIANTI = {
  primary: "bg-accent text-on-accent hover:brightness-110",
  ghost: "border border-line bg-transparent text-muted hover:text-ink hover:border-muted/50",
};

export function Button({ variant = "primary", size = "md", className, children, ...props }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      className={unisci(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg font-semibold transition-[filter,color,border-color] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-2.5 py-1 text-[12.5px]" : "px-3 py-1.5 text-[13px]",
        VARIANTI[variant],
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}

/**
 * Numero che scorre dal valore precedente al nuovo. Con "riduci movimento"
 * attivo nel sistema mostra subito il valore finale.
 */
export function AnimatedNumber({ value, format = String, className }) {
  const ref = useRef(null);
  const prima = useRef(0);
  const ridotto = useReducedMotion();
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (ridotto || prima.current === value) {
      el.textContent = format(value);
      prima.current = value;
      return;
    }
    el.textContent = format(prima.current);
    const c = animate(prima.current, value, {
      duration: 0.9,
      ease: EASE,
      onUpdate: (v) => {
        el.textContent = format(Math.round(v));
      },
    });
    prima.current = value;
    return () => c.stop();
  }, [value, format, ridotto]);
  return (
    <span ref={ref} className={unisci("tabular-nums", className)}>
      {format(value)}
    </span>
  );
}

export function Progress({ value, max, className }) {
  const p = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className={unisci("h-1 overflow-hidden rounded-full bg-line", className)} aria-hidden="true">
      <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${p}%` }} transition={{ duration: 0.5, ease: EASE }} />
    </div>
  );
}

export function Note({ children, className }) {
  return <span className={unisci("block text-[12px] font-normal text-muted", className)}>{children}</span>;
}

/** Contenitore che compare con un leggero scorrimento verso l'alto. */
export function Rise({ children, delay = 0, className, as = "div" }) {
  const M = motion[as];
  return (
    <M className={className} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE, delay }}>
      {children}
    </M>
  );
}
