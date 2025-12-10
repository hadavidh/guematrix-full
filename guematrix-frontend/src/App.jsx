import { useState } from "react";
import MatrixBackground from "./MatrixBackground";

const METHODS = [
  { value: "hechrechi", label: "Mispar Hechrechi" },
  { value: "gadol", label: "Mispar Gadol" },
  { value: "katan", label: "Mispar Katan" },
  { value: "atbash", label: "Atbash" },
  { value: "siduri", label: "Mispar Siduri" },
  { value: "albam", label: "Albam" },
  { value: "milui", label: "Milouï (Guematria Milouï)" },
   { value: "hakadmi", label: "Hakadmi (préfixes alphabétiques)" },
];

// Disposition approximative d'un clavier hébreu standard
const HEBREW_KEYBOARD_ROWS = [
  ["ק", "ר", "א", "ט", "ו", "ן", "ם", "פ"],
  ["ש", "ד", "ג", "כ", "ע", "י", "ח", "ל", "ך"],
  ["ז", "ס", "ב", "ה", "נ", "מ", "צ", "ת", "ץ"],
];

function App() {
  const [text, setText] = useState("");
  const [method, setMethod] = useState("hechrechi");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showKeyboard, setShowKeyboard] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!text.trim()) {
      setError("Veuillez entrer un texte hébreu.");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        text: text,
        method: method,
      });

      const response = await fetch(
        `http://localhost:8085/guematrix/gematria?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Erreur serveur : ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("Impossible d'appeler l'API (vérifie que le backend tourne).");
    } finally {
      setLoading(false);
    }
  };

  const handleVirtualKeyClick = (letter) => {
    setText((prev) => prev + letter);
  };

  const handleSpaceClick = () => {
    setText((prev) => prev + " ");
  };

  const handleBackspaceClick = () => {
    setText((prev) => prev.slice(0, -1));
  };

  return (
    <>
      {/* Fond Matrix hébraïque */}
      <MatrixBackground />

      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>GueMatriX</h1>
          <p style={styles.subtitle}>
            Backend : <code>http://localhost:8085/guematrix/gematria</code>
          </p>

          <div style={styles.contentRow}>
            {/* Colonne gauche : textarea + clavier */}
            <div style={styles.leftColumn}>
              <form onSubmit={handleSubmit} style={styles.form}>
                <label style={styles.label}>
                  Texte hébreu :
                  <textarea
                    style={styles.textarea}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Ex : בראשית, האדם..."
                    dir="rtl"
                  />
                </label>

                {/* Bouton + panneau clavier intégré */}
                <div style={styles.keyboardWrapper}>
                  <button
                    type="button"
                    style={styles.keyboardToggle}
                    onClick={() => setShowKeyboard((prev) => !prev)}
                  >
                    <span style={styles.keyboardIcon}>🎹</span>
                    <span>
                      {showKeyboard ? "Masquer le clavier" : "Clavier hébreu"}
                    </span>
                  </button>
                </div>

                {showKeyboard && (
                  <div style={styles.keyboardPanel}>
                    <div style={styles.keyboardHeader}>
                      <span style={styles.keyboardTitle}>Clavier hébreu</span>
                      <button
                        type="button"
                        style={styles.closeButton}
                        onClick={() => setShowKeyboard(false)}
                      >
                        ✕
                      </button>
                    </div>
                    <p style={styles.keyboardHint}>
                      Clique sur une lettre pour l’ajouter au texte.
                    </p>

                    <div style={styles.keyboard}>
                      {HEBREW_KEYBOARD_ROWS.map((row, rowIdx) => (
                        <div key={rowIdx} style={styles.keyboardRow}>
                          {row.map((letter) => (
                            <button
                              type="button"
                              key={letter + rowIdx}
                              style={styles.keyButton}
                              onClick={() => handleVirtualKeyClick(letter)}
                            >
                              {letter}
                            </button>
                          ))}
                        </div>
                      ))}
                      <div style={styles.keyboardRow}>
                        <button
                          type="button"
                          style={styles.keyButtonWide}
                          onClick={handleSpaceClick}
                        >
                          ␣ Espace
                        </button>
                        <button
                          type="button"
                          style={styles.keyButtonWide}
                          onClick={handleBackspaceClick}
                        >
                          ⌫ Effacer
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <label style={styles.label}>
                  Méthode :
                  <select
                    style={styles.select}
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                  >
                    {METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button type="submit" style={styles.button} disabled={loading}>
                  {loading ? "Calcul en cours..." : "Calculer"}
                </button>
              </form>

              {error && <p style={styles.error}>{error}</p>}
            </div>

            {/* Colonne droite : résultat */}
            <div style={styles.rightColumn}>
              {result ? (
                <div style={styles.result}>
                  <h2>Résultat</h2>
                  <p>
                    <strong>Texte :</strong>{" "}
                    <span dir="rtl" style={{ fontSize: "1.2rem" }}>
                      {result.text}
                    </span>
                  </p>
                  <p>
                    <strong>Méthode :</strong> {result.method}
                  </p>
                  <p>
                    <strong>Valeur totale :</strong> {result.value}
                  </p>

                  <h3>Détail par lettre</h3>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Lettre</th>
                        <th style={styles.th}>Valeur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.details?.map((d, idx) => (
                        <tr key={idx}>
                          <td dir="rtl" style={styles.tdLetter}>
                            {d.letter}
                          </td>
                          <td style={styles.tdValue}>{d.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <h3>JSON brut</h3>
                  <pre style={styles.pre}>
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              ) : (
                <div style={styles.resultPlaceholder}>
                  <h2>Résultat</h2>
                  <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
                    Saisis un mot en hébreu à gauche, choisis une méthode de
                    guematria, puis clique sur <strong>Calculer</strong>. Le
                    résultat s’affichera ici.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    margin: 0,
    padding: "2rem",
    // léger voile sombre pour voir la matrice derrière
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#e5e7eb",
    position: "relative",
    zIndex: 1,
  },
  card: {
    width: "100%",
    maxWidth: "1200px",
    background: "#020617",
    borderRadius: "1rem",
    padding: "2rem",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.75)",
    border: "1px solid #1e293b",
  },
  title: {
    margin: 0,
    marginBottom: "0.5rem",
    fontSize: "2rem",
  },
  subtitle: {
    marginTop: 0,
    marginBottom: "1.5rem",
    color: "#9ca3af",
  },
  contentRow: {
    display: "flex",
    gap: "2rem",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  leftColumn: {
    flex: "1 1 0",
    minWidth: "280px",
  },
  rightColumn: {
    flex: "1 1 0",
    minWidth: "320px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    marginBottom: "0.5rem",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    fontSize: "0.95rem",
  },
  textarea: {
    minHeight: "80px",
    padding: "0.75rem",
    fontSize: "1.1rem",
    borderRadius: "0.5rem",
    border: "1px solid #334155" ,
    background: "#020617",
    color: "#e5e7eb",
  },
  select: {
    padding: "0.5rem",
    fontSize: "1rem",
    borderRadius: "0.5rem",
    border: "1px solid #334155",
    background: "#020617",
    color: "#e5e7eb",
  },
  button: {
    marginTop: "0.5rem",
    padding: "0.75rem 1.5rem",
    fontSize: "1rem",
    borderRadius: "999px",
    border: "none",
    cursor: "pointer",
    background: "linear-gradient(90deg, #22c55e, #4ade80)",
    color: "#022c22",
    fontWeight: "600",
  },
  error: {
    color: "#fca5a5",
    marginTop: "0.25rem",
  },

  // ----- Clavier intégré -----
  keyboardWrapper: {
    marginTop: "0.25rem",
    alignSelf: "flex-start",
  },
  keyboardToggle: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.4rem 0.9rem",
    fontSize: "0.9rem",
    borderRadius: "999px",
    border: "1px solid #334155",
    background: "#020617",
    color: "#e5e7eb",
    cursor: "pointer",
  },
  keyboardIcon: {
    fontSize: "1rem",
  },
  keyboardPanel: {
    marginTop: "0.5rem",
    padding: "0.75rem 0.9rem",
    borderRadius: "0.9rem",
    border: "1px solid #1e293b",
    background: "#020617",
  },
  keyboardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "0.25rem",
  },
  keyboardTitle: {
    fontSize: "0.9rem",
    fontWeight: 600,
  },
  keyboardHint: {
    fontSize: "0.8rem",
    color: "#9ca3af",
    marginBottom: "0.4rem",
  },
  closeButton: {
    border: "none",
    background: "transparent",
    color: "#9ca3af",
    cursor: "pointer",
    fontSize: "0.95rem",
  },
  keyboard: {
    paddingTop: "0.2rem",
  },
  keyboardRow: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "0.45rem",
    marginBottom: "0.35rem",
  },
  keyButton: {
    width: "2.5rem",
    height: "2.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.2rem",
    borderRadius: "0.7rem",
    border: "1px solid #334155",
    background: "#020617",
    color: "#e5e7eb",
    cursor: "pointer",
  },
  keyButtonWide: {
    minWidth: "5.5rem",
    height: "2.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.95rem",
    borderRadius: "0.7rem",
    border: "1px solid #334155",
    background: "#020617",
    color: "#e5e7eb",
    cursor: "pointer",
  },

  // ----- Résultat -----
  result: {
    background: "#020617",
    borderRadius: "0.75rem",
    border: "1px solid #1e293b",
    padding: "1rem 1.25rem",
    maxHeight: "70vh",
    overflowY: "auto",
  },
  resultPlaceholder: {
    background: "#020617",
    borderRadius: "0.75rem",
    border: "1px dashed #1e293b",
    padding: "1rem 1.25rem",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "0.75rem",
    marginBottom: "1.25rem",
  },
  th: {
    padding: "0.6rem 1.2rem",
    borderBottom: "1px solid #1e293b",
    fontSize: "1rem",
    fontWeight: 600,
    textAlign: "center",
  },
  tdLetter: {
    padding: "0.6rem 1.2rem",
    fontSize: "1.4rem",
    textAlign: "center",
  },
  tdValue: {
    padding: "0.6rem 1.2rem",
    fontSize: "1.4rem",
    textAlign: "center",
  },
  pre: {
    background: "#020617",
    padding: "1rem",
    borderRadius: "0.5rem",
    border: "1px solid #1e293b",
    fontSize: "0.8rem",
    overflowX: "auto",
  },
};

export default App;
