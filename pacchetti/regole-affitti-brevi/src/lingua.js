/* =====================================================================
   Lingue dell'interfaccia proprietari: italiano, inglese, tedesco.
   L(it, en, de) crea un testo multilingua, tx(testo, lang) lo legge.
   I dati operativi inseriti dagli utenti restano nella loro lingua.
   ===================================================================== */

/** @typedef {"it" | "en" | "de"} Lang */
/** @typedef {{ it: string, en: string, de: string }} Testo */

/** @type {ReadonlyArray<{ id: Lang, label: string, locale: string }>} */
export const LINGUE = [
  { id: "it", label: "IT", locale: "it-IT" },
  { id: "en", label: "EN", locale: "en-GB" },
  { id: "de", label: "DE", locale: "de-DE" },
];

/** @returns {Testo} */
export const L = (it, en, de) => ({ it, en, de });

/**
 * @param {Testo | string} v
 * @param {Lang} lang
 */
export const tx = (v, lang) => (typeof v === "string" ? v : (v[lang] ?? v.it));

export const localeOf = (lang) => (LINGUE.find((l) => l.id === lang) ?? LINGUE[0]).locale;
