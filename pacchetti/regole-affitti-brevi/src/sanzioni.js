/* =====================================================================
   Sanzioni a cui un immobile è esposto, dai passaggi ancora aperti.
   Importi per immobile, art. 13-ter D.L. 145/2023.
   ===================================================================== */

/** @typedef {"cin" | "display" | "safety" | "scia"} VoceSanzione */

/** @type {Readonly<Record<VoceSanzione, readonly [number, number]>>} */
export const SANZIONI = {
  cin: [800, 8000], //      CIN non richiesto
  display: [500, 5000], //  CIN non esposto o non indicato negli annunci
  safety: [600, 6000], //   dotazioni di sicurezza mancanti
  scia: [2000, 10000], //   attività in forma d'impresa senza SCIA
};

/**
 * @param {{ decisione: { form: string }, passi: Array<{ id: string }>, fatti: Record<string, boolean> }} piano  da statoPiano()
 * @returns {{ voci: VoceSanzione[], min: number, max: number }}
 */
export function esposizione(piano) {
  const aperto = (id) => piano.passi.some((p) => p.id === id) && !piano.fatti[id];
  /** @type {VoceSanzione[]} */
  const voci = [];
  if (aperto("p3-cin")) voci.push("cin");
  else if (aperto("p3-display")) voci.push("display"); // senza CIN non c'è nulla da esporre
  if (aperto("p2-gas") || aperto("p2-co") || aperto("p2-ext")) voci.push("safety");
  if (piano.decisione.form === "cav_business" && aperto("p3-suap")) voci.push("scia");
  return {
    voci,
    min: voci.reduce((s, v) => s + SANZIONI[v][0], 0),
    max: voci.reduce((s, v) => s + SANZIONI[v][1], 0),
  };
}
