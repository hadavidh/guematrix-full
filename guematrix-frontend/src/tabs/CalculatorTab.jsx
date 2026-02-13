import { useState } from "react";
import { API_GUEMATRIX } from "../apiBase";


const METHODS = [
  { value: "hechrechi", label: "Mispar Hechrechi" },
  { value: "gadol", label: "Mispar Gadol" },
  { value: "katan", label: "Mispar Katan" },
  { value: "atbash", label: "Atbash" },
  { value: "siduri", label: "Mispar Siduri" },
  { value: "albam", label: "Albam" },
  { value: "milui", label: "Milouï (Guematria Milouï)" },
  { value: "hakadmi", label: "Hakadmi (préfixes alphabétiques)" },
  { value: "tseroufim", label: "roue permutation aboulafia" },
];

const HEBREW_KEYBOARD_ROWS = [
  ["ק", "ר", "א", "ט", "ו", "ן", "ם", "פ"],
  ["ש", "ד", "ג", "כ", "ע", "י", "ח", "ל", "ך"],
  ["ז", "ס", "ב", "ה", "נ", "מ", "צ", "ת", "ץ"],
];

function CalculatorTab({ styles }) {
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

      const response = await fetch(`${API_GUEMATRIX}?${params.toString()}`);

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
    <div style={styles.contentRow}>
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

          <div style={styles.keyboardWrapper}>
            <button
              type="button"
              style={styles.keyboardToggle}
              onClick={() => setShowKeyboard((prev) => !prev)}
            >
              <span style={styles.keyboardIcon}>🎹</span>
              <span>{showKeyboard ? "Masquer le clavier" : "Clavier hébreu"}</span>
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
            <pre style={styles.pre}>{JSON.stringify(result, null, 2)}</pre>
          </div>
        ) : (
          <div style={styles.resultPlaceholder}>
            <h2>Résultat</h2>
            <p style={{ color: "#6b7280", fontSize: "0.95rem" }}>
              Saisis un mot en hébreu à gauche, choisis une méthode de
              guematria, puis clique sur <strong>Calculer</strong>. Le résultat
              s’affichera ici.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CalculatorTab;
