import { useState, useEffect } from "react";
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

const API_BASE_DB = "http://localhost:3001/api"; // backend DB Node/Express

function App() {
  // Onglets
  const [activeTab, setActiveTab] = useState("calc"); // 'calc' ou 'db'

  // --- ÉTAT CALCULATEUR EXISTANT ---
  const [text, setText] = useState("");
  const [method, setMethod] = useState("hechrechi");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showKeyboard, setShowKeyboard] = useState(false);

  // --- ÉTAT ANALYSE DB / TORAH ---
  const [dbError, setDbError] = useState("");
  const [stats, setStats] = useState(null);

  const [wordValue, setWordValue] = useState("");
  const [wordResults, setWordResults] = useState([]);

  const [verseSumValue, setVerseSumValue] = useState("");
  const [verseResults, setVerseResults] = useState([]);

  const [nearestTarget, setNearestTarget] = useState("");
  const [nearestResults, setNearestResults] = useState([]);

  // Helper pour fetch DB
  const fetchJsonDb = async (url) => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Erreur API DB : ${res.status}`);
    }
    return res.json();
  };

  // Charger automatiquement les stats quand on ouvre l’onglet DB
  useEffect(() => {
    if (activeTab === "db" && !stats) {
      (async () => {
        try {
          setDbError("");
          const data = await fetchJsonDb(`${API_BASE_DB}/stats`);
          setStats(data);
        } catch (e) {
          console.error(e);
          setDbError("Impossible de joindre l’API DB (http://localhost:3001).");
        }
      })();
    }
  }, [activeTab, stats]);

  // ---------- HANDLERS CALCULATEUR EXISTANT ----------

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

  // ---------- HANDLERS ANALYSE DB / TORAH ----------

  const handleSearchWordsByValue = async () => {
    if (!wordValue) return;
    try {
      setDbError("");
      const data = await fetchJsonDb(
        `${API_BASE_DB}/words/by-gematria?value=${wordValue}`
      );
      setWordResults(data);
    } catch (e) {
      console.error(e);
      setDbError("Erreur lors de la récupération des mots par valeur.");
      setWordResults([]);
    }
  };

  const handleSearchVersesBySum = async () => {
    if (!verseSumValue) return;
    try {
      setDbError("");
      const data = await fetchJsonDb(
        `${API_BASE_DB}/verses/by-sum?value=${verseSumValue}`
      );
      setVerseResults(data);
    } catch (e) {
      console.error(e);
      setDbError("Erreur lors de la récupération des versets par somme.");
      setVerseResults([]);
    }
  };

  const handleSearchNearestVerses = async () => {
    if (!nearestTarget) return;
    try {
      setDbError("");
      const data = await fetchJsonDb(
        `${API_BASE_DB}/verses/nearest?target=${nearestTarget}&limit=20`
      );
      setNearestResults(data);
    } catch (e) {
      console.error(e);
      setDbError("Erreur lors de la récupération des versets proches.");
      setNearestResults([]);
    }
  };

  // ---------- RENDER ----------

  return (
    <>
      {/* Fond Matrix hébraïque */}
      <MatrixBackground />

      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.headerRow}>
            <div>
              <h1 style={styles.title}>GueMatriX</h1>
              <p style={styles.subtitle}>
                Backend guematria :{" "}
                <code>http://localhost:8085/guematrix/gematria</code>
              </p>
              <p style={styles.subtitleSmall}>
                Backend Torah DB : <code>http://localhost:3001/api</code>
              </p>
            </div>

            {/* Onglets */}
            <div style={styles.tabsRow}>
              <button
                type="button"
                onClick={() => setActiveTab("calc")}
                style={
                  activeTab === "calc"
                    ? { ...styles.tabButton, ...styles.tabButtonActive }
                    : styles.tabButton
                }
              >
                🔢 Calculateur
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("db")}
                style={
                  activeTab === "db"
                    ? { ...styles.tabButton, ...styles.tabButtonActive }
                    : styles.tabButton
                }
              >
                📜 Analyse Torah DB
              </button>
            </div>
          </div>

          {/* Contenu de l’onglet CALCULATEUR */}
          {activeTab === "calc" && (
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
                        {showKeyboard
                          ? "Masquer le clavier"
                          : "Clavier hébreu"}
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

                  <button
                    type="submit"
                    style={styles.button}
                    disabled={loading}
                  >
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
          )}

          {/* Contenu de l’onglet ANALYSE DB / TORAH */}
          {activeTab === "db" && (
            <div style={{ marginTop: "1.5rem" }}>
              {dbError && <p style={styles.error}>{dbError}</p>}

              {/* Stats globales */}
              <section style={{ marginBottom: "1.5rem" }}>
                <h2>Statistiques Torah DB</h2>
                {stats ? (
                  <ul style={{ fontSize: "0.95rem", color: "#e5e7eb" }}>
                    <li>Livres : {stats.books}</li>
                    <li>Chapitres : {stats.chapters}</li>
                    <li>Versets : {stats.verses}</li>
                    <li>Mots : {stats.words}</li>
                  </ul>
                ) : (
                  <p style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
                    Chargement des statistiques...
                  </p>
                )}
              </section>

              <div style={styles.contentRow}>
                {/* Colonne gauche : recherches mots / versets */}
                <div style={styles.leftColumn}>
                  <section style={styles.dbSection}>
                    <h3>Mots par valeur de guematria</h3>
                    <p style={styles.dbHint}>
                      Exemple : 26, 72, 770, 613...
                    </p>
                    <div style={styles.dbInputRow}>
                      <input
                        type="number"
                        value={wordValue}
                        onChange={(e) => setWordValue(e.target.value)}
                        placeholder="Valeur (ex: 26)"
                        style={styles.dbInput}
                      />
                      <button
                        type="button"
                        style={styles.buttonSmall}
                        onClick={handleSearchWordsByValue}
                      >
                        Chercher
                      </button>
                    </div>

                    <div style={styles.dbScrollArea}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Mot (sans niqqoud)</th>
                            <th style={styles.th}>Valeur</th>
                            <th style={styles.th}>Occ.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {wordResults.map((row, idx) => (
                            <tr key={idx}>
                              <td style={styles.tdCenter}>
                                {row.text_he_no_niqqud}
                              </td>
                              <td style={styles.tdCenter}>
                                {row.gematria_standard}
                              </td>
                              <td style={styles.tdCenter}>
                                {row.occurrences}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section style={styles.dbSection}>
                    <h3>Versets par somme de guematria</h3>
                    <p style={styles.dbHint}>
                      Cherche tous les versets dont la somme vaut une valeur
                      précise.
                    </p>
                    <div style={styles.dbInputRow}>
                      <input
                        type="number"
                        value={verseSumValue}
                        onChange={(e) => setVerseSumValue(e.target.value)}
                        placeholder="Somme (ex: 770)"
                        style={styles.dbInput}
                      />
                      <button
                        type="button"
                        style={styles.buttonSmall}
                        onClick={handleSearchVersesBySum}
                      >
                        Chercher
                      </button>
                    </div>

                    <div style={styles.dbScrollArea}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Livre</th>
                            <th style={styles.th}>Chap.</th>
                            <th style={styles.th}>Verset</th>
                            <th style={styles.th}>Somme</th>
                          </tr>
                        </thead>
                        <tbody>
                          {verseResults.map((row, idx) => (
                            <tr
                              key={`${row.livre}-${row.chapitre}-${row.verset}-${idx}`}
                            >
                              <td style={styles.tdCenter}>{row.livre}</td>
                              <td style={styles.tdCenter}>{row.chapitre}</td>
                              <td style={styles.tdCenter}>{row.verset}</td>
                              <td style={styles.tdCenter}>{row.somme}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>

                {/* Colonne droite : versets proches d’une valeur */}
                <div style={styles.rightColumn}>
                  <section style={styles.dbSection}>
                    <h3>Versets les plus proches d’une valeur</h3>
                    <p style={styles.dbHint}>
                      Exemple : 770 → montre les versets dont la somme est la
                      plus proche de 770.
                    </p>
                    <div style={styles.dbInputRow}>
                      <input
                        type="number"
                        value={nearestTarget}
                        onChange={(e) => setNearestTarget(e.target.value)}
                        placeholder="Cible (ex: 770)"
                        style={styles.dbInput}
                      />
                      <button
                        type="button"
                        style={styles.buttonSmall}
                        onClick={handleSearchNearestVerses}
                      >
                        Chercher
                      </button>
                    </div>

                    <div style={styles.dbScrollArea}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Livre</th>
                            <th style={styles.th}>Chap.</th>
                            <th style={styles.th}>Verset</th>
                            <th style={styles.th}>Somme</th>
                            <th style={styles.th}>Distance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nearestResults.map((row, idx) => (
                            <tr
                              key={`${row.livre}-${row.chapitre}-${row.verset}-${idx}`}
                            >
                              <td style={styles.tdCenter}>{row.livre}</td>
                              <td style={styles.tdCenter}>{row.chapitre}</td>
                              <td style={styles.tdCenter}>{row.verset}</td>
                              <td style={styles.tdCenter}>{row.somme}</td>
                              <td style={styles.tdCenter}>{row.distance}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
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
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1rem",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    marginBottom: "0.5rem",
    fontSize: "2rem",
  },
  subtitle: {
    marginTop: 0,
    marginBottom: "0.25rem",
    color: "#9ca3af",
  },
  subtitleSmall: {
    marginTop: 0,
    marginBottom: 0,
    color: "#6b7280",
    fontSize: "0.85rem",
  },
  tabsRow: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  tabButton: {
    padding: "0.4rem 0.9rem",
    borderRadius: "999px",
    border: "1px solid #1e293b",
    background: "#020617",
    color: "#e5e7eb",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  tabButtonActive: {
    background: "linear-gradient(90deg, #22c55e, #4ade80)",
    color: "#022c22",
    borderColor: "#22c55e",
    fontWeight: 600,
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
    border: "1px solid #334155",
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
  buttonSmall: {
    padding: "0.5rem 1rem",
    fontSize: "0.9rem",
    borderRadius: "999px",
    border: "none",
    cursor: "pointer",
    background: "linear-gradient(90deg, #22c55e, #4ade80)",
    color: "#022c22",
    fontWeight: "600",
    whiteSpace: "nowrap",
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

  // ----- Résultat calculateur -----
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
  tdCenter: {
    padding: "0.5rem 0.5rem",
    fontSize: "0.9rem",
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

  // ----- Sections DB -----
  dbSection: {
    background: "#020617",
    borderRadius: "0.75rem",
    border: "1px solid #1e293b",
    padding: "0.9rem 1rem",
    marginBottom: "1rem",
  },
  dbHint: {
    fontSize: "0.8rem",
    color: "#9ca3af",
    marginTop: "0.2rem",
    marginBottom: "0.5rem",
  },
  dbInputRow: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "0.5rem",
    alignItems: "center",
  },
  dbInput: {
    flex: 1,
    padding: "0.4rem 0.6rem",
    fontSize: "0.9rem",
    borderRadius: "0.5rem",
    border: "1px solid #334155",
    background: "#020617",
    color: "#e5e7eb",
  },
  dbScrollArea: {
    maxHeight: "220px",
    overflowY: "auto",
    borderTop: "1px solid #1e293b",
    marginTop: "0.5rem",
    paddingTop: "0.4rem",
  },
};

export default App;
