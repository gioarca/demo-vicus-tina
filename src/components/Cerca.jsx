import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { EASE } from "../lib/formati.js";

/* =====================================================================
   VICUS — Cerca (⌘K). Una sola casella per trovare tutto: case, Wi-Fi,
   chiavi, famiglie, fornitori, addette, prenotazioni, lavori,
   dotazioni, documenti e controlli. Al posto delle note sul telefono,
   delle chat e dei fogli Excel.
   ===================================================================== */

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

function indice(db, fmt) {
  const casa = (id) => db.immobili.find((i) => i.id === id);
  const out = [];
  for (const i of db.immobili) {
    const fam = db.proprietari.find((p) => p.id === i.proprietarioId);
    out.push({ tipo: "Casa", titolo: i.nome, sotto: `${i.comune} · ${fam?.nome} · ${i.scheda.mq} m², ${i.scheda.ospiti} ospiti`, extra: `${i.scheda.indirizzo} ${i.cin}`, vai: { vista: "case", immobileId: i.id } });
    out.push({ tipo: "Wi-Fi", titolo: `Wi-Fi ${i.nome}`, sotto: `rete ${i.scheda.wifi.rete} · password ${i.scheda.wifi.password}`, extra: "wifi internet password rete", vai: { vista: "case", immobileId: i.id } });
    out.push({ tipo: "Chiavi", titolo: `Chiavi ${i.nome}`, sotto: i.scheda.chiavi, extra: "chiavi codice cassetta ingresso", vai: { vista: "case", immobileId: i.id } });
    out.push({ tipo: "Impianti", titolo: `Impianti ${i.nome}`, sotto: i.scheda.impianti, extra: "quadro elettrico gas acqua contatore valvola", vai: { vista: "case", immobileId: i.id } });
    for (const x of i.dotazioni) out.push({ tipo: "Dotazione", titolo: `${x.voce} · ${i.nome}`, sotto: x.garanziaFino ? `garanzia fino al ${fmt.longDay(x.garanziaFino)}` : x.anno ? `dal ${x.anno}` : "", extra: x.nota, vai: { vista: "case", immobileId: i.id, tab: "manutenzione" } });
    for (const x of i.documenti) out.push({ tipo: "Documento", titolo: `${x.voce} · ${i.nome}`, sotto: { ok: "a posto", manca: "manca", in_scadenza: "in scadenza" }[x.stato] + (x.scadenza ? ` · ${fmt.longDay(x.scadenza)}` : ""), extra: x.nota, vai: { vista: "case", immobileId: i.id } });
  }
  for (const p of db.proprietari) out.push({ tipo: "Famiglia", titolo: p.nome, sotto: `vive a ${p.residenza} · ${db.immobili.filter((i) => i.proprietarioId === p.id).map((i) => i.nome).join(", ")}`, vai: { vista: "famiglie", proprietarioId: p.id } });
  for (const a of db.addetti) out.push({ tipo: "Addetta", titolo: a.nome, sotto: `${a.zona}${a.tipo === "impresa" ? " · impresa" : ""}`, extra: "pulizie squadra", vai: { vista: "pulizie", sub: "squadra" } });
  for (const f of db.fornitori) out.push({ tipo: "Fornitore", titolo: f.nome, sotto: `${f.categoria} · ${f.zona} · risponde ${f.risposta}`, extra: f.categoria, vai: { vista: "manutenzione", sub: "fornitori" } });
  for (const b of db.prenotazioni)
    out.push({ tipo: "Prenotazione", titolo: `${b.id} · ${casa(b.immobileId)?.nome}`, sotto: `${fmt.day(b.arrivo)} → ${fmt.day(b.partenza)} · ${b.ospiti} ospiti · ${b.canale}`, extra: b.canale, vai: { vista: "case", immobileId: b.immobileId } });
  for (const m of db.interventi) out.push({ tipo: "Lavoro", titolo: m.voce, sotto: `${casa(m.immobileId)?.nome} · ${m.fornitore || "fornitore da scegliere"}`, extra: `${m.fornitore} manutenzione guasto`, vai: { vista: "manutenzione", intervento: m.id } });
  for (const p of db.programmi) out.push({ tipo: "Controllo", titolo: `${p.voce} · ${casa(p.immobileId)?.nome ?? "tutte le case"}`, sotto: p.prossima ? `prossimo ${fmt.longDay(p.prossima)}` : "da programmare", vai: p.immobileId ? { vista: "case", immobileId: p.immobileId, tab: "manutenzione" } : { vista: "manutenzione", sub: "programmata" } });
  return out.map((x) => ({ ...x, testo: norm(`${x.tipo} ${x.titolo} ${x.sotto} ${x.extra ?? ""}`) }));
}

const SUGGERITI = ["wifi pozzo", "chiavi", "idraulico", "lavatrice", "Weber", "VC-2611"];

export function Cerca({ db, fmt, onClose, onVai }) {
  const [q, setQ] = useState("");
  const [n, setN] = useState(0);
  const input = useRef(null);
  const lista = useRef(null);
  const tutto = useMemo(() => indice(db, fmt), [db, fmt]);
  const risultati = useMemo(() => {
    const parole = norm(q).split(/\s+/).filter(Boolean);
    if (!parole.length) return [];
    return tutto.filter((x) => parole.every((p) => x.testo.includes(p))).slice(0, 12);
  }, [q, tutto]);

  useEffect(() => {
    input.current?.focus();
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  useEffect(() => {
    lista.current?.querySelector(`[data-n="${n}"]`)?.scrollIntoView({ block: "nearest" });
  }, [n]);

  const tasto = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setN((x) => Math.min(x + 1, risultati.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setN((x) => Math.max(x - 1, 0));
    } else if (e.key === "Enter" && risultati[n]) {
      e.preventDefault();
      onVai(risultati[n].vai);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/30 px-3 pt-[10vh] backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Cerca"
        className="flex max-h-[75vh] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.98 }}
        transition={{ duration: 0.18, ease: EASE }}
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span aria-hidden="true" className="text-muted">
            ⌕
          </span>
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setN(0);
            }}
            onKeyDown={tasto}
            placeholder="Casa, Wi-Fi, chiavi, fornitore, prenotazione…"
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
            role="combobox"
            aria-expanded={risultati.length > 0}
            aria-controls="cerca-risultati"
            aria-activedescendant={risultati[n] ? `cerca-${n}` : undefined}
            aria-label="Cerca in Vicus"
          />
          <button type="button" onClick={onClose} className="cursor-pointer rounded-md border border-line px-1.5 py-0.5 text-[11px] font-semibold text-muted hover:text-ink">
            Esc
          </button>
        </div>
        <ul ref={lista} id="cerca-risultati" role="listbox" className="m-0 flex list-none flex-col overflow-y-auto p-1.5">
          {q.trim() === "" && (
            <li className="flex flex-col gap-2 px-2.5 py-2">
              <span className="text-[12.5px] text-muted">Prova con:</span>
              <span className="flex flex-wrap gap-1.5">
                {SUGGERITI.map((s) => (
                  <button key={s} type="button" onClick={() => setQ(s)} className="cursor-pointer rounded-full border border-line px-2.5 py-1 text-[12.5px] hover:border-accent/50">
                    {s}
                  </button>
                ))}
              </span>
            </li>
          )}
          {q.trim() !== "" && risultati.length === 0 && <li className="px-2.5 py-3 text-[13.5px] text-muted">Nessun risultato per “{q}”.</li>}
          {risultati.map((x, i) => (
            <li
              key={`${x.tipo}-${x.titolo}-${i}`}
              id={`cerca-${i}`}
              data-n={i}
              role="option"
              aria-selected={i === n}
              onMouseEnter={() => setN(i)}
              onClick={() => onVai(x.vai)}
              className={`flex cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2 ${i === n ? "bg-accent-soft" : ""}`}
            >
              <span className="mt-0.5 w-[86px] shrink-0 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">{x.tipo}</span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[14px] font-semibold">{x.titolo}</span>
                {x.sotto && <span className="text-[12.5px] text-muted">{x.sotto}</span>}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex gap-3 border-t border-line px-4 py-2 text-[11.5px] text-muted max-[480px]:hidden">
          <span>↑ ↓ per scegliere</span>
          <span>Invio per aprire</span>
          <span>Esc per chiudere</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
