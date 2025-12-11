import { useState } from "react";
import MatrixBackground from "./MatrixBackground";
import CalculatorTab from "./tabs/CalculatorTab";
import TorahDbTab from "./tabs/TorahDbTab";
import TorahCodesTab from "./tabs/TorahCodesTab";

function App() {
  const [activeTab, setActiveTab] = useState("calc"); // "calc" | "db" | "codes"

  return (
    <>
      <MatrixBackground />

      <div style={styles.page}>
        <div style={styles.card}>
          {/* Header + onglets */}
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

              <button
                type="button"
                onClick={() => setActiveTab("codes")}
                style={
                  activeTab === "codes"
                    ? { ...styles.tabButton, ...styles.tabButtonActive }
                    : styles.tabButton
                }
              >
                🔍 Codes Torah
              </button>
            </div>
          </div>

          {/* Onglets */}
          {activeTab === "calc" && <CalculatorTab styles={styles} />}
          {activeTab === "db" && <TorahDbTab styles={styles} />}
          {activeTab === "codes" && <TorahCodesTab styles={styles} />}
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

  // Layout commun
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

  // Formulaires / inputs / boutons
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
  buttonTiny: {
    padding: "0.25rem 0.5rem",
    fontSize: "0.8rem",
    borderRadius: "999px",
    border: "none",
    cursor: "pointer",
    background: "#22c55e",
    color: "#022c22",
    fontWeight: 600,
  },
  error: {
    color: "#fca5a5",
    marginTop: "0.25rem",
  },

  // Clavier hébreu
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

  // Résultats / tables
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

  // Sections DB & Codes
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
  dbScrollAreaTall: {
    maxHeight: "260px",
    overflowY: "auto",
    borderTop: "1px solid #1e293b",
    marginTop: "0.5rem",
    paddingTop: "0.4rem",
  },
  torahBlock: {
    maxHeight: "220px",
    overflowY: "auto",
    background: "#020617",
    border: "1px solid #1e293b",
    borderRadius: "0.5rem",
    padding: "0.75rem",
    fontSize: "1.05rem",
    direction: "rtl",
    whiteSpace: "normal",
    lineHeight: 1.6,
  },

  // Boutons de match (Codes Torah)
  matchButton: {
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "1px solid #1f2937",
    borderRadius: "0.5rem",
    padding: "0.35rem 0.5rem",
    marginBottom: "0.35rem",
    cursor: "pointer",
    color: "#e5e7eb",
  },
  matchButtonActive: {
    borderColor: "#22c55e",
    boxShadow: "0 0 0 1px rgba(34,197,94,0.4)",
  },

  // Matrice (Codes Torah)
  matrixContainer: {
    display: "inline-block",
    border: "1px solid #1f2937",
    borderRadius: "0.5rem",
    padding: "0.4rem",
    background: "#020617",
    maxHeight: "400px",
    overflow: "auto",
  },
  matrixRow: {
    display: "flex",
    flexDirection: "row-reverse",
  },
  matrixCell: {
    width: "1.3rem",
    height: "1.3rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1rem",
    borderRadius: "0.2rem",
    margin: "0.05rem",
  },
  matrixCellIntersection: {
    background: "#f9fafb",
    color: "#111827",
    fontWeight: 700,
  },
  matrixCellCenter: {
    border: "1px solid #22c55e",
  },
};

export default App;
