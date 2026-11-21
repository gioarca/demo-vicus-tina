/* =====================================================================
   Unisce la build di "vite build --mode pagina" in un solo file HTML:
   JS e CSS in linea, font già incorporati come data URI dalla build.
   Uso, dalla radice:  node scripts/pagina-singola.mjs <nome> "<titolo>"
   Scrive due file in dist-pagina/:
   - <nome>.html           documento completo, da aprire in locale
   - <nome>-artifact.html  solo il contenuto, per la pagina pubblicata su claude.ai
   ===================================================================== */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [nome = "pagina", titolo = nome] = process.argv.slice(2);
const dir = "dist-pagina";
const assets = join(dir, "assets");
const file = readdirSync(assets);
const js = file.filter((f) => f.endsWith(".js"));
const css = file.filter((f) => f.endsWith(".css"));
if (js.length !== 1 || css.length !== 1) throw new Error(`attesi un JS e un CSS, trovati ${js.length} e ${css.length}`);

const codice = readFileSync(join(assets, js[0]), "utf8").replace(/<\/script/gi, "<\\/script");
const stile = readFileSync(join(assets, css[0]), "utf8").replace(/<\/style/gi, "<\\/style");

const contenuto = `<title>${titolo}</title>
<style>${stile}</style>
<div id="root"></div>
<script type="module">${codice}</script>
`;
writeFileSync(join(dir, `${nome}-artifact.html`), contenuto);
writeFileSync(
  join(dir, `${nome}.html`),
  `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${contenuto.split('<div id="root">')[0]}</head><body><div id="root"></div><script type="module">${codice}</script></body></html>\n`,
);
const kb = (s) => `${Math.round(Buffer.byteLength(s) / 1024)} KB`;
console.log(`${nome}-artifact.html ${kb(contenuto)} · JS ${kb(codice)} · CSS con font ${kb(stile)}`);
