import { useEffect, useMemo, useState } from "react";

import { API_DB } from "../apiBase";
const API_BASE_DB = API_DB;

const WORD_COLORS = [
  { backgroundColor: "#38bdf8", color: "#0f172a" }, // bleu
  { backgroundColor: "#f97316", color: "#111827" }, // orange
  { backgroundColor: "#22c55e", color: "#022c22" }, // vert
  { backgroundColor: "#a855f7", color: "#f9fafb" }, // violet
];

const MODES = [
  { value: "ELS", label: "ELS (saut de lettres)" },
  { value: "ELS_AUTO", label: "ELS auto (saut 1–100)" },
  { value: "RACHEY", label: "ר״ת (Rachéy Tevot)" },
  { value: "SOFEY", label: "ס״ת (Soféy Tevot)" },
];

const ELS_AUTO_MAX_SKIP = 100;

const isHebrewLetter = (ch) => ch >= "\u05D0" && ch <= "\u05EA";
const cleanHebrew = (s) =>
  (s || "")
    .toString()
    .split("")
    .filter((ch) => isHebrewLetter(ch))
    .join("");

const splitHebrewWords = (s) =>
  (s || "")
    .toString()
    .trim()
    .split(/\s+/)
    .map(cleanHebrew)
    .filter(Boolean);

function buildTevotPattern(rawInput, mode) {
  const words = splitHebrewWords(rawInput);
  if (words.length >= 2) {
    return words
      .map((w) => (mode === "RACHEY" ? w[0] : w[w.length - 1]))
      .join("");
  }
  return cleanHebrew(rawInput);
}

function modeShortLabel(mode) {
  if (mode === "ELS") return "ELS";
  if (mode === "ELS_AUTO") return "ELS auto";
  if (mode === "RACHEY") return "ר״ת";
  if (mode === "SOFEY") return "ס״ת";
  return mode;
}

function TorahCodesTab({ styles }) {
  const [torah, setTorah] = useState("");
  const [wordStarts, setWordStarts] = useState(null);
  const [wordEnds, setWordEnds] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchMode, setSearchMode] = useState("ELS");
  const [patternInput, setPatternInput] = useState("");
  const [skipInput, setSkipInput] = useState(1);

  // { id, sourceText, pattern, mode, modeOriginal, skip, matches:number[], selectedMatch:number|null }
  // - mode=ELS  : matches/selectedMatch = index lettre
  // - mode=RACHEY/SOFEY : matches/selectedMatch = index mot
  const [words, setWords] = useState([]);

  // matrice fixe : on choisit explicitement le mot de base
  const [baseWordId, setBaseWordId] = useState(null);

  // si activé : lors de l'ajout d'un mot, on choisit automatiquement un match qui tombe dans la fenêtre courante
  const [autoSelectInMatrix, setAutoSelectInMatrix] = useState(true);

  const [matrixCols, setMatrixCols] = useState(50);
  const [matrixRows, setMatrixRows] = useState(20);

  // légende: [{ wordId, centerIndex, ref: {...} }]
  const [legendItems, setLegendItems] = useState([]);

  // Charger Torah + meta (début/fin de mots)
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API_BASE_DB}/torah/raw?meta=1`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setTorah(data.torah || "");

        // ✅ mapping tolérant comme dans ta version qui marchait
        const ws = data.wordStarts ?? data.word_starts ?? data.wordstarts;
        const we = data.wordEnds ?? data.word_ends ?? data.wordends;

        setWordStarts(Array.isArray(ws) ? ws : null);
        setWordEnds(Array.isArray(we) ? we : null);
      } catch (e) {
        console.error(e);
        setError("Impossible de charger la Torah depuis l’API.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const wordCount = wordStarts?.length || 0;

  // --- ELS (saut fixé) + ELS auto (saut 1..N) -----------------------------

  const searchMatchesELSInRange = (pattern, skip, startLimit, endLimit) => {
    const results = [];
    if (!torah || !pattern) return results;

    const lenT = torah.length;
    const lenP = pattern.length;

    const startMin = Math.max(0, startLimit ?? 0);
    const endMax = Math.min(lenT - 1, endLimit ?? lenT - 1);

    for (let start = startMin; start <= endMax; start++) {
      let ok = true;
      for (let i = 0; i < lenP; i++) {
        const idx = start + i * skip;
        if (idx < startMin || idx > endMax || torah[idx] !== pattern[i]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        results.push(start);
        if (results.length >= 200) break;
      }
    }

    return results;
  };

  const searchMatchesELS = (pattern, skip) =>
    searchMatchesELSInRange(
      pattern,
      skip,
      0,
      torah ? torah.length - 1 : 0
    );

  const searchMatchesElsAuto = (
    pattern,
    minSkip = 1,
    maxSkip = ELS_AUTO_MAX_SKIP,
    startLimit,
    endLimit
  ) => {
    if (!torah || !pattern) {
      return { skip: null, matches: [] };
    }

    const lenT = torah.length;
    const startMin = Math.max(0, startLimit ?? 0);
    const endMax = Math.min(lenT - 1, endLimit ?? lenT - 1);

    let bestSkip = null;
    let bestMatches = [];

    const from = Math.max(1, minSkip || 1);
    const to = Math.max(from, maxSkip || from);

    for (let s = from; s <= to; s++) {
      const matches = searchMatchesELSInRange(pattern, s, startMin, endMax);
      if (matches.length > bestMatches.length) {
        bestSkip = s;
        bestMatches = matches;
      }
      if (bestMatches.length >= 200) break;
    }

    return { skip: bestSkip, matches: bestMatches };
  };

  // --- ר״ת / ס״ת ----------------------------------------------------------

  const getTevotLetter = (wi, mode) => {
    if (!torah || !wordStarts || !wordEnds) return null;
    if (wi < 0 || wi >= wordCount) return null;
    const idx = mode === "RACHEY" ? wordStarts[wi] : wordEnds[wi];
    if (idx == null || idx < 0 || idx >= torah.length) return null;
    return torah[idx];
  };

  const searchMatchesTevot = (pattern, skipWords, mode) => {
    const results = [];
    if (!pattern || !wordStarts || !wordEnds) return results;

    const lenP = pattern.length;

    for (let startWord = 0; startWord < wordCount; startWord++) {
      let ok = true;
      for (let i = 0; i < lenP; i++) {
        const wi = startWord + i * skipWords;
        const ch = getTevotLetter(wi, mode);
        if (!ch || ch !== pattern[i]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        results.push(startWord);
        if (results.length >= 200) break;
      }
    }

    return results;
  };

  // --- Indices lettres utilisés pour la matrice --------------------------

  const getMatchLetterIndices = (w, matchStart) => {
    if (!torah || matchStart == null) return [];

    const out = [];
    const L = w.pattern.length;

    if (w.mode === "ELS") {
      for (let i = 0; i < L; i++) {
        const idx = matchStart + i * w.skip;
        if (idx >= 0 && idx < torah.length) out.push(idx);
      }
      return out;
    }

    if (!wordStarts || !wordEnds) return [];

    for (let i = 0; i < L; i++) {
      const wi = matchStart + i * w.skip;
      if (wi < 0 || wi >= wordCount) continue;
      const idx = w.mode === "RACHEY" ? wordStarts[wi] : wordEnds[wi];
      if (idx >= 0 && idx < torah.length) out.push(idx);
    }

    return out;
  };

  const getCenterLetterIndexForMatch = (w, matchStart) => {
    if (matchStart == null) return null;
    if (w.mode === "ELS") return matchStart;
    if (!wordStarts || !wordEnds) return null;
    if (matchStart < 0 || matchStart >= wordCount) return null;
    return w.mode === "RACHEY" ? wordStarts[matchStart] : wordEnds[matchStart];
  };

  const getCenterLetterIndex = (w) =>
    getCenterLetterIndexForMatch(w, w.selectedMatch);

  // --- Fenêtre matrice ----------------------------------------------------

  const getMatrixWindow = (centerIndex, cols, totalRows = 20) => {
    const centerRow = Math.floor(centerIndex / cols);
    const halfRows = Math.floor(totalRows / 2);

    let startRow = centerRow - halfRows;
    if (startRow < 0) startRow = 0;

    let endRow = startRow + totalRows;
    const maxRow = Math.ceil(torah.length / cols);
    if (endRow > maxRow) {
      endRow = maxRow;
      startRow = Math.max(0, endRow - totalRows);
    }

    const startIndex = startRow * cols;
    const endIndex = Math.min(torah.length - 1, endRow * cols - 1);

    return { startRow, endRow, startIndex, endIndex, cols, totalRows };
  };

  const baseWord = useMemo(() => {
    if (baseWordId) {
      const bw = words.find((w) => w.id === baseWordId);
      if (bw && bw.selectedMatch != null) return bw;
    }
    return words.find((w) => w.selectedMatch != null) || null;
  }, [baseWordId, words]);

  const matrixWindow = useMemo(() => {
    if (!baseWord) return null;
    const centerIndex = getCenterLetterIndex(baseWord);
    if (centerIndex == null) return null;

    const cols = Math.max(10, Math.min(200, parseInt(matrixCols, 10) || 50));
    const rows = Math.max(5, Math.min(200, parseInt(matrixRows, 10) || 20));
    return getMatrixWindow(centerIndex, cols, rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseWord, matrixCols, matrixRows, torah, wordStarts, wordEnds]);

  const scoreMatchInWindow = (tempWord, matchStart, window) => {
    const indices = getMatchLetterIndices(tempWord, matchStart);
    let inside = 0;
    for (const idx of indices) {
      if (idx >= window.startIndex && idx <= window.endIndex) inside++;
    }
    const full = inside === tempWord.pattern.length;
    return { inside, full };
  };

  // --- Ajout d'un nouveau mot --------------------------------------------

  const handleAddWord = () => {
    setError("");

    const rawInput = patternInput.trim();
    const pattern =
      searchMode === "ELS" || searchMode === "ELS_AUTO"
        ? cleanHebrew(rawInput)
        : buildTevotPattern(rawInput, searchMode);

    if (!pattern) {
      setError("Entre un mot / une séquence en lettres hébraïques à chercher.");
      return;
    }
    if (!torah) {
      setError("La Torah n’est pas encore chargée.");
      return;
    }

    let s = null;
    if (
      searchMode === "ELS" ||
      searchMode === "RACHEY" ||
      searchMode === "SOFEY"
    ) {
      const parsed = parseInt(skipInput, 10);
      if (!parsed || parsed === 0) {
        setError(
          "Le saut (skip) doit être un entier non nul (ex : 1, 7, -3). "
        );
        return;
      }
      s = parsed;
    }

    if (
      (searchMode === "RACHEY" || searchMode === "SOFEY") &&
      (!wordStarts || !wordEnds)
    ) {
      setError(
        "Les index des mots ne sont pas disponibles. Vérifie l’API /api/torah/raw?meta=1 (et redémarre le backend)."
      );
      return;
    }

    let matches = [];
    let effectiveSkip = s ?? 1;

    if (searchMode === "ELS") {
      matches = searchMatchesELS(pattern, s);
    } else if (searchMode === "ELS_AUTO") {
      // 1) on cherche d'abord dans la fenêtre matrice actuelle (si elle existe)
      let autoRes = null;
      if (matrixWindow) {
        autoRes = searchMatchesElsAuto(
          pattern,
          1,
          ELS_AUTO_MAX_SKIP,
          matrixWindow.startIndex,
          matrixWindow.endIndex
        );
      }
      // 2) si rien trouvé, on cherche dans toute la Torah
      if (!autoRes || autoRes.skip == null) {
        autoRes = searchMatchesElsAuto(
          pattern,
          1,
          ELS_AUTO_MAX_SKIP,
          0,
          torah.length - 1
        );
      }

      effectiveSkip = autoRes.skip ?? 1;
      matches = autoRes.matches;
    } else {
      // Rachéy / Soféy
      matches = searchMatchesTevot(pattern, s, searchMode);
    }

    // Auto-sélection: si une matrice est déjà affichée, on choisit un match qui tombe dedans
    let autoSelectedMatch = null;
    if (autoSelectInMatrix && matrixWindow && matches.length > 0) {
      const internalMode = searchMode === "ELS_AUTO" ? "ELS" : searchMode;
      const tempWord = { pattern, mode: internalMode, skip: effectiveSkip };

      let best = null;
      for (const m of matches) {
        const sc = scoreMatchInWindow(tempWord, m, matrixWindow);
        if (!best) best = { m, ...sc };
        else if (sc.full && !best.full) best = { m, ...sc };
        else if (sc.full === best.full && sc.inside > best.inside) {
          best = { m, ...sc };
        }
      }

      if (best && best.inside > 0) autoSelectedMatch = best.m;
    }

    const internalMode = searchMode === "ELS_AUTO" ? "ELS" : searchMode;

    const id = Date.now() + Math.random();
    const newWord = {
      id,
      sourceText: rawInput,
      pattern,
      mode: internalMode, // utilisé pour le calcul (ELS / RACHEY / SOFEY)
      modeOriginal: searchMode, // pour l'affichage (permet de distinguer ELS vs ELS_AUTO)
      skip: effectiveSkip,
      matches,
      selectedMatch: autoSelectedMatch,
    };

    setWords((prev) => [...prev, newWord]);
    if (!baseWordId && autoSelectedMatch != null) setBaseWordId(id);

    setPatternInput("");
    setSkipInput(1);
  };

  const handleRemoveWord = (wordId) => {
    setWords((prev) => prev.filter((w) => w.id !== wordId));
    if (baseWordId === wordId) setBaseWordId(null);
    setLegendItems((prev) => prev.filter((x) => x.wordId !== wordId));
  };

  const handleSelectMatch = (wordId, matchStart) => {
    setWords((prev) =>
      prev.map((w) =>
        w.id === wordId ? { ...w, selectedMatch: matchStart } : w
      )
    );

    // IMPORTANT : on ne change PAS la matrice si elle existe déjà.
    // On fixe le mot de base une seule fois (au premier choix), puis c’est l’utilisateur qui clique "🎯 Centrer".
    if (!baseWordId) setBaseWordId(wordId);
  };

  const handleSetBaseWord = (wordId) => {
    const w = words.find((x) => x.id === wordId);
    if (!w || w.selectedMatch == null) return;
    setBaseWordId(wordId);
  };

  const renderHighlightedExcerpt = (letterIndices, centerIndex) => {
    if (!torah || centerIndex == null) return null;

    const radius = 45;
    const start = Math.max(0, centerIndex - radius);
    const end = Math.min(torah.length, centerIndex + radius + 1);
    const set = new Set(letterIndices);

    const spans = [];
    for (let idx = start; idx < end; idx++) {
      const ch = torah[idx];
      if (set.has(idx)) {
        spans.push(
          <span
            key={idx}
            style={{ backgroundColor: "#facc15", color: "#111827" }}
          >
            {ch}
          </span>
        );
      } else {
        spans.push(<span key={idx}>{ch}</span>);
      }
    }

    return (
      <span dir="rtl" style={{ fontSize: "1.05rem" }}>
        {spans}
      </span>
    );
  };

  const renderMatchPreview = (w, matchStart) => {
    const letterIndices = getMatchLetterIndices(w, matchStart);
    const center =
      getCenterLetterIndexForMatch(w, matchStart) ?? letterIndices[0];
    const seq = letterIndices.map((idx) => torah[idx]).join("");

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
          {w.mode === "ELS" ? (
            <>Index lettre : {matchStart}</>
          ) : (
            <>Index mot : {matchStart}</>
          )}
        </div>
        <div dir="rtl" style={{ fontSize: "1.15rem" }}>
          <span style={{ backgroundColor: "#064e3b", padding: "0 0.25rem" }}>
            {seq}
          </span>
        </div>
        <div>{renderHighlightedExcerpt(letterIndices, center)}</div>
      </div>
    );
  };

  const renderMiniMatrix = () => {
    if (!torah) {
      return (
        <p style={styles.dbHint}>Le texte de la Torah n’est pas encore chargé.</p>
      );
    }
    if (!baseWord || !matrixWindow) {
      return (
        <p style={styles.dbHint}>
          Sélectionne au moins un match pour afficher la matrice.
        </p>
      );
    }

    const { startRow, endRow, cols, startIndex, endIndex } = matrixWindow;
    const centerIndex = getCenterLetterIndex(baseWord);

    // index lettre -> [indices de mots]
    const highlightByIndex = new Map();
    words.forEach((w, wIdx) => {
      if (w.selectedMatch == null) return;
      const indices = getMatchLetterIndices(w, w.selectedMatch);
      for (const idx of indices) {
        if (!highlightByIndex.has(idx)) highlightByIndex.set(idx, []);
        highlightByIndex.get(idx).push(wIdx);
      }
    });

    const baseWordIndex = words.indexOf(baseWord);

    const rows = [];
    for (let r = startRow; r < endRow; r++) {
      const cells = [];
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const ch = idx < torah.length ? torah[idx] : " ";
        const owners = highlightByIndex.get(idx) || [];
        const isCenter = idx === centerIndex && owners.includes(baseWordIndex);

        let cellStyle = styles.matrixCell;

        if (owners.length > 1) {
          cellStyle = { ...cellStyle, ...styles.matrixCellIntersection };
        } else if (owners.length === 1) {
          const wordIdx = owners[0] % WORD_COLORS.length;
          cellStyle = { ...cellStyle, ...WORD_COLORS[wordIdx] };
        }

        if (isCenter) {
          cellStyle = { ...cellStyle, ...styles.matrixCellCenter };
        }

        cells.push(
          <div key={c} style={cellStyle} dir="rtl">
            {ch}
          </div>
        );
      }
      rows.push(
        <div key={r} style={styles.matrixRow}>
          {cells}
        </div>
      );
    }

    return (
      <div>
        <p style={styles.dbHint}>
          Fenêtre matrice : index {startIndex} → {endIndex}. Mot de base :{" "}
          <strong>
            {modeShortLabel(baseWord.modeOriginal || baseWord.mode)}{" "}
            {baseWord.pattern} (skip {baseWord.skip})
          </strong>{" "}
          – centré sur l’index lettre <strong>{centerIndex}</strong>.
        </p>
        <div
          style={{
            ...styles.matrixContainer,
            // hauteur visible adaptée à matrixRows
            maxHeight: `${Math.min(
              1200,
              Math.max(300, (matrixWindow?.totalRows || 20) * 28)
            )}px`,
          }}
        >
          {rows}
        </div>
      </div>
    );
  };

  // Charger la légende (référence de verset) pour les mots sélectionnés
  useEffect(() => {
    const run = async () => {
      try {
        const selected = words
          .map((w) => ({ w, centerIndex: getCenterLetterIndex(w) }))
          .filter((x) => x.centerIndex != null);

        if (selected.length === 0) {
          setLegendItems([]);
          return;
        }

        const indicesParam = selected.map((x) => x.centerIndex).join(",");
        const res = await fetch(
          `${API_BASE_DB}/torah/refs?withText=1&indices=${encodeURIComponent(
            indicesParam
          )}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const refs = Array.isArray(data.refs) ? data.refs : [];

        const merged = selected.map((x, i) => ({
          wordId: x.w.id,
          centerIndex: x.centerIndex,
          ref: refs[i] || { index: x.centerIndex, found: false },
        }));

        setLegendItems(merged);
      } catch (e) {
        console.error(e);
        // on ne bloque pas l'UI si la légende échoue
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, torah, wordStarts, wordEnds]);

  const computedPatternPreview = useMemo(() => {
    const raw = patternInput.trim();
    if (!raw) return "";
    const p =
      searchMode === "ELS" || searchMode === "ELS_AUTO"
        ? cleanHebrew(raw)
        : buildTevotPattern(raw, searchMode);
    return p;
  }, [patternInput, searchMode]);

  return (
    <div style={{ marginTop: "1.5rem" }}>
      {/* Saisie */}
      <section style={styles.dbSection}>
        <h2>Codes de la Torah – ELS + ר״ת + ס״ת (superposition)</h2>
        <p style={styles.dbHint}>
          La Torah est considérée comme un seul long mot (sans espaces). Tu peux
          ajouter plusieurs recherches (ELS / ELS auto / Rachéy Tevot / Soféy Tevot)
          et les superposer dans la même matrice.
        </p>

        {loading && (
          <p style={styles.dbHint}>Chargement du texte de la Torah...</p>
        )}
        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.dbInputRow}>
          <select
            value={searchMode}
            onChange={(e) => setSearchMode(e.target.value)}
            style={{ ...styles.select, minWidth: "220px" }}
          >
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            dir="rtl"
            value={patternInput}
            onChange={(e) => setPatternInput(e.target.value)}
            placeholder={
              searchMode === "ELS" || searchMode === "ELS_AUTO"
                ? "Mot/séquence (ex : תורה)"
                : "Phrase (avec espaces) ou séquence (ex : בראשית ברא)"
            }
            style={styles.dbInput}
          />

          {searchMode === "ELS_AUTO" ? (
            <input
              type="text"
              value={`Skip auto 1–${ELS_AUTO_MAX_SKIP}`}
              readOnly
              style={{
                ...styles.dbInput,
                maxWidth: "150px",
                opacity: 0.7,
                cursor: "default",
              }}
            />
          ) : (
            <input
              type="number"
              value={skipInput}
              onChange={(e) => setSkipInput(e.target.value)}
              placeholder={searchMode === "ELS" ? "Skip lettres" : "Skip mots"}
              style={{ ...styles.dbInput, maxWidth: "120px" }}
            />
          )}

          <button type="button" style={styles.buttonSmall} onClick={handleAddWord}>
            Ajouter / Chercher
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label style={{ fontSize: "0.85rem", color: "#e5e7eb" }}>
            <input
              type="checkbox"
              checked={autoSelectInMatrix}
              onChange={(e) => setAutoSelectInMatrix(e.target.checked)}
              style={{ marginRight: "0.5rem" }}
            />
            Auto-sélection : choisir un match dans la matrice actuelle (si
            possible)
          </label>

          {patternInput.trim() && computedPatternPreview && (
            <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
              Séquence utilisée :{" "}
              <span dir="rtl">{computedPatternPreview}</span>
            </span>
          )}
        </div>

        {torah && (
          <p style={styles.dbHint}>
            Longueur du texte continu :{" "}
            <strong>{torah.length.toLocaleString("fr-FR")}</strong> lettres
            {wordCount ? (
              <>
                {" "}
                – <strong>{wordCount.toLocaleString("fr-FR")}</strong> mots
              </>
            ) : null}
            .
          </p>
        )}
      </section>

      {/* Liste des mots */}
      <section style={styles.dbSection}>
        <h3>Mots recherchés & matches</h3>

        {words.length === 0 ? (
          <p style={styles.dbHint}>Ajoute un mot ci-dessus pour commencer.</p>
        ) : (
          <div style={styles.dbScrollAreaTall}>
            {words.map((w, wIdx) => {
              const isBase = w.id === baseWordId && w.selectedMatch != null;
              const color = WORD_COLORS[wIdx % WORD_COLORS.length];

              return (
                <div
                  key={w.id}
                  style={{
                    borderBottom: "1px solid #1f2937",
                    paddingBottom: "0.75rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.75rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span
                        title="Couleur du mot"
                        style={{
                          width: "0.9rem",
                          height: "0.9rem",
                          borderRadius: "999px",
                          display: "inline-block",
                          background: color.backgroundColor,
                          border: "1px solid #0b1220",
                        }}
                      />
                      <span style={{ fontSize: "0.95rem" }}>
                        <strong>#{wIdx + 1}</strong> –{" "}
                        {modeShortLabel(w.modeOriginal || w.mode)}{" "}
                        <span dir="rtl" style={{ fontSize: "1.1rem" }}>
                          {w.pattern}
                        </span>
                        {w.sourceText &&
                          cleanHebrew(w.sourceText) !== w.pattern && (
                            <>
                              {" "}
                              <span
                                style={{
                                  color: "#9ca3af",
                                  fontSize: "0.85rem",
                                }}
                              >
                                (depuis :{" "}
                                <span dir="rtl">{w.sourceText}</span>)
                              </span>
                            </>
                          )}{" "}
                        – skip {w.skip} – {w.matches.length} matches
                        {isBase && (
                          <span
                            style={{ marginLeft: "0.5rem", color: "#22c55e" }}
                          >
                            ★ base
                          </span>
                        )}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "center",
                      }}
                    >
                      <button
                        type="button"
                        style={{
                          ...styles.buttonTiny,
                          opacity: w.selectedMatch == null ? 0.45 : 1,
                          cursor:
                            w.selectedMatch == null ? "not-allowed" : "pointer",
                        }}
                        onClick={() => handleSetBaseWord(w.id)}
                        disabled={w.selectedMatch == null}
                        title="Fixer la matrice sur ce mot"
                      >
                        🎯 Centrer
                      </button>
                      <button
                        type="button"
                        style={styles.buttonTiny}
                        onClick={() => handleRemoveWord(w.id)}
                      >
                        ✕ Retirer
                      </button>
                    </div>
                  </div>

                  {w.matches.length === 0 ? (
                    <p style={styles.dbHint}>Aucun match trouvé.</p>
                  ) : (
                    <>
                      <p style={styles.dbHint}>
                        Clique sur un match pour le sélectionner. Il sera
                        superposé dans la matrice (sans changer le mot de base).
                      </p>

                      {w.matches.map((m, i) => (
                        <button
                          key={`${w.id}-${m}`}
                          type="button"
                          onClick={() => handleSelectMatch(w.id, m)}
                          style={
                            m === w.selectedMatch
                              ? {
                                  ...styles.matchButton,
                                  ...styles.matchButtonActive,
                                }
                              : styles.matchButton
                          }
                        >
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#9ca3af",
                              marginBottom: "0.15rem",
                            }}
                          >
                            #{i + 1} –{" "}
                            {w.mode === "ELS" ? "index lettre" : "index mot"} :{" "}
                            {m}
                            {m === w.selectedMatch && " (sélectionné)"}
                          </div>
                          {renderMatchPreview(w, m)}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Matrice */}
      <section style={styles.dbSection}>
        <h3>Vue matrice (superposition)</h3>
        <div style={styles.dbInputRow}>
          <label style={{ fontSize: "0.85rem", color: "#e5e7eb" }}>
            Largeur de la matrice (colonnes) :
            <input
              type="number"
              value={matrixCols}
              onChange={(e) => setMatrixCols(e.target.value)}
              style={{
                ...styles.dbInput,
                maxWidth: "120px",
                marginLeft: "0.5rem",
              }}
            />
          </label>

          <label
            style={{
              fontSize: "0.85rem",
              color: "#e5e7eb",
              marginLeft: "1rem",
            }}
          >
            Hauteur de la matrice (lignes) :
            <input
              type="number"
              value={matrixRows}
              onChange={(e) => setMatrixRows(e.target.value)}
              style={{
                ...styles.dbInput,
                maxWidth: "120px",
                marginLeft: "0.5rem",
              }}
            />
          </label>
        </div>
        {renderMiniMatrix()}
      </section>

      {/* Légende */}
      <section style={styles.dbSection}>
        <h3>Légende (mots + passouk)</h3>
        {legendItems.length === 0 ? (
          <p style={styles.dbHint}>
            Sélectionne au moins un match pour afficher la légende.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {legendItems.map((it) => {
              const w = words.find((x) => x.id === it.wordId);
              if (!w) return null;

              const wIdx = words.indexOf(w);
              const color = WORD_COLORS[wIdx % WORD_COLORS.length];

              const indices =
                w.selectedMatch == null
                  ? []
                  : getMatchLetterIndices(w, w.selectedMatch);
              const inMatrix =
                matrixWindow &&
                indices.some(
                  (idx) =>
                    idx >= matrixWindow.startIndex &&
                    idx <= matrixWindow.endIndex
                );
              const fullyInMatrix =
                matrixWindow && indices.length > 0
                  ? indices.every(
                      (idx) =>
                        idx >= matrixWindow.startIndex &&
                        idx <= matrixWindow.endIndex
                    )
                  : false;

              const ref = it.ref || { found: false };
              const refLabel = ref.found
                ? `${ref.book_name_he || ref.book_code} ${
                    ref.chapter_number
                  }:${ref.verse_number}`
                : "(référence inconnue)";

              return (
                <div
                  key={`${it.wordId}-${it.centerIndex}`}
                  style={{
                    border: "1px solid #1f2937",
                    borderRadius: "0.75rem",
                    padding: "0.75rem",
                    background: "#020617",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        width: "0.9rem",
                        height: "0.9rem",
                        borderRadius: "999px",
                        display: "inline-block",
                        background: color.backgroundColor,
                        border: "1px solid #0b1220",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.15rem",
                      }}
                    >
                      <div style={{ fontSize: "0.95rem" }}>
                        <strong>
                          {modeShortLabel(w.modeOriginal || w.mode)}
                        </strong>{" "}
                        <span dir="rtl">{w.pattern}</span> – skip {w.skip}
                        {w.mode === "ELS" ? " (lettres)" : " (mots)"} – match{" "}
                        {w.selectedMatch}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "#9ca3af",
                        }}
                      >
                        Index centre (lettre) : {it.centerIndex} –{" "}
                        {inMatrix ? "dans la matrice" : "hors matrice"}
                        {fullyInMatrix
                          ? " (complet)"
                          : inMatrix
                          ? " (partiel)"
                          : ""}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{ marginTop: "0.5rem", fontSize: "0.95rem" }}
                  >
                    <div style={{ color: "#e5e7eb" }}>
                      <strong>Passouk :</strong> {refLabel}
                    </div>
                    {ref.verse_text_he && (
                      <div
                        dir="rtl"
                        style={{
                          marginTop: "0.35rem",
                          background: "#0b1220",
                          border: "1px solid #1e293b",
                          borderRadius: "0.5rem",
                          padding: "0.5rem",
                          lineHeight: 1.6,
                        }}
                      >
                        {ref.verse_text_he}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Extrait brut */}
      <section style={styles.dbSection}>
        <h3>Extrait de la Torah en continu (début)</h3>
        <pre style={styles.torahBlock}>
          {torah ? torah.slice(0, 2000) : "Chargement..."}
          {torah && torah.length > 2000 && " ..."}
        </pre>
      </section>
    </div>
  );
}

export default TorahCodesTab;
