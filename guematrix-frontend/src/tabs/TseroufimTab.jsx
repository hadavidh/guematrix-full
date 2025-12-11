import { useState } from "react";

const API_SPRING = "http://localhost:8085/guematrix/gematria"; // backend Java
const API_DB = "http://localhost:3001/api"; // backend Node (Postgres)

function TseroufimTab({ styles }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // infos DB sur chaque mot de la roue
  const [wordInfos, setWordInfos] = useState([]);
  const [dbCheckError, setDbCheckError] = useState("");
  const [dbChecking, setDbChecking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setWordInfos([]);
    setDbCheckError("");

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
        Les mots qui existent <strong>dans la Torah</strong> seront mis en
        évidence.
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
      {dbCheckError && (
        <p style={{ ...styles.error, marginTop: "0.25rem" }}>{dbCheckError}</p>
      )}

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
          />
        </div>
      )}
    </div>
  );
}

// --- composant interne pour la roue ---

function TseroufimWheel({ baseWord, wheel, wordInfos, dbChecking }) {
  const radius = 130; // rayon du cercle en px

  const legendStyle = {
    display: "flex",
    gap: "0.75rem",
    alignItems: "center",
    fontSize: "0.8rem",
    color: "#9ca3af",
    marginTop: "0.5rem",
  };

  return (
    <div style={wheelStyles.wrapper}>
      <div style={wheelStyles.circle}>
        {/* centre : mot de base */}
        <div style={wheelStyles.center}>
          <div dir="rtl" style={{ fontSize: "1.3rem", fontWeight: 700 }}>
            {baseWord}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#9ca3af" }}>mot de base</div>
        </div>

        {/* éléments sur le cercle */}
        {wheel.map((w, index) => {
          const angle = (2 * Math.PI * index) / wheel.length; // en radians
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);

          const transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;

          const isLast = index === wheel.length - 1;

          const info = Array.isArray(wordInfos) ? wordInfos[index] : null;
          const hasTorah = info && info.torahOccurrences > 0;

          // Couleurs :
          // - vert : existe dans la Torah
          // - bleu : dernier élément (souvent retour au mot d'origine) si pas trouvé
          // - gris foncé : autre
          let backgroundColor = "#0f172a";
          let borderColor = "#1f2937";
          let color = "#e5e7eb";

          if (hasTorah) {
            backgroundColor = "#22c55e";
            borderColor = "#22c55e";
            color = "#022c22";
          } else if (isLast) {
            backgroundColor = "#0ea5e9";
            borderColor = "#0ea5e9";
            color = "#02131b";
          }

          return (
            <div
              key={index}
              style={{
                ...wheelStyles.item,
                transform,
                backgroundColor,
                color,
                borderColor,
              }}
              title={
                hasTorah
                  ? `Existe dans la Torah (${info.torahOccurrences} occurrence(s))`
                  : "Pas trouvé dans la base Torah"
              }
            >
              <span dir="rtl">{w}</span>
              <span style={wheelStyles.itemIndex}>{index + 1}</span>
            </div>
          );
        })}
      </div>

      {dbChecking && (
        <p style={{ color: "#9ca3af", fontSize: "0.8rem", marginTop: "0.4rem" }}>
          Vérification dans la base Torah...
        </p>
      )}

      {/* liste textuelle en dessous */}
      <div style={wheelStyles.listWrapper}>
        <h3 style={{ marginBottom: "0.4rem" }}>Liste des 22 tseroufim</h3>
        <div style={wheelStyles.listScroll}>
          {wheel.map((w, i) => {
            const info = Array.isArray(wordInfos) ? wordInfos[i] : null;
            const hasTorah = info && info.torahOccurrences > 0;

            return (
              <div key={i} style={wheelStyles.listRow}>
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "#9ca3af",
                    width: "2rem",
                  }}
                >
                  {i + 1}.
                </span>
                <span dir="rtl" style={{ fontSize: "1.1rem" }}>
                  {w}
                </span>
                {hasTorah && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "#22c55e",
                      marginLeft: "0.5rem",
                    }}
                  >
                    ({info.torahOccurrences}× dans la Torah)
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* légende des couleurs */}
      <div style={legendStyle}>
        <span
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "999px",
            backgroundColor: "#22c55e",
          }}
        ></span>
        <span>Mot présent dans la Torah</span>

        <span
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "999px",
            backgroundColor: "#0ea5e9",
          }}
        ></span>
        <span>Dernier tserouf (souvent retour)</span>

        <span
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "999px",
            backgroundColor: "#0f172a",
            border: "1px solid #1f2937",
          }}
        ></span>
        <span>Aucun match dans la base</span>
      </div>
    </div>
  );
}

// Styles locaux de la roue (indépendants du styles global)
const wheelStyles = {
  wrapper: {
    marginTop: "1rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
  },
  circle: {
    position: "relative",
    width: "320px",
    height: "320px",
    borderRadius: "50%",
    border: "1px dashed #1f2937",
    background: "radial-gradient(circle, #020617 0%, #020617 60%, #020617 100%)",
    overflow: "visible",
  },
  center: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    padding: "0.6rem 0.9rem",
    borderRadius: "999px",
    border: "1px solid #334155",
    backgroundColor: "#020617",
    boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
    textAlign: "center",
  },
  item: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transformOrigin: "center center",
    padding: "0.3rem 0.6rem",
    borderRadius: "999px",
    border: "1px solid #1f2937",
    fontSize: "1rem",
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
    minWidth: "3.5rem",
    justifyContent: "center",
    boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
  },
  itemIndex: {
    fontSize: "0.7rem",
    opacity: 0.7,
  },
  listWrapper: {
    width: "100%",
    maxWidth: "420px",
  },
  listScroll: {
    maxHeight: "200px",
    overflowY: "auto",
    borderRadius: "0.75rem",
    border: "1px solid #1f2937",
    padding: "0.5rem 0.75rem",
    backgroundColor: "#020617",
  },
  listRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.15rem 0",
  },
};

export default TseroufimTab;
