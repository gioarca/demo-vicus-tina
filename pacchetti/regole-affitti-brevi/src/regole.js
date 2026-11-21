import { L } from "./lingua.js";

/* =====================================================================
   REGOLE AFFITTI BREVI — motore "seconda casa → affitto turistico in
   regola", unico per Quadra e per la pagina Proprietari di Vicus.
   Il motore descrive la legge e chi la deve rispettare; cosa fa un
   servizio in particolare (Quadra, Vicus) lo scrive ciascuna app.

   Due strati:
   - NAZIONALE: CIN, dotazioni di sicurezza, Alloggiati Web, fiscalità.
     Vale ovunque ed è scritto direttamente in buildPlan().
   - REGIONALE: forma ammessa (B&B, casa vacanze), codice regionale,
     limiti. Ogni regione è una voce di REGION_RULES. Una regione senza
     voce funziona lo stesso, ma i passaggi regionali escono marcati
     "da verificare": il motore non inventa regole non controllate.

   Il file non dipende da React né dal browser: lo stesso modulo va
   importato anche dal server Express, che resta la fonte di verità.
   ===================================================================== */

/** @typedef {import("./lingua").Testo} Testo */

/**
 * Profilo dell'immobile letto dal motore.
 * @typedef {object} Profilo
 * @property {string} region       id della regione, per esempio "campania"
 * @property {string} comune
 * @property {number} units        immobili in affitto breve dello stesso proprietario, questo compreso
 * @property {boolean} services    servizi durante il soggiorno (colazione, pulizia giornaliera…)
 * @property {boolean} resides     il titolare vive nell'immobile
 * @property {number} rooms
 * @property {number} sqm
 * @property {number} floors
 * @property {boolean} condo
 * @property {boolean} nonResident proprietario non residente in Italia ai fini fiscali
 * @property {boolean} [conGestore] false se il proprietario gestisce da sé, senza mandato
 */

/** @typedef {"short_let" | "cav" | "cav_business" | "bnb"} Forma */
/** @typedef {"owner" | "pm" | "tech" | "accountant"} Chi */

/**
 * @typedef {object} Decisione
 * @property {Forma} form
 * @property {Testo[]} reasons
 * @property {Testo[]} notes
 * @property {object | null} rules   voce di REGION_RULES, o null se la regione non è configurata
 */

/**
 * @typedef {object} Passo
 * @property {string} id          chiave stabile: è con questa che si salva lo stato "fatto"
 * @property {1 | 2 | 3 | 4 | 5 | 6} phase
 * @property {Chi} who
 * @property {Testo} title
 * @property {Testo} detail
 * @property {boolean} blocking   blocca l'apertura
 * @property {boolean} regional
 * @property {boolean} todo       regola non ancora verificata per questa regione
 * @property {boolean} delegabile  un delegato del titolare (gestore, servizio di pratiche) può presentarla con delega firmata
 * @property {boolean} soloGestore obbligo di chi gestisce la struttura, con credenziali a suo nome
 * @property {Testo} [nota]        come si applicano delega o obbligo del gestore a questo passaggio
 * @property {string} [source]
 */

export const REGIONS = [
  ["abruzzo", "Abruzzo"],
  ["basilicata", "Basilicata"],
  ["calabria", "Calabria"],
  ["campania", "Campania"],
  ["emilia-romagna", "Emilia-Romagna"],
  ["friuli-venezia-giulia", "Friuli Venezia Giulia"],
  ["lazio", "Lazio"],
  ["liguria", "Liguria"],
  ["lombardia", "Lombardia"],
  ["marche", "Marche"],
  ["molise", "Molise"],
  ["piemonte", "Piemonte"],
  ["bolzano", "Provincia autonoma di Bolzano"],
  ["trento", "Provincia autonoma di Trento"],
  ["puglia", "Puglia"],
  ["sardegna", "Sardegna"],
  ["sicilia", "Sicilia"],
  ["toscana", "Toscana"],
  ["umbria", "Umbria"],
  ["valle-d-aosta", "Valle d'Aosta"],
  ["veneto", "Veneto"],
].map(([id, name]) => ({ id, name }));

export const regionName = (id) => REGIONS.find((r) => r.id === id)?.name ?? id;

export const REGION_RULES = {
  campania: {
    verifiedOn: "2026-10-07",
    bnbRequiresResidence: true,
    bnbMaxRooms: 4,
    cavNonBusinessMaxUnits: 3,
    lawBnb: "L.R. Campania 5/2001",
    lawCav: "L.R. Campania 17/2001",
    servicesCase: "TAR Campania, sent. 8128/2022",
    regionalCode: L("Codice regionale CUSR", "Regional code (CUSR)", "Regionalcode (CUSR)"),
    regionalCodeDetail: L(
      "Il Comune inserisce la struttura nella banca dati regionale e la Regione assegna il CUSR. Il titolare verifica e completa i dati con SPID o CIE.",
      "The municipality enters the property in the regional database and the Region assigns the CUSR. The holder checks and completes the data with SPID or CIE.",
      "Die Gemeinde trägt die Unterkunft in die regionale Datenbank ein, die Region vergibt den CUSR. Der Inhaber prüft und ergänzt die Daten mit SPID oder CIE.",
    ),
    regionalSource: "https://servizi-digitali.regione.campania.it/StruttureRicettive",
  },
};

export const FORMS = {
  short_let: { label: L("Locazione breve", "Short-term rental", "Kurzzeitvermietung"), filing: "notice" },
  cav: {
    label: L("Casa vacanze non imprenditoriale", "Holiday home, non-business", "Ferienwohnung, nicht gewerblich"),
    filing: "scia",
  },
  cav_business: {
    label: L("Casa vacanze in forma d'impresa", "Holiday home run as a business", "Gewerbliche Ferienwohnung"),
    filing: "scia",
  },
  bnb: { label: L("B&B a gestione familiare", "Family-run B&B", "Familiengeführtes B&B"), filing: "scia" },
};

/* ---------------------------------------------------------------------
   Decisione zero: quale forma
   --------------------------------------------------------------------- */
/**
 * @param {Profilo} p
 * @returns {Decisione}
 */
export function decideForm(p) {
  const r = REGION_RULES[p.region] ?? null;
  const reasons = [];
  const notes = [];
  const maxRooms = r ? r.bnbMaxRooms : null;

  if (p.resides) {
    if (maxRooms == null || p.rooms <= maxRooms) {
      reasons.push(
        L(
          "Il proprietario vive nell'immobile: è possibile il B&B a gestione familiare.",
          "The owner lives in the property: a family-run B&B is possible.",
          "Der Eigentümer wohnt in der Immobilie: ein familiengeführtes B&B ist möglich.",
        ),
      );
      if (r)
        reasons.push(
          L(
            `Limite regionale: ${maxRooms} camere (${r.lawBnb}).`,
            `Regional limit: ${maxRooms} rooms (${r.lawBnb}).`,
            `Regionale Grenze: ${maxRooms} Zimmer (${r.lawBnb}).`,
          ),
        );
      else
        notes.push(
          L(
            "Limiti regionali del B&B da verificare.",
            "Regional B&B limits to be checked.",
            "Regionale B&B-Grenzen sind zu prüfen.",
          ),
        );
      return { form: "bnb", reasons, notes, rules: r };
    }
    notes.push(
      L(
        `Oltre ${maxRooms} camere il B&B non è ammesso: serve un'altra tipologia ricettiva (per esempio affittacamere), da verificare con il Comune.`,
        `Above ${maxRooms} rooms a B&B is not allowed: another accommodation type is needed (for example guest rooms, "affittacamere"), to be checked with the municipality.`,
        `Über ${maxRooms} Zimmer ist kein B&B zulässig: Nötig ist eine andere Beherbergungsform (zum Beispiel Zimmervermietung, „affittacamere“), mit der Gemeinde zu klären.`,
      ),
    );
  } else if (r && r.bnbRequiresResidence) {
    notes.push(
      L(
        `B&B escluso: richiede che il titolare risieda nell'immobile (${r.lawBnb}).`,
        `B&B ruled out: the operator must live in the property (${r.lawBnb}).`,
        `B&B ausgeschlossen: Der Betreiber muss in der Immobilie wohnen (${r.lawBnb}).`,
      ),
    );
  } else if (!r) {
    notes.push(
      L(
        "Requisiti del B&B in questa regione da verificare.",
        "B&B requirements in this region to be checked.",
        "B&B-Anforderungen in dieser Region sind zu prüfen.",
      ),
    );
  }

  if (p.units >= 3) {
    reasons.push(
      L(
        "Dal terzo immobile in affitto breve scatta la presunzione d'impresa (L. 199/2025).",
        "From the third short-term rental property, business activity is presumed (Law 199/2025).",
        "Ab der dritten kurzzeitvermieteten Immobilie gilt die Tätigkeit als gewerblich (Gesetz 199/2025).",
      ),
    );
    return { form: "cav_business", reasons, notes, rules: r };
  }

  if (p.services) {
    reasons.push(
      L(
        "I servizi durante il soggiorno qualificano l'attività come casa vacanze, anche con contratti brevi.",
        "Services during the stay make it a holiday home, even with short contracts.",
        "Leistungen während des Aufenthalts machen daraus eine Ferienwohnung, auch bei kurzen Verträgen.",
      ),
    );
    if (r?.servicesCase)
      reasons.push(
        L(`Riferimento: ${r.servicesCase}.`, `Reference: ${r.servicesCase}.`, `Referenz: ${r.servicesCase}.`),
      );
    const cap = r ? r.cavNonBusinessMaxUnits : null;
    return { form: cap != null && p.units > cap ? "cav_business" : "cav", reasons, notes, rules: r };
  }

  reasons.push(
    L(
      "Solo alloggio, biancheria e pulizia finale, una o due unità: locazione breve con comunicazione al SUAP.",
      "Accommodation only, linen and final cleaning, one or two units: short-term rental with a notice to the SUAP.",
      "Nur Unterkunft, Wäsche und Endreinigung, ein oder zwei Einheiten: Kurzzeitvermietung mit Mitteilung an das SUAP.",
    ),
  );
  return { form: "short_let", reasons, notes, rules: r };
}

/** Uno ogni 200 m² o frazione, almeno uno per piano. */
export const extinguishers = (sqm, floors) => Math.max(Math.ceil((Number(sqm) || 0) / 200), Number(floors) || 1, 1);

/* ---------------------------------------------------------------------
   Piano dei passaggi. Ogni passaggio ha un id stabile, così lo stato
   "fatto" sopravvive ai cambi di profilo.
   --------------------------------------------------------------------- */
/**
 * @param {Profilo} p
 * @param {Decisione} decision
 * @returns {Passo[]}
 */
export function buildPlan(p, decision) {
  const r = decision.rules;
  const rName = regionName(p.region);
  const comune = p.comune || "—";
  const scia = FORMS[decision.form].filing === "scia";
  const n = extinguishers(p.sqm, p.floors);
  const steps = [];
  const add = (s) => steps.push({ blocking: false, regional: false, todo: false, delegabile: false, soloGestore: false, ...s });

  // Fase 1 — verifiche sull'immobile
  add({
    id: "p1-title",
    phase: 1,
    who: "owner",
    blocking: true,
    title: L(
      "Titolo di disponibilità e consenso dei comproprietari",
      "Proof of title and co-owners' consent",
      "Eigentumsnachweis und Zustimmung der Miteigentümer",
    ),
    detail: L(
      "Atto di proprietà o successione; consenso scritto degli eventuali comproprietari.",
      "Deed or inheritance documents; written consent of any co-owners.",
      "Kaufvertrag oder Erbnachweis; schriftliche Zustimmung etwaiger Miteigentümer.",
    ),
  });
  add({
    id: "p1-urban",
    phase: 1,
    who: "tech",
    blocking: true,
    title: L(
      "Conformità urbanistica e catastale",
      "Planning and land-registry compliance",
      "Baurechtliche und katastermäßige Konformität",
    ),
    detail: L(
      "Titolo edilizio e planimetria catastale coerenti con lo stato dei luoghi. Condoni pendenti o difformità vanno chiusi prima.",
      "Building permit and cadastral plan must match the property as it stands. Pending amnesty applications or discrepancies must be resolved first.",
      "Baugenehmigung und Katasterplan müssen dem tatsächlichen Zustand entsprechen. Offene Legalisierungsverfahren oder Abweichungen sind vorher zu klären.",
    ),
  });
  add({
    id: "p1-use",
    phase: 1,
    who: "tech",
    blocking: true,
    title: L(
      "Destinazione d'uso abitativa e agibilità",
      "Residential use and habitability certificate",
      "Wohnnutzung und Bewohnbarkeitsbescheinigung",
    ),
    detail: L(
      "Visura catastale in categoria abitativa e agibilità.",
      "Cadastral record in a residential category and habitability certificate.",
      "Katasterauszug in Wohnkategorie und Bewohnbarkeitsbescheinigung.",
    ),
  });
  add({
    id: "p1-hygiene",
    phase: 1,
    who: "tech",
    title: L(
      "Requisiti igienico-sanitari (DM 5 luglio 1975)",
      "Health and hygiene standards (Ministerial Decree of 5 July 1975)",
      "Hygieneanforderungen (Ministerialdekret vom 5. Juli 1975)",
    ),
    detail: L(
      "Altezza minima 2,70 m; camera singola 9 m², doppia 14 m²; soggiorno 14 m²; finestre apribili. Fissa i posti letto dichiarabili.",
      "Minimum ceiling height 2.70 m; single room 9 m², double 14 m²; living room 14 m²; opening windows. This sets the beds you can declare.",
      "Mindestraumhöhe 2,70 m; Einzelzimmer 9 m², Doppelzimmer 14 m²; Wohnraum 14 m²; zu öffnende Fenster. Daraus ergibt sich die Bettenzahl.",
    ),
  });
  if (p.condo)
    add({
      id: "p1-condo",
      phase: 1,
      who: "owner",
      title: L("Regolamento di condominio", "Condominium rules", "Hausordnung der Eigentümergemeinschaft"),
      detail: L(
        "Verificare clausole che vietano usi ricettivi; in caso di dubbio, parere legale prima di partire.",
        "Check for clauses that ban hospitality use; if in doubt, get legal advice before starting.",
        "Auf Klauseln prüfen, die eine Beherbergung untersagen; im Zweifel vorher rechtlich beraten lassen.",
      ),
    });
  add({
    id: "p1-systems",
    phase: 1,
    who: "tech",
    title: L(
      "Impianti: conformità elettrico e gas, libretto caldaia",
      "Systems: electrical and gas certificates, boiler logbook",
      "Anlagen: Elektro- und Gaskonformität, Heizkesselbuch",
    ),
    detail: L(
      "Dichiarazioni di conformità (DM 37/2008) e manutenzione aggiornata.",
      "Compliance declarations (DM 37/2008) and up-to-date maintenance.",
      "Konformitätserklärungen (DM 37/2008) und aktuelle Wartung.",
    ),
  });

  // Fase 2 — dotazioni di sicurezza (nazionale, art. 13-ter D.L. 145/2023)
  add({
    id: "p2-gas",
    phase: 2,
    who: "pm",
    blocking: true,
    title: L("Rilevatore di gas combustibili", "Combustible gas detector", "Gasmelder"),
    detail: L(
      "Obbligatorio per il CIN (art. 13-ter D.L. 145/2023). Sanzione da 600 a 6.000 €.",
      "Required for the CIN (art. 13-ter Decree-Law 145/2023). Fine from €600 to €6,000.",
      "Pflicht für den CIN (Art. 13-ter Gesetzesdekret 145/2023). Bußgeld 600 bis 6.000 €.",
    ),
  });
  add({
    id: "p2-co",
    phase: 2,
    who: "pm",
    blocking: true,
    title: L("Rilevatore di monossido di carbonio", "Carbon monoxide detector", "Kohlenmonoxidmelder"),
    detail: L(
      "Vicino a caldaia, camino o stufa.",
      "Near the boiler, fireplace or stove.",
      "In der Nähe von Heizkessel, Kamin oder Ofen.",
    ),
  });
  add({
    id: "p2-ext",
    phase: 2,
    who: "pm",
    blocking: true,
    title: L(
      `${n} ${n === 1 ? "estintore" : "estintori"}`,
      `${n} fire ${n === 1 ? "extinguisher" : "extinguishers"}`,
      `${n} Feuerlöscher`,
    ),
    detail: L(
      `Uno ogni 200 m² o frazione, almeno uno per piano: ${p.sqm} m² su ${p.floors} ${Number(p.floors) === 1 ? "piano" : "piani"}.`,
      `One per 200 m² or part thereof, at least one per floor: ${p.sqm} m² on ${p.floors} ${Number(p.floors) === 1 ? "floor" : "floors"}.`,
      `Einer je angefangene 200 m², mindestens einer pro Etage: ${p.sqm} m² auf ${p.floors} ${Number(p.floors) === 1 ? "Etage" : "Etagen"}.`,
    ),
  });
  add({
    id: "p2-proof",
    phase: 2,
    who: "pm",
    title: L(
      "Foto datate e fatture dei dispositivi",
      "Dated photos and receipts for the devices",
      "Datierte Fotos und Belege der Geräte",
    ),
    detail: L(
      "Sono la prova da mostrare in un controllo della polizia locale.",
      "This is the proof to show during a local police inspection.",
      "Das ist der Nachweis bei einer Kontrolle der Ortspolizei.",
    ),
  });

  // Fase 3 — registrazioni
  add({
    id: "p3-suap",
    phase: 3,
    who: "pm",
    blocking: true,
    delegabile: true,
    title: scia
      ? L(
          `SCIA al SUAP del Comune di ${comune}`,
          `SCIA filing with the SUAP of ${comune}`,
          `SCIA beim SUAP der Gemeinde ${comune}`,
        )
      : L(
          `Comunicazione al SUAP del Comune di ${comune}`,
          `Notice to the SUAP of ${comune}`,
          `Mitteilung an das SUAP der Gemeinde ${comune}`,
        ),
    detail: L(
      "Su impresainungiorno.gov.it. Allegati: documento, planimetria firmata dal tecnico, delega se presenta il gestore." +
        (scia ? " Diritti di istruttoria secondo il Comune." : " Gratuita."),
      "On impresainungiorno.gov.it. Attach ID, a floor plan signed by the surveyor and a proxy if the manager files." +
        (scia ? " Filing fees set by the municipality." : " Free of charge."),
      "Über impresainungiorno.gov.it. Anlagen: Ausweis, vom Techniker unterzeichneter Grundriss, Vollmacht falls der Verwalter einreicht." +
        (scia ? " Gebühren legt die Gemeinde fest." : " Kostenlos."),
    ),
    nota: L(
      "La può presentare un delegato del titolare, per esempio il gestore, con la delega firmata.",
      "A delegate of the holder, such as the manager, can file it with a signed proxy.",
      "Ein Bevollmächtigter des Inhabers, etwa der Verwalter, kann sie mit unterschriebener Vollmacht einreichen.",
    ),
  });
  if (r)
    add({
      id: "p3-regcode",
      phase: 3,
      who: "owner",
      blocking: true,
      regional: true,
      title: r.regionalCode,
      detail: r.regionalCodeDetail,
      source: r.regionalSource,
    });
  else
    add({
      id: "p3-regcode",
      phase: 3,
      who: "pm",
      blocking: true,
      regional: true,
      todo: true,
      title: L(
        "Codice o registrazione regionale",
        "Regional code or registration",
        "Regionaler Code oder Registrierung",
      ),
      detail: L(
        `Procedura di ${rName} non ancora configurata: da verificare prima della richiesta del CIN.`,
        `The ${rName} procedure is not configured yet: check it before requesting the CIN.`,
        `Das Verfahren in ${rName} ist noch nicht hinterlegt: vor dem CIN-Antrag prüfen.`,
      ),
    });
  add({
    id: "p3-cin",
    phase: 3,
    who: "owner",
    blocking: true,
    delegabile: true,
    title: L(
      "CIN nella Banca dati strutture ricettive (BDSR)",
      "CIN in the national accommodation database (BDSR)",
      "CIN in der nationalen Unterkunftsdatenbank (BDSR)",
    ),
    detail: L(
      "Con SPID o CIE sul portale del Ministero del Turismo, quando i dati regionali sono disponibili. Senza CIN: sanzione da 800 a 8.000 €.",
      "With SPID or CIE on the Ministry of Tourism portal, once the regional data is available. Without a CIN: fine from €800 to €8,000.",
      "Mit SPID oder CIE im Portal des Tourismusministeriums, sobald die regionalen Daten vorliegen. Ohne CIN: Bußgeld 800 bis 8.000 €.",
    ),
    nota: L(
      "Lo può richiedere un delegato: entra con il proprio SPID e carica la delega firmata e il documento del titolare. Lo SPID del titolare non si usa mai.",
      "A delegate can request it: they sign in with their own SPID and upload the signed proxy and the holder's ID. The holder's SPID is never used.",
      "Ein Bevollmächtigter kann ihn beantragen: mit eigenem SPID, unterschriebener Vollmacht und Ausweis des Inhabers. Das SPID des Inhabers wird nie verwendet.",
    ),
  });
  add({
    id: "p3-display",
    phase: 3,
    who: "pm",
    blocking: true,
    title: L(
      "CIN esposto all'esterno e in ogni annuncio",
      "CIN displayed outside and in every listing",
      "CIN außen und in jeder Anzeige angegeben",
    ),
    detail: L(
      "Mancata esposizione: sanzione da 500 a 5.000 €.",
      "Not displayed: fine from €500 to €5,000.",
      "Fehlende Angabe: Bußgeld 500 bis 5.000 €.",
    ),
  });

  // Fase 4 — Questura, statistica, imposta di soggiorno: restano al gestore
  const notaGestore = L(
    "Obbligo di chi gestisce la struttura, con credenziali a suo nome.",
    "A duty of whoever runs the property, with credentials in their own name.",
    "Pflicht des Betreibers der Unterkunft, mit Zugangsdaten auf seinen Namen.",
  );
  add({
    id: "p4-police",
    phase: 4,
    who: "pm",
    blocking: true,
    soloGestore: true,
    nota: notaGestore,
    title: L(
      "Credenziali Alloggiati Web dalla Questura",
      "Alloggiati Web credentials from the police (Questura)",
      "Alloggiati-Web-Zugang von der Questura",
    ),
    detail: L(
      "Schedina per ogni ospite entro 24 ore dall'arrivo; l'omissione ha rilevanza penale.",
      "A registration slip for every guest within 24 hours of arrival; failure is a criminal offence.",
      "Meldeschein für jeden Gast innerhalb von 24 Stunden nach Ankunft; Versäumnis ist strafbar.",
    ),
  });
  add({
    id: "p4-istat",
    phase: 4,
    who: "pm",
    todo: !r,
    title: L(
      "Canale dei flussi statistici ISTAT",
      "ISTAT statistics reporting channel",
      "Meldeweg für ISTAT-Statistiken",
    ),
    detail: L(
      "Con la cadenza indicata da Regione e Comune.",
      "At the frequency set by the Region and municipality.",
      "In dem von Region und Gemeinde vorgegebenen Rhythmus.",
    ),
  });
  add({
    id: "p4-tax",
    phase: 4,
    who: "pm",
    soloGestore: true,
    nota: notaGestore,
    title: L(`Imposta di soggiorno di ${comune}`, `Tourist tax of ${comune}`, `Kurtaxe der Gemeinde ${comune}`),
    detail: L(
      "Verificare se il Comune la applica. Tariffe, stagioni ed esenzioni secondo il regolamento comunale; chi riscuote è agente contabile.",
      "Check whether the municipality applies it. Rates, seasons and exemptions follow the municipal regulation; whoever collects it acts as a tax agent.",
      "Prüfen, ob die Gemeinde sie erhebt. Sätze, Saisons und Befreiungen nach Gemeindesatzung; wer erhebt, handelt als Rechnungsführer.",
    ),
  });

  // Fase 5 — fiscalità (nazionale)
  if (p.units >= 3 || decision.form === "cav_business") {
    add({
      id: "p5-business",
      phase: 5,
      who: "accountant",
      blocking: true,
      title: L(
        "Attività d'impresa: partita IVA e regime fiscale",
        "Business activity: VAT number and tax regime",
        "Gewerbliche Tätigkeit: USt-Nummer und Steuerregime",
      ),
      detail: L(
        "Dal terzo immobile in affitto breve si esce dalla cedolare (L. 199/2025). Da impostare con il commercialista prima di aprire.",
        "From the third short-term rental property the flat-rate tax no longer applies (Law 199/2025). Set up with the accountant before opening.",
        "Ab der dritten kurzzeitvermieteten Immobilie entfällt die Pauschalsteuer (Gesetz 199/2025). Vor der Eröffnung mit dem Steuerberater klären.",
      ),
    });
  } else if (decision.form === "short_let") {
    add({
      id: "p5-cedolare",
      phase: 5,
      who: "accountant",
      title:
        p.units === 2
          ? L(
              "Cedolare 21% su un immobile, 26% sull'altro",
              "Flat-rate tax: 21% on one property, 26% on the other",
              "Pauschalsteuer: 21 % auf eine Immobilie, 26 % auf die andere",
            )
          : L("Cedolare secca al 21%", "Flat-rate tax (cedolare) at 21%", "Pauschalsteuer (Cedolare) 21 %"),
      detail:
        p.units === 2
          ? L(
              "Se l'intermediario trattiene solo il 21%, la differenza si versa in dichiarazione.",
              "If the intermediary withholds only 21%, the difference is paid in the tax return.",
              "Behält der Vermittler nur 21 % ein, wird die Differenz mit der Steuererklärung gezahlt.",
            )
          : L(
              "In alternativa IRPEF ordinaria. Nessuna partita IVA.",
              "Alternatively ordinary income tax. No VAT number needed.",
              "Alternativ reguläre Einkommensteuer. Keine USt-Nummer nötig.",
            ),
    });
  } else {
    add({
      id: "p5-regime",
      phase: 5,
      who: "accountant",
      blocking: true,
      title: L("Regime fiscale della struttura", "Tax regime of the accommodation", "Steuerregime der Unterkunft"),
      detail: L(
        "Per B&B e casa vacanze il regime va definito con il commercialista prima di aprire.",
        "For a B&B or holiday home the regime must be set with the accountant before opening.",
        "Für B&B und Ferienwohnung ist das Regime vor der Eröffnung mit dem Steuerberater festzulegen.",
      ),
    });
  }
  add({
    id: "p5-withholding",
    phase: 5,
    who: "pm",
    title: L(
      "Ritenuta del 21% e Certificazione Unica",
      "21% withholding and annual certificate (CU)",
      "21 % Quellensteuer und Jahresbescheinigung (CU)",
    ),
    detail: L(
      "Chi incassa per conto del proprietario trattiene il 21% e rilascia la CU entro il 16 marzo.",
      "Whoever collects on the owner's behalf withholds 21% and issues the CU by 16 March.",
      "Wer für den Eigentümer kassiert, behält 21 % ein und stellt die CU bis 16. März aus.",
    ),
  });
  if (p.nonResident)
    add({
      id: "p5-nonres",
      phase: 5,
      who: "accountant",
      title: L(
        "Dichiarazione dei redditi per non residenti",
        "Italian tax return for non-residents",
        "Italienische Steuererklärung für Nichtansässige",
      ),
      detail: L(
        "Serve il codice fiscale italiano e, di norma, un commercialista in Italia.",
        "An Italian tax code is required and, as a rule, an accountant in Italy.",
        "Erforderlich sind eine italienische Steuernummer und in der Regel ein Steuerberater in Italien.",
      ),
    });

  // Fase 6 — apertura
  if (p.conGestore !== false)
    add({
      id: "p6-mandate",
      phase: 6,
      who: "pm",
      blocking: true,
      title: L("Mandato di gestione firmato", "Management mandate signed", "Verwaltungsmandat unterzeichnet"),
      detail: L(
        "Con flusso del denaro, uso personale e soglia di spesa per la manutenzione.",
        "Covering money flows, owner use and the maintenance spending threshold.",
        "Mit Geldfluss, Eigennutzung und Ausgabengrenze für Instandhaltung.",
      ),
    });
  add({
    id: "p6-insurance",
    phase: 6,
    who: "owner",
    blocking: true,
    title: L(
      "Assicurazione responsabilità civile e danni",
      "Liability and property damage insurance",
      "Haftpflicht- und Sachschadenversicherung",
    ),
    detail: L("Copre ospiti e immobile.", "Covers guests and the property.", "Deckt Gäste und Immobilie ab."),
  });
  add({
    id: "p6-listing",
    phase: 6,
    who: "pm",
    blocking: true,
    title: L(
      "Annunci con CIN e posti letto dichiarati",
      "Listings with CIN and declared beds",
      "Anzeigen mit CIN und gemeldeter Bettenzahl",
    ),
    detail: L(
      "I posti letto in annuncio devono coincidere con quelli comunicati al SUAP.",
      "Beds in the listing must match those filed with the SUAP.",
      "Die Betten in der Anzeige müssen mit den beim SUAP gemeldeten übereinstimmen.",
    ),
  });
  add({
    id: "p6-inventory",
    phase: 6,
    who: "pm",
    title: L("Inventario fotografico e kit ospite", "Photo inventory and guest kit", "Fotoinventar und Gästemappe"),
    detail: L(
      "Istruzioni impianti, numeri di emergenza, raccolta differenziata del Comune.",
      "System instructions, emergency numbers, municipal waste sorting rules.",
      "Anleitungen, Notrufnummern, Mülltrennung der Gemeinde.",
    ),
  });

  return steps;
}

export const PHASES = [1, 2, 3, 4, 5, 6];

/** Piano completo in una chiamata: decisione e passaggi. */
/**
 * @param {Profilo} p
 * @returns {{ decisione: Decisione, passi: Passo[] }}
 */
export function pianoPer(p) {
  const decisione = decideForm(p);
  return { decisione, passi: buildPlan(p, decisione) };
}

/**
 * Piano con lo stato dei passaggi già fatti.
 * @param {Profilo} p
 * @param {Record<string, boolean>} [fatti]  { [passoId]: true }
 * @returns {{ decisione: Decisione, passi: Passo[], fatti: Record<string, boolean>, completati: number, bloccantiAperti: Passo[] }}
 */
export function statoPiano(p, fatti = {}) {
  const { decisione, passi } = pianoPer(p);
  return {
    decisione,
    passi,
    fatti,
    completati: passi.filter((s) => fatti[s.id]).length,
    bloccantiAperti: passi.filter((s) => s.blocking && !fatti[s.id]),
  };
}
