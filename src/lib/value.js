import { esposizione, statoPiano } from "regole-affitti-brevi";
import { forecast } from "./forecast.js";

/* =====================================================================
   VICUS — "Valore in gioco" per casa: quanto può rendere in più,
   a quali sanzioni è esposta oggi, quanto costa la piattaforma.
   Tutto calcolato dai dati della pagina; sono stime, non risultati.
   ===================================================================== */

// Sanzioni a cui l'immobile è esposto, dai passaggi ancora aperti: le calcola il motore condiviso.
export function fineExposure(profile, done) {
  const e = esposizione(statoPiano(profile, done));
  return { items: e.voci, min: e.min, max: e.max };
}

// Costo annuo della piattaforma per una casa: prezzo fisso. Il partner Vicus non paga la quota base.
export const quadraCost = (_lordo, prezzo) => prezzo.perCasa * 12;

export function valueFor({ imm, profile, done, par, manutenzione }) {
  const sc = forecast(imm, par, manutenzione);
  const base = sc && sc.find((s) => s.id === "base");
  const opt = sc && sc.find((s) => s.id === "ottimista");
  const costo = quadraCost(0, par.prezzo);
  const nettoInPiu = opt ? opt.netto - base.netto : 0;
  return {
    lordoInPiu: opt ? opt.lordo - base.lordo : 0,
    nettoInPiu,
    esposizione: fineExposure(profile, done),
    costo,
    multiplo: costo > 0 && nettoInPiu > 0 ? nettoInPiu / costo : null,
  };
}
