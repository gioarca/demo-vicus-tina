/* =====================================================================
   Test del motore. Ogni regola che cambia per legge va prima scritta
   qui come caso, poi corretta nel motore: così Quadra e Vicus danno la
   stessa risposta sullo stesso immobile.   npm test
   ===================================================================== */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { FORMS, REGION_RULES, SANZIONI, buildPlan, decideForm, esposizione, extinguishers, pianoPer, statoPiano, tx } from "../src/index.js";

/** Profilo base: un trilocale in Campania, il proprietario non ci vive, nessun servizio. */
const casa = (extra = {}) => ({
  region: "campania",
  comune: "Forio",
  units: 1,
  services: false,
  resides: false,
  rooms: 2,
  sqm: 80,
  floors: 1,
  condo: false,
  nonResident: false,
  ...extra,
});
const ids = (p) => pianoPer(p).passi.map((s) => s.id);

describe("forma consigliata", () => {
  test("una casa, solo alloggio: locazione breve", () => {
    assert.equal(decideForm(casa()).form, "short_let");
  });

  test("terzo immobile: presunzione d'impresa (L. 199/2025)", () => {
    assert.equal(decideForm(casa({ units: 3 })).form, "cav_business");
  });

  test("servizi durante il soggiorno: casa vacanze", () => {
    assert.equal(decideForm(casa({ services: true })).form, "cav");
  });

  test("titolare residente, fino a 4 camere: B&B", () => {
    assert.equal(decideForm(casa({ resides: true, rooms: 4 })).form, "bnb");
  });

  test("titolare residente con 5 camere: niente B&B e nota sull'altra tipologia", () => {
    const d = decideForm(casa({ resides: true, rooms: 5 }));
    assert.notEqual(d.form, "bnb");
    assert.match(d.notes.map((n) => n.it).join(" "), /affittacamere/);
  });

  test("Campania: il B&B senza residenza è escluso e lo dice", () => {
    const d = decideForm(casa());
    assert.match(d.notes.map((n) => n.it).join(" "), /B&B escluso/);
  });

  test("regione non configurata: regole null e codice regionale da verificare", () => {
    const p = casa({ region: "lombardia", comune: "Bellagio" });
    const { decisione, passi } = pianoPer(p);
    assert.equal(decisione.rules, null);
    assert.equal(passi.find((s) => s.id === "p3-regcode").todo, true);
  });
});

describe("piano dei passaggi", () => {
  test("gli id dei passaggi sono unici", () => {
    for (const p of [casa(), casa({ units: 3, condo: true, nonResident: true }), casa({ resides: true }), casa({ region: "veneto" })]) {
      const lista = ids(p);
      assert.equal(new Set(lista).size, lista.length);
    }
  });

  test("passaggi condizionali: condominio, non residente, gestione in proprio", () => {
    assert.ok(ids(casa({ condo: true })).includes("p1-condo"));
    assert.ok(!ids(casa()).includes("p1-condo"));
    assert.ok(ids(casa({ nonResident: true })).includes("p5-nonres"));
    assert.ok(ids(casa()).includes("p6-mandate"));
    assert.ok(!ids(casa({ conGestore: false })).includes("p6-mandate"));
  });

  test("fiscalità: cedolare, due immobili, impresa, B&B", () => {
    assert.ok(ids(casa()).includes("p5-cedolare"));
    const due = pianoPer(casa({ units: 2 })).passi.find((s) => s.id === "p5-cedolare");
    assert.match(due.title.it, /21% su un immobile, 26%/);
    assert.ok(ids(casa({ units: 3 })).includes("p5-business"));
    assert.ok(ids(casa({ resides: true })).includes("p5-regime"));
  });

  test("SCIA per casa vacanze e B&B, comunicazione per la locazione breve", () => {
    const titolo = (p) => pianoPer(p).passi.find((s) => s.id === "p3-suap").title.it;
    assert.match(titolo(casa()), /^Comunicazione al SUAP del Comune di Forio/);
    assert.match(titolo(casa({ services: true })), /^SCIA al SUAP/);
    assert.equal(FORMS.bnb.filing, "scia");
  });

  test("estintori: uno ogni 200 m² o frazione, almeno uno per piano", () => {
    assert.equal(extinguishers(85, 1), 1);
    assert.equal(extinguishers(210, 1), 2);
    assert.equal(extinguishers(140, 2), 2);
    assert.equal(extinguishers(0, 0), 1);
  });

  test("delega: solo SUAP e CIN; Questura e imposta di soggiorno restano al gestore", () => {
    const passi = pianoPer(casa()).passi;
    assert.deepEqual(passi.filter((s) => s.delegabile).map((s) => s.id), ["p3-suap", "p3-cin"]);
    assert.deepEqual(passi.filter((s) => s.soloGestore).map((s) => s.id), ["p4-police", "p4-tax"]);
    assert.match(passi.find((s) => s.id === "p3-cin").nota.it, /SPID del titolare non si usa mai/);
  });

  test("nel motore non ci sono servizi con un nome: la nota resta neutra", () => {
    const testo = JSON.stringify(pianoPer(casa({ units: 3, condo: true, nonResident: true })));
    assert.doesNotMatch(testo, /Vicus|Quadra/);
  });

  test("ogni testo esiste in italiano, inglese e tedesco", () => {
    const p = casa({ units: 2, condo: true, nonResident: true });
    const d = decideForm(p);
    const testi = [
      ...d.reasons,
      ...d.notes,
      ...buildPlan(p, d).flatMap((s) => [s.title, s.detail, s.nota].filter(Boolean)),
      ...Object.values(FORMS).map((f) => f.label),
    ];
    for (const t of testi) for (const lang of ["it", "en", "de"]) assert.ok(tx(t, lang).trim().length > 0, `${lang} mancante: ${t.it}`);
  });

  test("le regole della Campania hanno fonte e data di verifica", () => {
    assert.match(REGION_RULES.campania.verifiedOn, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(REGION_RULES.campania.regionalSource, /^https:\/\//);
  });
});

describe("sanzioni", () => {
  test("niente fatto: CIN mancante e sicurezza", () => {
    const e = esposizione(statoPiano(casa()));
    assert.deepEqual(e.voci, ["cin", "safety"]);
    assert.equal(e.min, SANZIONI.cin[0] + SANZIONI.safety[0]);
    assert.equal(e.max, SANZIONI.cin[1] + SANZIONI.safety[1]);
  });

  test("CIN richiesto ma non esposto: conta solo l'esposizione", () => {
    const tutti = Object.fromEntries(ids(casa()).map((id) => [id, true]));
    const e = esposizione(statoPiano(casa(), { ...tutti, "p3-display": false }));
    assert.deepEqual(e.voci, ["display"]);
  });

  test("tutto fatto: nessuna sanzione e nessun passaggio bloccante", () => {
    const tutti = Object.fromEntries(ids(casa()).map((id) => [id, true]));
    const piano = statoPiano(casa(), tutti);
    assert.deepEqual(esposizione(piano).voci, []);
    assert.equal(piano.bloccantiAperti.length, 0);
  });

  test("attività d'impresa senza SCIA", () => {
    assert.ok(esposizione(statoPiano(casa({ units: 3 }))).voci.includes("scia"));
    assert.ok(!esposizione(statoPiano(casa())).voci.includes("scia"));
  });
});
