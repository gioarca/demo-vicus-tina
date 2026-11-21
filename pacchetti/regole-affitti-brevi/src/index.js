/* =====================================================================
   regole-affitti-brevi — un solo motore di regole per Quadra e Vicus.
   ===================================================================== */
export { L, LINGUE, localeOf, tx } from "./lingua.js";
export {
  FORMS,
  PHASES,
  REGIONS,
  REGION_RULES,
  buildPlan,
  decideForm,
  extinguishers,
  pianoPer,
  regionName,
  statoPiano,
} from "./regole.js";
export { SANZIONI, esposizione } from "./sanzioni.js";
export {
  FISCO_2026,
  bolloFatture,
  cedolareImmobile,
  contributiInps,
  giornoUtile,
  previsionaleForfettario,
  rateAcconto,
  verificaContanti,
  versamentiAnnoDopo,
} from "./fisco.js";
export { ADEMPIMENTI_GESTORE, AREE_GESTORE, adempimentiGestore, prossimaScadenza } from "./gestore.js";

/** @typedef {import("./lingua.js").Lang} Lang */
/** @typedef {import("./lingua.js").Testo} Testo */
/** @typedef {import("./regole.js").Profilo} Profilo */
/** @typedef {import("./regole.js").Decisione} Decisione */
/** @typedef {import("./regole.js").Passo} Passo */
/** @typedef {import("./sanzioni.js").VoceSanzione} VoceSanzione */
/** @typedef {import("./gestore.js").ProfiloGestore} ProfiloGestore */
/** @typedef {import("./gestore.js").AdempimentoGestore} AdempimentoGestore */
/** @typedef {import("./gestore.js").RegolaScadenza} RegolaScadenza */
