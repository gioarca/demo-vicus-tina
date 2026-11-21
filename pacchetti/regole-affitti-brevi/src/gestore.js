import { FISCO_2026, giornoUtile } from "./fisco.js";
import { L } from "./lingua.js";

/* =====================================================================
   Obblighi di chi gestisce affitti brevi per conto dei proprietari.
   Valgono per il gestore come attività, non per il singolo immobile:
   quelli dell'immobile stanno nel playbook (regole.js).
   Ogni voce ha una regola di scadenza leggibile da prossimaScadenza().
   ===================================================================== */

/** @typedef {import("./lingua.js").Testo} Testo */

/**
 * @typedef {{ tipo: "una_tantum" } | { tipo: "continuo" } | { tipo: "entro_ore", ore: number }
 *   | { tipo: "mensile", giorno: number } | { tipo: "annuale", mmgg: string }
 *   | { tipo: "date", mmgg: string[] } | { tipo: "per_comune" }} RegolaScadenza
 */

/**
 * @typedef {object} ProfiloGestore
 * @property {"forfettario" | "ordinario"} regime
 * @property {boolean} incassaCanoni     riceve i pagamenti degli ospiti per conto dei proprietari
 * @property {boolean} riscuoteSoggiorno riscuote l'imposta di soggiorno
 * @property {boolean} partner           incassa commissioni da transfer, escursioni, noleggi
 */

/**
 * @typedef {object} AdempimentoGestore
 * @property {string} id
 * @property {"avvio" | "mandati" | "ospiti" | "soggiorno" | "fisco" | "pagamenti" | "privacy" | "assicurazioni"} area
 * @property {"pm" | "accountant"} who
 * @property {Testo} title
 * @property {Testo} detail
 * @property {RegolaScadenza} scadenza
 * @property {boolean} obbligo     false: consigliato, non imposto da una norma
 * @property {boolean} daVerificare
 * @property {string} [source]
 * @property {(p: ProfiloGestore) => boolean} [quando]
 */

export const AREE_GESTORE = ["avvio", "mandati", "ospiti", "soggiorno", "fisco", "pagamenti", "privacy", "assicurazioni"];

/** @type {AdempimentoGestore[]} */
const VOCI = [
  {
    id: "g-piva",
    area: "avvio",
    who: "accountant",
    title: L("Partita IVA con i codici ATECO giusti", "VAT number with the right ATECO codes", "Umsatzsteuer-Nr. mit den richtigen ATECO-Codes"),
    detail: L(
      "Gestione di immobili per conto terzi e, se incassi commissioni dai partner, un codice per i servizi turistici. Nel forfettario il codice decide il coefficiente di reddito.",
      "Property management for third parties and, if you earn partner commissions, a code for tourist services. Under the flat-rate regime the code sets the income coefficient.",
      "Immobilienverwaltung für Dritte und, bei Partnerprovisionen, ein Code für touristische Leistungen. Im Pauschalregime bestimmt der Code den Ertragskoeffizienten.",
    ),
    scadenza: { tipo: "una_tantum" },
    obbligo: true,
    daVerificare: false,
    source: "D.P.R. 633/1972, art. 35",
  },
  {
    id: "g-cciaa",
    area: "avvio",
    who: "accountant",
    title: L("Registro imprese e diritto annuale", "Company register and annual fee", "Handelsregister und Jahresgebühr"),
    detail: L(
      "Iscrizione alla Camera di commercio (REA). Il diritto annuale si versa con il saldo delle imposte.",
      "Registration with the Chamber of Commerce (REA). The annual fee is paid with the tax balance.",
      "Eintragung bei der Handelskammer (REA). Die Jahresgebühr wird mit der Steuerabschlusszahlung entrichtet.",
    ),
    scadenza: { tipo: "annuale", mmgg: FISCO_2026.acconti.saldo },
    obbligo: true,
    daVerificare: false,
    source: "L. 580/1993, art. 18",
  },
  {
    id: "g-inps",
    area: "avvio",
    who: "pm",
    title: L("Contributi INPS commercianti", "INPS contributions (traders)", "INPS-Beiträge (Kaufleute)"),
    detail: L(
      "Fissi in quattro rate e, sopra il minimale, contributi sul reddito insieme alle imposte. La riduzione del 35% per i forfettari si chiede entro il 28 febbraio.",
      "Fixed amount in four instalments and, above the minimum, contributions on income paid with taxes. The 35% reduction for flat-rate taxpayers must be requested by 28 February.",
      "Fixbeträge in vier Raten und, über dem Mindestbetrag, einkommensabhängige Beiträge mit den Steuern. Die 35-%-Ermäßigung für Pauschalbesteuerte ist bis 28. Februar zu beantragen.",
    ),
    scadenza: { tipo: "date", mmgg: FISCO_2026.inps.rateFisse },
    obbligo: true,
    daVerificare: false,
    source: FISCO_2026.inps.fonte,
  },
  {
    id: "g-forf",
    area: "fisco",
    who: "accountant",
    title: L("Requisiti del forfettario", "Flat-rate regime requirements", "Voraussetzungen des Pauschalregimes"),
    detail: L(
      "Ricavi sotto 85.000 €: oltre si esce dall'anno dopo, oltre 100.000 € si esce subito. Va controllato anche il limite sui redditi da lavoro dipendente.",
      "Revenue below €85,000: above it you leave the regime the following year, above €100,000 immediately. The employment-income limit must also be checked.",
      "Einnahmen unter 85.000 €: darüber endet das Regime im Folgejahr, über 100.000 € sofort. Auch die Grenze für Einkünfte aus nichtselbständiger Arbeit ist zu prüfen.",
    ),
    scadenza: { tipo: "continuo" },
    obbligo: true,
    daVerificare: false,
    source: FISCO_2026.forfettario.fonte,
    quando: (p) => p.regime === "forfettario",
  },
  {
    id: "g-mandato",
    area: "mandati",
    who: "pm",
    title: L("Mandato scritto con ogni proprietario", "Written mandate with every owner", "Schriftliches Mandat mit jedem Eigentümer"),
    detail: L(
      "Compenso, spese che puoi decidere da solo e soglia oltre la quale serve l'ok, incasso dei canoni, ritenute, imposta di soggiorno. Le decisioni del proprietario contrarie al mandato vanno messe per iscritto.",
      "Fee, costs you may approve alone and the threshold above which approval is needed, collection of payments, withholding, tourist tax. Owner decisions that go against the mandate should be put in writing.",
      "Vergütung, Kosten, die Sie allein freigeben dürfen, und die Schwelle für eine Freigabe, Inkasso, Steuereinbehalt, Kurtaxe. Entscheidungen des Eigentümers gegen das Mandat schriftlich festhalten.",
    ),
    scadenza: { tipo: "una_tantum" },
    obbligo: true,
    daVerificare: false,
    source: "Codice civile, artt. 1703 e seguenti",
  },
  {
    id: "g-ritenute",
    area: "fisco",
    who: "pm",
    title: L("Ritenuta del 21% sui canoni incassati", "21% withholding on payments collected", "21 % Steuereinbehalt auf vereinnahmte Mieten"),
    detail: L(
      "Se incassi o intervieni nel pagamento dei canoni trattieni il 21% e lo versi con F24, codice tributo 1919, entro il 16 del mese dopo. Come si applica a chi è in forfettario va confermato con il commercialista.",
      "If you collect or are involved in the rent payment, withhold 21% and pay it by F24, tax code 1919, by the 16th of the following month. How this applies to flat-rate taxpayers must be confirmed with the accountant.",
      "Wer Mieten vereinnahmt oder an der Zahlung mitwirkt, behält 21 % ein und zahlt sie per F24, Steuercode 1919, bis zum 16. des Folgemonats ab. Die Anwendung im Pauschalregime mit dem Steuerberater klären.",
    ),
    scadenza: { tipo: "mensile", giorno: 16 },
    obbligo: true,
    daVerificare: true,
    source: FISCO_2026.cedolare.fonte,
    quando: (p) => p.incassaCanoni,
  },
  {
    id: "g-cu",
    area: "fisco",
    who: "accountant",
    title: L("Certificazione Unica ai proprietari", "Certificazione Unica to owners", "Certificazione Unica an die Eigentümer"),
    detail: L(
      "Per ogni proprietario a cui hai trattenuto la ritenuta: canoni e ritenute dell'anno.",
      "For every owner you withheld tax from: payments and withholdings for the year.",
      "Für jeden Eigentümer mit Steuereinbehalt: Mieten und Einbehalte des Jahres.",
    ),
    scadenza: { tipo: "annuale", mmgg: "03-16" },
    obbligo: true,
    daVerificare: false,
    source: "D.P.R. 322/1998, art. 4",
    quando: (p) => p.incassaCanoni,
  },
  {
    id: "g-770",
    area: "fisco",
    who: "accountant",
    title: L("Modello 770 dei sostituti d'imposta", "Form 770 (withholding agents)", "Formular 770 (Steuereinbehalt)"),
    detail: L("Riepilogo annuale delle ritenute versate.", "Annual summary of the withholdings paid.", "Jährliche Zusammenfassung der abgeführten Einbehalte."),
    scadenza: { tipo: "annuale", mmgg: "10-31" },
    obbligo: true,
    daVerificare: false,
    source: "D.P.R. 322/1998, art. 4",
    quando: (p) => p.incassaCanoni,
  },
  {
    id: "g-dati",
    area: "fisco",
    who: "pm",
    title: L("Dati dei contratti all'Agenzia delle Entrate", "Contract data to the Revenue Agency", "Vertragsdaten an die Steuerbehörde"),
    detail: L(
      "Come intermediario comunichi i dati delle locazioni brevi concluse con il tuo intervento.",
      "As an intermediary you report the short-let contracts concluded through you.",
      "Als Vermittler melden Sie die über Sie geschlossenen Kurzzeitmietverträge.",
    ),
    scadenza: { tipo: "annuale", mmgg: "06-30" },
    obbligo: true,
    daVerificare: false,
    source: "D.L. 50/2017, art. 4, comma 4",
  },
  {
    id: "g-alloggiati",
    area: "ospiti",
    who: "pm",
    title: L("Schedine Alloggiati Web entro 24 ore", "Alloggiati Web guest reports within 24 hours", "Alloggiati-Web-Meldung binnen 24 Stunden"),
    detail: L(
      "Per ogni ospite, dall'arrivo, con le credenziali della Questura intestate a chi gestisce.",
      "For every guest from arrival, using police credentials in the manager's name.",
      "Für jeden Gast ab Ankunft, mit Zugangsdaten der Questura auf den Verwalter.",
    ),
    scadenza: { tipo: "entro_ore", ore: 24 },
    obbligo: true,
    daVerificare: false,
    source: "R.D. 773/1931 (TULPS), art. 109",
  },
  {
    id: "g-istat",
    area: "ospiti",
    who: "pm",
    title: L("Movimento ospiti per la statistica", "Guest movement for official statistics", "Gästemeldung für die Statistik"),
    detail: L(
      "Arrivi e presenze del mese sulla piattaforma regionale. Piattaforma e termine cambiano da regione a regione.",
      "Arrivals and nights of the month on the regional platform. Platform and deadline vary by region.",
      "Ankünfte und Übernachtungen des Monats auf der regionalen Plattform. Plattform und Frist variieren je Region.",
    ),
    scadenza: { tipo: "mensile", giorno: 5 },
    obbligo: true,
    daVerificare: true,
    source: "D.Lgs. 322/1989, Programma statistico nazionale",
  },
  {
    id: "g-soggiorno",
    area: "soggiorno",
    who: "pm",
    title: L("Riversamento dell'imposta di soggiorno", "Paying over the tourist tax", "Abführung der Kurtaxe"),
    detail: L(
      "A ogni Comune, con le sue tariffe e le sue scadenze. Chi incassa è responsabile d'imposta.",
      "To each municipality, with its own rates and deadlines. Whoever collects is liable for the tax.",
      "An jede Gemeinde, mit eigenen Tarifen und Fristen. Wer kassiert, haftet für die Steuer.",
    ),
    scadenza: { tipo: "per_comune" },
    obbligo: true,
    daVerificare: false,
    source: "D.L. 50/2017, art. 4, comma 5-ter; D.L. 34/2020, art. 180",
    quando: (p) => p.riscuoteSoggiorno,
  },
  {
    id: "g-soggiorno-dich",
    area: "soggiorno",
    who: "pm",
    title: L("Dichiarazione annuale dell'imposta di soggiorno", "Annual tourist tax return", "Jährliche Kurtaxe-Erklärung"),
    detail: L(
      "Una per Comune, per l'anno precedente, come responsabile d'imposta.",
      "One per municipality, for the previous year, as the liable party.",
      "Eine pro Gemeinde für das Vorjahr, als Steuerschuldner.",
    ),
    scadenza: { tipo: "annuale", mmgg: "06-30" },
    obbligo: true,
    daVerificare: false,
    source: "D.L. 34/2020, art. 180, comma 3",
    quando: (p) => p.riscuoteSoggiorno,
  },
  {
    id: "g-fe",
    area: "fisco",
    who: "pm",
    title: L("Fattura elettronica per fee e commissioni", "E-invoices for fees and commissions", "E-Rechnung für Gebühren und Provisionen"),
    detail: L(
      "Obbligatoria anche nel forfettario, anche verso proprietari esteri. Senza IVA, sopra 77,47 € serve il bollo da 2 €.",
      "Mandatory under the flat-rate regime too, including foreign owners. Without VAT, above €77.47 a €2 stamp duty applies.",
      "Auch im Pauschalregime Pflicht, auch gegenüber ausländischen Eigentümern. Ohne MwSt. fällt über 77,47 € eine Stempelsteuer von 2 € an.",
    ),
    scadenza: { tipo: "continuo" },
    obbligo: true,
    daVerificare: false,
    source: "D.L. 36/2022, art. 18",
  },
  {
    id: "g-bollo",
    area: "fisco",
    who: "pm",
    title: L("Bollo sulle fatture elettroniche", "Stamp duty on e-invoices", "Stempelsteuer auf E-Rechnungen"),
    detail: L(
      "Si versa a trimestre, calcolato dall'Agenzia sulle fatture inviate.",
      "Paid quarterly, calculated by the Revenue Agency from the invoices sent.",
      "Vierteljährlich, von der Steuerbehörde aus den gesendeten Rechnungen berechnet.",
    ),
    scadenza: { tipo: "date", mmgg: FISCO_2026.bollo.scadenze },
    obbligo: true,
    daVerificare: false,
    source: "D.M. 17 giugno 2014, art. 6",
    quando: (p) => p.regime === "forfettario",
  },
  {
    id: "g-redditi",
    area: "fisco",
    who: "accountant",
    title: L("Dichiarazione dei redditi", "Income tax return", "Einkommensteuererklärung"),
    detail: L("Modello Redditi PF con il quadro del forfettario.", "Redditi PF form with the flat-rate section.", "Formular Redditi PF mit dem Abschnitt für das Pauschalregime."),
    scadenza: { tipo: "annuale", mmgg: "10-31" },
    obbligo: true,
    daVerificare: false,
    source: "D.P.R. 322/1998, art. 2",
  },
  {
    id: "g-contanti",
    area: "pagamenti",
    who: "pm",
    title: L("Contanti sotto i 5.000 €", "Cash under €5,000", "Bargeld unter 5.000 €"),
    detail: L(
      "Ogni pagamento tra soggetti diversi resta sotto i 5.000 €. Un pagamento unico non si può spezzare per stare sotto la soglia.",
      "Every payment between different parties stays below €5,000. A single payment cannot be split to stay under the limit.",
      "Jede Zahlung zwischen verschiedenen Parteien bleibt unter 5.000 €. Eine Zahlung darf nicht gestückelt werden, um darunter zu bleiben.",
    ),
    scadenza: { tipo: "continuo" },
    obbligo: true,
    daVerificare: false,
    source: FISCO_2026.contanti.fonte,
  },
  {
    id: "g-gdpr",
    area: "privacy",
    who: "pm",
    title: L("Privacy degli ospiti", "Guest privacy", "Datenschutz der Gäste"),
    detail: L(
      "Informativa, registro dei trattamenti, nomina dei fornitori software come responsabili, documenti d'identità non conservati oltre il necessario, dati in Europa.",
      "Privacy notice, record of processing, software vendors appointed as processors, ID documents not kept longer than needed, data stored in Europe.",
      "Datenschutzhinweis, Verarbeitungsverzeichnis, Softwareanbieter als Auftragsverarbeiter, Ausweise nicht länger als nötig aufbewahren, Daten in Europa.",
    ),
    scadenza: { tipo: "continuo" },
    obbligo: true,
    daVerificare: false,
    source: "Reg. UE 2016/679, artt. 13, 28, 30",
  },
  {
    id: "g-rc",
    area: "assicurazioni",
    who: "pm",
    title: L("Responsabilità civile del gestore", "Manager's liability insurance", "Haftpflicht des Verwalters"),
    detail: L(
      "Copre i danni a ospiti e terzi causati nella gestione. Non sostituisce la polizza del proprietario sull'immobile.",
      "Covers damage to guests and third parties caused while managing. It does not replace the owner's property insurance.",
      "Deckt Schäden an Gästen und Dritten aus der Verwaltung. Ersetzt nicht die Gebäudeversicherung des Eigentümers.",
    ),
    scadenza: { tipo: "una_tantum" },
    obbligo: false,
    daVerificare: false,
  },
];

export const ADEMPIMENTI_GESTORE = Object.freeze(VOCI);

/** Le voci che valgono per questo gestore. */
export const adempimentiGestore = (p) => VOCI.filter((v) => !v.quando || v.quando(p));

const iso = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/**
 * Prossima scadenza di una regola a partire da oggi (compreso), spostata al lunedì
 * se cade nel fine settimana. Null per le regole senza data fissa.
 * @param {RegolaScadenza} regola
 * @param {string} oggi  "AAAA-MM-GG"
 */
export function prossimaScadenza(regola, oggi) {
  const [y, m] = oggi.split("-").map(Number);
  const prima = (candidati) => candidati.map(giornoUtile).filter((d) => d >= oggi).sort()[0] ?? null;
  switch (regola.tipo) {
    case "mensile":
      return prima([iso(y, m, regola.giorno), m === 12 ? iso(y + 1, 1, regola.giorno) : iso(y, m + 1, regola.giorno)]);
    case "annuale":
      return prima([`${y}-${regola.mmgg}`, `${y + 1}-${regola.mmgg}`]);
    case "date":
      return prima(regola.mmgg.flatMap((d) => [`${y}-${d}`, `${y + 1}-${d}`]));
    default:
      return null;
  }
}
