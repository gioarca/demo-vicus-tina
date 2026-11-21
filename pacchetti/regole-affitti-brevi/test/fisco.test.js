/* =====================================================================
   Test di fisco e obblighi del gestore. I numeri attesi sono calcolati
   a mano dai valori INPS 2026 (circolare n. 14/2026).   npm test
   ===================================================================== */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ADEMPIMENTI_GESTORE,
  FISCO_2026,
  adempimentiGestore,
  bolloFatture,
  cedolareImmobile,
  contributiInps,
  giornoUtile,
  previsionaleForfettario,
  prossimaScadenza,
  rateAcconto,
  tx,
  verificaContanti,
  versamentiAnnoDopo,
} from "../src/index.js";

const vicino = (a, b, d = 0.01) => assert.ok(Math.abs(a - b) <= d, `${a} ≠ ${b}`);

describe("INPS commercianti 2026", () => {
  test("sotto il minimale si pagano solo i fissi: 4.611,64 €", () => {
    const c = contributiInps(10000);
    vicino(c.fissi, 4611.64);
    assert.equal(c.eccedenza, 0);
  });

  test("riduzione del 35% su fissi ed eccedenza, maternità esclusa", () => {
    const c = contributiInps(28808, { riduzione: true });
    vicino(c.fissi, 18808 * 0.2448 * 0.65 + 7.44);
    vicino(c.eccedenza, 10000 * 0.2448 * 0.65);
  });

  test("oltre 56.224 € l'aliquota sale di un punto; oltre il massimale non cresce", () => {
    vicino(contributiInps(66224).eccedenza, (56224 - 18808) * 0.2448 + 10000 * 0.2548);
    assert.equal(contributiInps(500000).eccedenza, contributiInps(122295).eccedenza);
  });
});

describe("forfettario", () => {
  const base = { contributiVersati: 4000, accontiImposta: 1000, accontiInps: 900, avvio: true, riduzione: true };

  test("coefficienti per codice ATECO e imposta al 5% sull'imponibile", () => {
    const p = previsionaleForfettario({ ...base, ricavi: [{ ateco: "68.32", importo: 30000 }, { ateco: "79.90", importo: 2000 }] });
    vicino(p.reddito, 30000 * 0.86 + 2000 * 0.67);
    vicino(p.imponibile, p.reddito - 4000);
    vicino(p.imposta, p.imponibile * 0.05);
    vicino(p.saldoImposta, p.imposta - 1000);
    assert.equal(p.soglia.stato, "ok");
  });

  test("aliquota ordinaria al 15% e soglie di uscita", () => {
    const p = previsionaleForfettario({ ...base, avvio: false, ricavi: [{ ateco: "68.32", importo: 90000 }] });
    assert.equal(p.aliquota, 0.15);
    assert.equal(p.soglia.stato, "superata");
    assert.equal(previsionaleForfettario({ ...base, ricavi: [{ ateco: "68.32", importo: 101000 }] }).soglia.stato, "uscita");
    assert.equal(previsionaleForfettario({ ...base, ricavi: [{ ateco: "68.32", importo: 75000 }] }).soglia.stato, "vicina");
  });

  test("un codice ATECO non configurato è un errore, non uno zero", () => {
    assert.throws(() => previsionaleForfettario({ ...base, ricavi: [{ ateco: "00.00", importo: 1 }] }), /ATECO 00\.00/);
  });

  test("acconti: niente sotto 51,65 €, una rata sotto 257,52 €, altrimenti metà e metà", () => {
    assert.deepEqual(rateAcconto(50), []);
    assert.deepEqual(rateAcconto(200), [{ rata: 2, importo: 200 }]);
    assert.deepEqual(rateAcconto(1000), [{ rata: 1, importo: 500 }, { rata: 2, importo: 500 }]);
  });

  test("versamenti dell'anno dopo in ordine di data, nei giorni utili", () => {
    const p = previsionaleForfettario({ ...base, ricavi: [{ ateco: "68.32", importo: 35000 }] });
    const v = versamentiAnnoDopo(p);
    assert.deepEqual(v.map((x) => x.data), [...v.map((x) => x.data)].sort());
    assert.equal(v[0].data, "2027-02-16");
    assert.ok(v.some((x) => x.tipo === "inpsFissi" && x.data === "2027-05-17"), "16 maggio 2027 è domenica: si va a lunedì 17");
  });
});

describe("cedolare e pagamenti", () => {
  test("la ritenuta è un acconto: il 26% lascia un conguaglio del 5%", () => {
    const c = cedolareImmobile({ lordo: 10000, aliquota: 0.26, quotaGestore: 0.6, quotaPortale: 0.4 });
    vicino(c.ritenuteGestore + c.ritenutePortale, 2100);
    vicino(c.conguaglio, 500);
  });

  test("regime da verificare: ritenute sì, cedolare no", () => {
    const c = cedolareImmobile({ lordo: 1000, aliquota: null, quotaGestore: 1, quotaPortale: 0 });
    assert.equal(c.cedolare, null);
    vicino(c.ritenuteGestore, 210);
  });

  test("contanti: 5.000 € esatti sono già vietati", () => {
    assert.equal(verificaContanti(4999.99), "attenzione");
    assert.equal(verificaContanti(5000), "vietato");
    assert.equal(verificaContanti(300), "ok");
  });

  test("bollo da 2 € solo sopra 77,47 €", () => {
    assert.equal(bolloFatture([77.47, 77.48, 500]), 4);
  });
});

describe("obblighi del gestore", () => {
  test("le scadenze nel fine settimana slittano al lunedì", () => {
    assert.equal(giornoUtile("2026-05-16"), "2026-05-18");
    assert.equal(giornoUtile("2026-11-16"), "2026-11-16");
  });

  test("prossima scadenza mensile, annuale e a date fisse", () => {
    assert.equal(prossimaScadenza({ tipo: "mensile", giorno: 16 }, "2026-11-08"), "2026-11-16");
    assert.equal(prossimaScadenza({ tipo: "mensile", giorno: 16 }, "2026-12-17"), "2027-01-18");
    assert.equal(prossimaScadenza({ tipo: "annuale", mmgg: "03-16" }, "2026-11-08"), "2027-03-16");
    assert.equal(prossimaScadenza({ tipo: "date", mmgg: FISCO_2026.bollo.scadenze }, "2026-11-08"), "2026-11-30");
    assert.equal(prossimaScadenza({ tipo: "continuo" }, "2026-11-08"), null);
  });

  test("chi non incassa i canoni non ha ritenute, CU e 770", () => {
    const ids = adempimentiGestore({ regime: "ordinario", incassaCanoni: false, riscuoteSoggiorno: true, partner: false }).map((v) => v.id);
    for (const id of ["g-ritenute", "g-cu", "g-770", "g-forf", "g-bollo"]) assert.ok(!ids.includes(id), id);
    assert.ok(ids.includes("g-alloggiati"));
  });

  test("ogni voce ha testi in tre lingue e nessun nome di servizio", () => {
    for (const v of ADEMPIMENTI_GESTORE) {
      for (const lang of ["it", "en", "de"]) {
        assert.ok(tx(v.title, lang).trim(), `${v.id} ${lang}`);
        assert.ok(tx(v.detail, lang).trim(), `${v.id} ${lang}`);
      }
    }
    assert.doesNotMatch(JSON.stringify([ADEMPIMENTI_GESTORE, FISCO_2026]), /Vicus|Quadra/);
  });
});
