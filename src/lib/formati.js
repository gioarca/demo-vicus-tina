import { localeOf } from "./i18n.js";

/* =====================================================================
   VICUS — mesi, formati di euro e date, conto economico.
   Funzioni pure, fuori dai componenti (così il Fast Refresh resta attivo).
   ===================================================================== */

export const MONTHS = {
  it: ["Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott"],
  en: ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"],
  de: ["Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt."],
};

const total = (a) => a.reduce((s, x) => s + x, 0);

/** Conto economico della stagione 2026 di un immobile. La cedolare si applica al lordo. */
export function contoEconomico(imm, interventi, par) {
  const lordo = total(imm.ricaviMese);
  const notti = total(imm.notti);
  const ota = lordo * par.commissioneOta;
  const fee = lordo * par.feeGestione;
  const pulizie = imm.soggiorni * (imm.pulizia?.addebito ?? par.pulizieSoggiorno);
  const manutenzione = total(interventi.filter((m) => m.immobileId === imm.id && m.stato === "chiuso").map((m) => m.costo));
  const cedolare = imm.cedolare ? lordo * imm.cedolare : null;
  const netto = lordo - ota - fee - pulizie - manutenzione - (cedolare || 0);
  return { lordo, notti, ota, fee, pulizie, manutenzione, aliquota: imm.cedolare, cedolare, netto, soggiorno: notti * imm.soggiornoNotte };
}

const utc = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

export function formatters(lang) {
  const loc = localeOf(lang);
  const euro = new Intl.NumberFormat(loc, { style: "currency", currency: "EUR", maximumFractionDigits: 0, useGrouping: "always" });
  return {
    eur: (n) => euro.format(Math.round(n) || 0),
    pct: (n) => (n * 100).toLocaleString(loc, { maximumFractionDigits: 1 }) + "%",
    num: (n) => Math.round(n).toLocaleString(loc),
    day: (s) => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(loc, { day: "numeric", month: "short", timeZone: "UTC" });
    },
    longDay: (s) => {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    },
    // con i centesimi, per F24 e ritenute
    eur2: (n) => n.toLocaleString(loc, { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" }),
    wd: (s) => utc(s).toLocaleDateString(loc, { weekday: "short", timeZone: "UTC" }),
    dn: (s) => utc(s).getUTCDate(),
    // con l'anno solo se è diverso da quello di riferimento
    dayY: (s, ref) => {
      const d = utc(s).toLocaleDateString(loc, { day: "numeric", month: "short", timeZone: "UTC" });
      return s.slice(0, 4) === ref.slice(0, 4) ? d : `${d} ${s.slice(0, 4)}`;
    },
    fullDay: (s) => utc(s).toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }),
    x: (n) => n.toLocaleString(loc, { maximumFractionDigits: 1 }),
    k: (v) => (v >= 1000 ? (v / 1000).toLocaleString(loc, { maximumFractionDigits: 1 }) + "k" : String(v)),
  };
}

/** Curva d'uscita comune a tutte le animazioni della demo. */
export const EASE = [0.22, 1, 0.36, 1];
