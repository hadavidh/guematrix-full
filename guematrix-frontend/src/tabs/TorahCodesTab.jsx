import { useState, useEffect } from "react";

const API_BASE_DB = "http://localhost:3001/api";

const WORD_COLORS = [
  { backgroundColor: "#38bdf8", color: "#0f172a" }, // bleu
  { backgroundColor: "#f97316", color: "#111827" }, // orange
  { backgroundColor: "#22c55e", color: "#022c22" }, // vert
  { backgroundColor: "#a855f7", color: "#f9fafb" }, // violet
];

function TorahCodesTab({ styles }) {
  const [torah, setTorah] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // saisie du mot à ajouter
  const [patternInput, setPatternInput] = useState("");
  const [skipInput, setSkipInput] = useState(1);

  // liste des mots : { id, pattern, skip, matches: number[], selectedMatch: number | null }
  const [words, setWords] = useState([]);

  // mot de base pour centrer la matrice
  const [baseWordId, setBaseWordId] = useState(null);

  const [matrixCols, setMatrixCols] = useState(50);

  // charger la Torah une fois
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API_BASE_DB}/torah/raw`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setTorah(data.torah || "");
      } catch (e) {
        console.error(e);
        setError("Impossible de charger la Torah depuis l’API.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const searchMatches = (pattern, skip) => {
    const results = [];
    if (!torah) return results;

    const lenT = torah.length;
    const lenP = pattern.length;

    for (let start = 0; start < lenT; start++) {
      let ok = true;
      for (let i = 0; i < lenP; i++) {
        const idx = start + i * skip;
        if (idx < 0 || idx >= lenT || torah[idx] !== pattern[i]) {
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

  const handleAddWord = () => {
    setError("");

    const pattern = patternInput.trim();
    if (!pattern) {
      setError("Entre un mot hébreu à chercher.");
      return;
    }
    if (!torah) {
      setError("La Torah n’est pas encore chargée.");
      return;
    }

    const s = parseInt(skipInput, 10);
    if (!s || s === 0) {
      setError("Le saut (skip) doit être un entier non nul (ex : 1, 7, -3).");
      return;
    }

    const matches = searchMatches(pattern, s);

    const newWord = {
      id: Date.now() + Math.random(),
      pattern,
      skip: s,
      matches,
      selectedMatch: null,
    };

    setWords((prev) => [...prev, newWord]);
    setPatternInput("");
    setSkipInput(1);
  };

  const handleRemoveWord = (wordId) => {
    setWords((prev) => prev.filter((w) => w.id !== wordId));
    if (baseWordId === wordId) {
      setBaseWordId(null);
    }
  };

  const handleSelectMatch = (wordId, matchIndex) => {
    setWords((prev) =>
      prev.map((w) =>
        w.id === wordId ? { ...w, selectedMatch: matchIndex } : w
      )
    );
    setBaseWordId(wordId);
  };

  const renderContext = (index, pattern) => {
    const windowSize = 40;
    const start = Math.max(0, index - windowSize);
    const end = Math.min(torah.length, index + windowSize);
    const before = torah.slice(start, index);
    const mid = torah.slice(index, index + pattern.length);
    const after = torah.slice(index + pattern.length, end);

    return (
      <span dir="rtl" style={{ fontSize: "1.1rem" }}>
        {before}
        <span style={{ backgroundColor: "#facc15", color: "#111827" }}>
          {mid}
        </span>
        {after}
      </span>
    );
  };

  const renderMiniMatrix = () => {
    if (!torah) {
      return (
        <p style={styles.dbHint}>
          Le texte de la Torah n’est pas encore chargé.
        </p>
      );
    }

    const baseWord =
      (baseWordId &&
        words.find((w) => w.id === baseWordId && w.selectedMatch != null)) ||
      words.find((w) => w.selectedMatch != null);

    if (!baseWord) {
      return (
        <p style={styles.dbHint}>
          Sélectionne au moins un match (en cliquant sur un résultat) pour
          afficher la matrice.
        </p>
      );
    }

    const cols = Math.max(10, Math.min(200, parseInt(matrixCols, 10) || 50));
    const totalRows = 20;

    const centerIndex = baseWord.selectedMatch;
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

    // map index -> [indices de mots]
    const highlightByIndex = new Map();
    words.forEach((w, wIdx) => {
      if (w.selectedMatch == null) return;
      const step = w.skip;
      const pat = w.pattern;
      for (let i = 0; i < pat.length; i++) {
        const idx = w.selectedMatch + i * step;
        if (idx < 0 || idx >= torah.length) continue;
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
        const isCenter =
          idx === baseWord.selectedMatch && owners.includes(baseWordIndex);

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
          Mot de base :{" "}
          <strong>
            {baseWord.pattern} (skip {baseWord.skip})
          </strong>{" "}
          – match à l’index <strong>{centerIndex}</strong>. Les couleurs
          indiquent chaque mot, les cases blanches épaisses sont des
          intersections.
        </p>
        <div style={styles.matrixContainer}>{rows}</div>
      </div>
    );
  };

  return (
    <div style={{ marginTop: "1.5rem" }}>
      {/* Saisie des mots */}
      <section style={styles.dbSection}>
        <h2>Codes de la Torah (ELS multi mots)</h2>
        <p style={styles.dbHint}>
          La Torah est considérée comme un seul long mot. Tu peux ajouter
          plusieurs mots, chacun avec son skip, et visualiser leurs croisements
          dans la matrice.
        </p>

        {loading && (
          <p style={styles.dbHint}>Chargement du texte de la Torah...</p>
        )}
        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.dbInputRow}>
          <input
            type="text"
            dir="rtl"
            value={patternInput}
            onChange={(e) => setPatternInput(e.target.value)}
            placeholder="Mot hébreu (ex : משיח)"
            style={styles.dbInput}
          />
          <input
            type="number"
            value={skipInput}
            onChange={(e) => setSkipInput(e.target.value)}
            placeholder="Skip (ex: 1, 7, -3)"
            style={{ ...styles.dbInput, maxWidth: "120px" }}
          />
          <button
            type="button"
            style={styles.buttonSmall}
            onClick={handleAddWord}
          >
            Ajouter / Chercher
          </button>
        </div>

        {torah && (
          <p style={styles.dbHint}>
            Longueur du texte continu :{" "}
            <strong>{torah.length.toLocaleString("fr-FR")}</strong> lettres.
          </p>
        )}
      </section>

      {/* Liste des mots + matches */}
      <section style={styles.dbSection}>
        <h3>Mots recherchés & matches</h3>
        {words.length === 0 ? (
          <p style={styles.dbHint}>
            Ajoute un mot ci-dessus pour commencer (par exemple משיח, ישראל,
            תורה...).
          </p>
        ) : (
          <div style={styles.dbScrollAreaTall}>
            {words.map((w, wIdx) => (
              <div
                key={w.id}
                style={{
                  borderBottom: "1px solid #1f2937",
                  paddingBottom: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.25rem",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "0.9rem",
                        marginRight: "0.5rem",
                      }}
                    >
                      Mot #{wIdx + 1} :{" "}
                      <span dir="rtl" style={{ fontSize: "1.1rem" }}>
                        {w.pattern}
                      </span>{" "}
                      (skip {w.skip}) – {w.matches.length} matches
                    </span>
                  </div>
                  <button
                    type="button"
                    style={styles.buttonTiny}
                    onClick={() => handleRemoveWord(w.id)}
                  >
                    ✕ Retirer
                  </button>
                </div>

                {w.matches.length === 0 ? (
                  <p style={styles.dbHint}>
                    Aucun match trouvé pour ce mot avec ce skip.
                  </p>
                ) : (
                  <>
                    <p style={styles.dbHint}>
                      Clique sur un match pour le sélectionner (il sera
                      superposé dans la matrice).
                    </p>
                    {w.matches.map((idx, i) => (
                      <button
                        key={`${w.id}-${idx}`}
                        type="button"
                        onClick={() => handleSelectMatch(w.id, idx)}
                        style={
                          idx === w.selectedMatch
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
                          #{i + 1} – index : {idx}
                          {idx === w.selectedMatch && " (sélectionné)"}
                        </div>
                        {renderContext(idx, w.pattern)}
                      </button>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Matrice */}
      <section style={styles.dbSection}>
        <h3>Vue matrice (superposition des mots sélectionnés)</h3>
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
        </div>
        {renderMiniMatrix()}
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
