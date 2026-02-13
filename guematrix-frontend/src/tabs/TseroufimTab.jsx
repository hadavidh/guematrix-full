import { useState } from "react";

import { API_DB, API_GUEMATRIX } from "../apiBase";
const API_SPRING = API_GUEMATRIX;


// Utilitaire pour surligner le mot dans le verset
function highlightWordInVerse(verseText, word) {
  if (!verseText || !word) return verseText;
  const safeWord = word.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(safeWord, "g");
  const parts = verseText.split(regex);

  const result = [];
  for (let i = 0; i < parts.length; i++) {
    result.push(parts[i]);
    if (i < parts.length - 1) {
      result.push(
        <span key={i} style={{ backgroundColor: "#22c55e33" }}>
          {word}
        </span>
      );
    }
  }
  return result;
}

function TseroufimTab({ styles }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // infos DB sur chaque mot de la roue
  const [wordInfos, setWordInfos] = useState([]);
  const [dbCheckError, setDbCheckError] = useState("");
  const [dbChecking, setDbChecking] = useState(false);

  // mot sélectionné + versets
  const [selectedWord, setSelectedWord] = useState(null);
  const [occurrences, setOccurrences] = useState([]);
  const [occLoading, setOccLoading] = useState(false);
  const [occError, setOccError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setWordInfos([]);
    setDbCheckError("");

    // reset des occurrences de l’ancien mot
    setSelectedWord(null);
    setOccurrences([]);
    setOccError("");
    setOccLoading(false);

    const value = text.trim();
    if (!value) {
      setError("Entre un mot hébreu pour calculer la roue de tseroufim.");
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        text: value,
        method: "tseroufim",
      });

      const res = await fetch(`${API_SPRING}?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Erreur HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data);

      // Une fois qu'on a la roue -> on demande au backend Node
      const wheel = data.tseroufim || [];
      if (wheel.length > 0) {
        await checkWordsInDb(wheel);
      }
    } catch (err) {
      console.error(err);
      setError("Impossible de calculer les tseroufim (vérifie le backend Java).");
    } finally {
      setLoading(false);
    }
  };

  // Charge tous les versets où ce mot apparaît
  const loadOccurrences = async (word) => {
    setSelectedWord(word);
    setOccLoading(true);
    setOccError("");
    setOccurrences([]);

    try {
      const params = new URLSearchParams({ word });
      const res = await fetch(`${API_DB}/tseroufim/occurrences?${params.toString()}`);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setOccurrences(data.hits || []);
    } catch (err) {
      console.error(err);
      setOccError("Erreur lors du chargement des occurrences dans la Torah.");
    } finally {
      setOccLoading(false);
    }
  };

  // Vérifie dans la DB si chaque tserouf existe dans la Torah
  const checkWordsInDb = async (wheel) => {
    try {
      setDbChecking(true);
      setDbCheckError("");
      setWordInfos([]);

      const res = await fetch(`${API_DB}/tseroufim/check-words`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: wheel }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setWordInfos(data.results || []);
    } catch (err) {
      console.error(err);
      setDbCheckError(
        "Impossible de vérifier la présence des mots dans la Torah (backend Node)."
      );
    } finally {
      setDbChecking(false);
    }
  };

  const wheel = result?.tseroufim || [];
  const baseValue = result?.value ?? null;

  return (
    <div>
      <h2>Guematria Tseroufim 🌀</h2>
      <p style={{ color: "#9ca3af", fontSize: "0.9rem", marginBottom: "1rem" }}>
        Saisis un mot hébreu (par ex.{" "}
        <span dir="rtl" style={{ fontWeight: 600 }}>
          אדם
        </span>
        ) et on affichera la roue des 22 tseroufim autour d’un cercle.
        <br />
        Les mots qui existent <strong>dans la Torah</strong> seront mis en évidence.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}
      >
        <textarea
          dir="rtl"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mot hébreu (ex : אדם)"
          style={{ ...styles.textarea, minHeight: "50px", flex: 1 }}
        />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Calcul en cours..." : "Générer la roue"}
        </button>
      </form>

      {error && <p style={styles.error}>{error}</p>}
      {dbCheckError && <p style={{ ...styles.error, marginTop: "0.25rem" }}>{dbCheckError}</p>}

      {!result && !error && (
        <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
          La roue s’affichera ici après le calcul.
        </p>
      )}

      {result && (
        <div style={{ marginTop: "1rem" }}>
          <p style={{ color: "#e5e7eb", marginBottom: "0.4rem" }}>
            Mot :{" "}
            <span dir="rtl" style={{ fontSize: "1.2rem", fontWeight: 600 }}>
              {result.text}
            </span>{" "}
            – Méthode : <strong>{result.method}</strong>
            {baseValue !== null && (
              <>
                {" "}
                – Guematria standard : <strong>{baseValue}</strong>
              </>
            )}
          </p>

          <TseroufimWheel
            baseWord={result.text}
            wheel={wheel}
            wordInfos={wordInfos}
            dbChecking={dbChecking}
            onWordClick={loadOccurrences}
            selectedWord={selectedWord}
          />

          {selectedWord && (
            <div
              style={{
                marginTop: "1.5rem",
                width: "100%",
                maxWidth: "640px",
              }}
            >
              <h3 style={{ marginBottom: "0.5rem" }}>
                Occurrences dans la Torah pour{" "}
                <span dir="rtl" style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                  {selectedWord}
                </span>
              </h3>

              {occLoading && (
                <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>Chargement des versets...</p>
              )}

              {occError && <p style={styles.error}>{occError}</p>}

              {!occLoading && !occError && occurrences.length === 0 && (
                <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                  Aucune occurrence trouvée dans la base.
                </p>
              )}

              {!occLoading && occurrences.length > 0 && (
                <div
                  style={{
                    borderRadius: "0.75rem",
                    border: "1px solid #1f2937",
                    backgroundColor: "#020617",
                    padding: "0.75rem 1rem",
                    maxHeight: "260px",
                    overflowY: "auto",
                  }}
                >
                  {occurrences.map((occ, idx) => (
                    <div
                      key={idx}
                      style={{
                        borderBottom: idx === occurrences.length - 1 ? "none" : "1px solid #1f2937",
                        padding: "0.35rem 0",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "#9ca3af",
                          marginBottom: "0.15rem",
                        }}
                      >
                        {occ.book_name_he} {occ.chapter_number}:{occ.verse_number}
                      </div>
                      <div dir="rtl" style={{ fontSize: "1rem" }}>
                        {highlightWordInVerse(occ.verse_text, selectedWord)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- composant interne pour la roue (nouveau rendu SVG style "roue") ---

function polar(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function sectorPath(cx, cy, rOuter, rInner, degStart, degEnd, ccw = true) {
  const p1 = polar(cx, cy, rOuter, degStart);
  const p2 = polar(cx, cy, rOuter, degEnd);
  const p3 = polar(cx, cy, rInner, degEnd);
  const p4 = polar(cx, cy, rInner, degStart);

  // ccw=true => sens anti-horaire (proche de ton image)
  const sweepOuter = ccw ? 0 : 1;
  const sweepInner = ccw ? 1 : 0;

  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 0 ${sweepOuter} ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 0 ${sweepInner} ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
}

function TseroufimWheel({
  baseWord,
  wheel,
  wordInfos,
  dbChecking,
  onWordClick,
  selectedWord,
  maxRings = 7, // <= change si tu veux plus/moins d'anneaux visibles
}) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const size = 560;
  const cx = size / 2;
  const cy = size / 2;

  const outerR = 240;

  const splitLetters = (s) => Array.from(s || "");

  const maxLen = Math.max(
    splitLetters(baseWord).length,
    ...(wheel || []).map((w) => splitLetters(w).length)
  );

  const rings = Math.max(1, Math.min(maxLen || 1, maxRings));
  const hasHiddenRings = maxLen > rings;

  // On garde un centre lisible, et on répartit les anneaux autour
  const minCenterR = 80;
  const band = (outerR - minCenterR) / rings; // largeur d'un anneau
  const innerMost = outerR - band * rings; // ~ minCenterR
  const centerR = Math.max(42, innerMost - 10);

  // Rayon pour texte par anneau
  const ringTextR = Array.from({ length: rings }, (_, j) => {
    const ro = outerR - band * j;
    const ri = outerR - band * (j + 1);
    return (ro + ri) / 2;
  });

  // Cercles limites (outer + chaque séparation interne)
  const ringBoundaries = [outerR, ...Array.from({ length: rings }, (_, j) => outerR - band * (j + 1))];

  const n = wheel?.length || 0;
  if (!n) return null;

  const step = 360 / n;
  const startAtTop = -90;
  const ccw = true;

  const selectedIdx = selectedWord ? wheel.findIndex((w) => w === selectedWord) : -1;
  const activeIdx = hoverIdx != null ? hoverIdx : selectedIdx;

  const centerWord =
    activeIdx != null && activeIdx >= 0 && wheel[activeIdx] ? wheel[activeIdx] : baseWord;

  // Font sizing qui s'adapte au nombre d'anneaux
  const baseFont = Math.max(11, Math.min(24, band * 0.62));

  return (
    <div style={wheelStyles.wrapper}>
      <div style={wheelStyles.circleCard}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          <defs>
            <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <radialGradient id="centerGrad" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="rgba(34,197,94,0.22)" />
              <stop offset="65%" stopColor="rgba(34,197,94,0.08)" />
              <stop offset="100%" stopColor="rgba(34,197,94,0.03)" />
            </radialGradient>
          </defs>

          {/* Fond */}
          <circle cx={cx} cy={cy} r={outerR + 2} fill="rgba(34,197,94,0.02)" />

          {/* Surbrillance secteur actif */}
          {wheel.map((_, i) => {
            const ang = startAtTop - i * step;
            const a0 = ang - step / 2;
            const a1 = ang + step / 2;

            const isHot = i === activeIdx;
            const p = sectorPath(cx, cy, outerR, innerMost, a0, a1, ccw);

            return (
              <path
                key={`hl-${i}`}
                d={p}
                fill={isHot ? "rgba(34,197,94,0.10)" : "transparent"}
                stroke="transparent"
              />
            );
          })}

          {/* Anneaux (multi) */}
          {ringBoundaries.map((r, k) => (
            <circle
              key={`ring-${k}`}
              cx={cx}
              cy={cy}
              r={r}
              fill="transparent"
              stroke={k === 0 ? "rgba(34,197,94,0.30)" : "rgba(34,197,94,0.22)"}
              strokeWidth={k === 0 ? 2 : 1.5}
            />
          ))}

          {/* Traits radiaux */}
          {wheel.map((_, i) => {
            const ang = startAtTop - i * step;
            const pOut = polar(cx, cy, outerR, ang);
            const pIn = polar(cx, cy, innerMost, ang);
            return (
              <line
                key={`rad-${i}`}
                x1={pIn.x}
                y1={pIn.y}
                x2={pOut.x}
                y2={pOut.y}
                stroke="rgba(34,197,94,0.18)"
                strokeWidth="1.2"
              />
            );
          })}

          {/* Secteurs cliquables + lettres sur N anneaux */}
          {wheel.map((w, i) => {
            const ang = startAtTop - i * step;
            const a0 = ang - step / 2;
            const a1 = ang + step / 2;

            const pClick = sectorPath(cx, cy, outerR, innerMost, a0, a1, ccw);

            const info = Array.isArray(wordInfos) ? wordInfos[i] : null;
            const hasTorah = info && info.torahOccurrences > 0;

            const isSelected = selectedIdx === i;
            const isHover = hoverIdx === i;
            const hot = isSelected || isHover;

            const baseFill = "rgba(229,231,235,0.92)";
            const torahFill = "#22c55e";
            const fill = hasTorah ? torahFill : baseFill;
            const fillHot = "#4ade80";

            const letters = splitLetters(w);
            const shownLetters = letters.slice(0, rings); // si mot > maxRings, on tronque l’affichage

            const commonText = {
              textAnchor: "middle",
              dominantBaseline: "middle",
              style: {
                fontFamily: "SBL Hebrew, Noto Sans Hebrew, Noto Serif Hebrew, system-ui",
                paintOrder: "stroke",
                stroke: hot ? "rgba(34,197,94,0.35)" : "transparent",
                strokeWidth: 4,
              },
              filter: "url(#glow)",
            };

            return (
              <g key={`sec-${i}`}>
                <path
                  d={pClick}
                  fill="transparent"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  onClick={() => onWordClick && onWordClick(w)}
                  title={
                    (hasTorah
                      ? `Existe dans la Torah (${info.torahOccurrences} occurrence(s))`
                      : "Pas trouvé dans la base Torah") + ` — ${w}`
                  }
                />

                {/* Index extérieur */}
                {(() => {
                  const pIdx = polar(cx, cy, outerR + 14, ang);
                  return (
                    <text
                      x={pIdx.x}
                      y={pIdx.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="10"
                      fill="rgba(156,163,175,0.8)"
                    >
                      {i + 1}
                    </text>
                  );
                })()}

                {/* Lettres par anneau */}
                {shownLetters.map((ch, ringIdx) => {
                  const p = polar(cx, cy, ringTextR[ringIdx], ang);
                  const fs = Math.max(10, baseFont - ringIdx * 1.1);

                  return (
                    <text
                      key={`l-${i}-${ringIdx}`}
                      x={p.x}
                      y={p.y}
                      fontSize={fs}
                      fill={hot ? fillHot : fill}
                      {...commonText}
                    >
                      {ch}
                    </text>
                  );
                })}
              </g>
            );
          })}

          {/* Centre */}
          <circle
            cx={cx}
            cy={cy}
            r={centerR}
            fill="url(#centerGrad)"
            stroke="rgba(34,197,94,0.28)"
            strokeWidth="2"
          />

          {/* Mot actif (hover/selected) */}
          <text
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={Math.max(22, 34 - Math.max(0, (maxLen - 3) * 2))}
            fill="#22c55e"
            filter="url(#glow)"
            style={{
              fontFamily: "SBL Hebrew, Noto Sans Hebrew, Noto Serif Hebrew, system-ui",
              direction: "rtl",
              letterSpacing: "0.06em",
            }}
          >
            {centerWord}
          </text>

          <text
            x={cx}
            y={cy + 22}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="12"
            fill="rgba(156,163,175,0.9)"
          >
            {activeIdx != null && activeIdx >= 0 ? "tserouf sélectionné" : "mot de base"}
          </text>

          {/* Repère sens de lecture */}
          <g>
            <polygon
              points={`${cx},${cy - outerR - 10} ${cx - 7},${cy - outerR - 24} ${cx + 7},${cy - outerR - 24}`}
              fill="rgba(34,197,94,0.65)"
            />
            <text x={cx - 100} y={cy - outerR - 18} fontSize="12" fill="rgba(156,163,175,0.9)">
              sens de lecture
            </text>
          </g>
        </svg>

        {dbChecking && (
          <p style={{ color: "#9ca3af", fontSize: "0.8rem", marginTop: "0.4rem" }}>
            Vérification dans la base Torah...
          </p>
        )}

        {hasHiddenRings && (
          <p style={{ color: "#9ca3af", fontSize: "0.8rem", marginTop: "0.4rem" }}>
            Mot long : affichage limité à {maxRings} anneaux (survol/clic = mot complet au centre).
          </p>
        )}
      </div>

      {/* Liste textuelle */}
      <div style={wheelStyles.listWrapper}>
        <h3 style={{ marginBottom: "0.4rem" }}>Liste des {n} tseroufim</h3>
        <div style={wheelStyles.listScroll}>
          {wheel.map((w, i) => {
            const info = Array.isArray(wordInfos) ? wordInfos[i] : null;
            const hasTorah = info && info.torahOccurrences > 0;
            const isSelected = selectedWord && w === selectedWord;

            return (
              <button
                key={i}
                type="button"
                onClick={() => onWordClick && onWordClick(w)}
                style={{
                  ...wheelStyles.listRowBtn,
                  borderColor: isSelected ? "#22c55e" : "#1f2937",
                  boxShadow: isSelected ? "0 0 0 1px rgba(34,197,94,0.35)" : "none",
                }}
                title={
                  hasTorah
                    ? `Existe dans la Torah (${info.torahOccurrences} occurrence(s))`
                    : "Pas trouvé dans la base Torah"
                }
              >
                <span style={{ fontSize: "0.8rem", color: "#9ca3af", width: "2rem" }}>
                  {i + 1}.
                </span>
                <span dir="rtl" style={{ fontSize: "1.1rem", flex: 1 }}>
                  {w}
                </span>
                {hasTorah && (
                  <span style={{ fontSize: "0.75rem", color: "#22c55e" }}>
                    ({info.torahOccurrences}×)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Légende */}
      <div style={wheelStyles.legend}>
        <span style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: "#22c55e" }} />
        <span>Présent dans la Torah</span>

        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            backgroundColor: "rgba(229,231,235,0.92)",
          }}
        />
        <span>Non trouvé</span>
      </div>
    </div>
  );
}


const wheelStyles = {
  wrapper: {
    marginTop: "1rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
  },
  circleCard: {
    width: "min(92vw, 620px)",
    borderRadius: "1rem",
    border: "1px solid #1f2937",
    background: "#020617",
    padding: "0.8rem",
    boxShadow: "0 15px 35px rgba(0,0,0,0.55)",
  },
  listWrapper: {
    width: "100%",
    maxWidth: "620px",
  },
  listScroll: {
    maxHeight: "200px",
    overflowY: "auto",
    borderRadius: "0.75rem",
    border: "1px solid #1f2937",
    padding: "0.5rem 0.6rem",
    backgroundColor: "#020617",
  },
  listRowBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    padding: "0.35rem 0.5rem",
    borderRadius: "0.6rem",
    background: "transparent",
    border: "1px solid #1f2937",
    cursor: "pointer",
    color: "#e5e7eb",
    marginBottom: "0.35rem",
    textAlign: "left",
  },
  legend: {
    display: "flex",
    gap: "0.75rem",
    alignItems: "center",
    fontSize: "0.8rem",
    color: "#9ca3af",
    marginTop: "0.5rem",
    flexWrap: "wrap",
    justifyContent: "center",
  },
};

export default TseroufimTab;
