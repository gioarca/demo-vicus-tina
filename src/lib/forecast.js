import { L } from "./i18n.js";

/* =====================================================================
   VICUS — previsione deterministica della stagione successiva.
   I numeri si calcolano qui, sempre allo stesso modo: Claude li legge e
   li commenta, non li produce. Mesi: aprile → ottobre.
   ===================================================================== */

const total = (a) => a.reduce((s, x) => s + x, 0);
export const SHOULDER = [0, 1, 2, 5, 6]; // apr, mag, giu, set, ott
export const PEAK = [3, 4];               // lug, ago
export const AUGUST = 4;

export const SCENARIOS = [
  { id: "prudente", label: L("Prudente", "Cautious", "Vorsichtig"),
    note: L("Stagione 2026 meno il 10% in ogni mese.", "2026 season minus 10% in every month.", "Saison 2026 minus 10 % in jedem Monat."),
    lever: { spalle: -10, picco: -10 } },
  { id: "base", label: L("Base", "Base", "Basis"),
    note: L("Stessi ricavi mensili della stagione 2026.", "Same monthly revenue as the 2026 season.", "Gleiche Monatseinnahmen wie in der Saison 2026."),
    lever: { spalle: 0, picco: 0 } },
  { id: "ottimista", label: L("Ottimista", "Optimistic", "Optimistisch"),
    note: L("Spalle (apr–giu, set–ott) +20% aprendo i calendari; luglio e agosto +3%.", "Shoulder months (Apr–Jun, Sep–Oct) +20% by opening calendars; July and August +3%.", "Nebensaison (Apr.–Juni, Sept.–Okt.) +20 % durch offene Kalender; Juli und August +3 %."),
    lever: { spalle: 20, picco: 3 } },
];

// Applica le leve ai ricavi mensili della stagione di riferimento.
export function applyLevers(ricaviMese, { spalle = 0, picco = 0, prezzoAgosto = 0, agostoProprietario = false }) {
  return ricaviMese.map((v, i) => {
    if (i === AUGUST && agostoProprietario) return 0;
    let f = 1 + (SHOULDER.includes(i) ? spalle : picco) / 100;
    if (i === AUGUST) f *= 1 + prezzoAgosto / 100;
    return Math.round(v * f);
  });
}

// Netto al proprietario con la stessa struttura di costi del conto economico.
export function netFor(imm, mesi, par, manutenzione) {
  const lordo = total(mesi);
  const base = total(imm.ricaviMese) || 1;
  const soggiorni = Math.round(imm.soggiorni * (lordo / base));
  const costi = lordo * (par.commissioneOta + par.feeGestione) + soggiorni * par.pulizieSoggiorno + manutenzione + (imm.cedolare ? lordo * imm.cedolare : 0);
  return { lordo, netto: Math.round(lordo - costi), soggiorni };
}

export function forecast(imm, par, manutenzione) {
  if (!total(imm.ricaviMese)) return null;
  return SCENARIOS.map((s) => {
    const mesi = applyLevers(imm.ricaviMese, s.lever);
    return { ...s, mesi, ...netFor(imm, mesi, par, manutenzione) };
  });
}

// Usata da Claude come strumento: simula una combinazione di leve.
export function simulate(imm, par, manutenzione, levers) {
  const mesi = applyLevers(imm.ricaviMese, levers);
  const r = netFor(imm, mesi, par, manutenzione);
  const base = netFor(imm, imm.ricaviMese, par, manutenzione);
  return { ...r, deltaLordo: r.lordo - base.lordo, deltaNetto: r.netto - base.netto, mesi };
}
