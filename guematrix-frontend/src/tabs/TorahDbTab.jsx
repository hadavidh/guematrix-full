import { useState, useEffect } from "react";

import { API_DB } from "../apiBase";
const API_BASE_DB = API_DB;

function TorahDbTab({ styles }) {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState("");

  // --- Recherche par mot (Option 1) ---
  const [searchWord, setSearchWord] = useState("");
  const [searchWordLoading, setSearchWordLoading] = useState(false);
  const [searchWordError, setSearchWordError] = useState("");
  const [searchWordResults, setSearchWordResults] = useState([]);

  // --- Mots par valeur de guematria ---
  const [gematriaValue, setGematriaValue] = useState("");
  const [gematriaLoading, setGematriaLoading] = useState(false);
  const [gematriaError, setGematriaError] = useState("");
  const [gematriaResults, setGematriaResults] = useState([]);

  // --- Versets par somme exacte ---
  const [sumValue, setSumValue] = useState("");
  const [versesExactLoading, setVersesExactLoading] = useState(false);
  const [versesExactError, setVersesExactError] = useState("");
  const [versesExactResults, setVersesExactResults] = useState([]);

  // --- Versets les plus proches d'une valeur ---
  const [nearestTarget, setNearestTarget] = useState("");
  const [nearestLimit, setNearestLimit] = useState(20);
  const [versesNearestLoading, setVersesNearestLoading] = useState(false);
  const [versesNearestError, setVersesNearestError] = useState("");
  const [versesNearestResults, setVersesNearestResults] = useState([]);

  // --- Détail d'un verset ---
  const [verseBook, setVerseBook] = useState("BERESHIT");
  const [verseChapter, setVerseChapter] = useState("");
  const [verseNumber, setVerseNumber] = useState("");
  const [verseLoading, setVerseLoading] = useState(false);
  const [verseError, setVerseError] = useState("");
  const [verseDetails, setVerseDetails] = useState([]);

  // Charger les stats au montage
  useEffect(() => {
    const loadStats = async () => {
      try {
        setStatsError("");
        const res = await fetch(`${API_BASE_DB}/stats`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setStats(data);
      } catch (e) {
        console.error(e);
        setStatsError("Impossible de charger les statistiques globales.");
      }
    };
    loadStats();
  }, []);

  // --- Helper pour surligner un mot dans un verset ---
  const highlightWordInVerse = (verseText, wordText) => {
    if (!verseText || !wordText) return verseText;

    const parts = verseText.split(wordText);
    if (parts.length === 1) {
      return verseText;
    }

    const nodes = [];
    parts.forEach((part, index) => {
      if (part) {
        nodes.push(<span key={`p-${index}`}>{part}</span>);
      }
      if (index < parts.length - 1) {
        nodes.push(
          <span
            key={`h-${index}`}
            style={{
              backgroundColor: "#facc15",
              color: "#111827",
              fontWeight: 600,
            }}
          >
            {wordText}
          </span>
        );
      }
    });
    return nodes;
  };

  // --- Actions ---

  const handleSearchWord = async (e) => {
    e.preventDefault();
    setSearchWordError("");
    setSearchWordResults([]);

    const value = searchWord.trim();
    if (!value) {
      setSearchWordError("Entre un mot hébreu à chercher.");
      return;
    }

    try {
      setSearchWordLoading(true);
      const params = new URLSearchParams({ text: value });
      const res = await fetch(
        `${API_BASE_DB}/search/word?${params.toString()}`
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSearchWordResults(data.results || []);
    } catch (err) {
      console.error(err);
      setSearchWordError(
        err.message || "Erreur lors de la recherche du mot."
      );
    } finally {
      setSearchWordLoading(false);
    }
  };

  const handleSearchWordsByGematria = async (e) => {
    e.preventDefault();
    setGematriaError("");
    setGematriaResults([]);

    const v = gematriaValue.trim();
    if (!v) {
      setGematriaError("Entre une valeur numérique (ex : 26, 72, 770...).");
      return;
    }

    try {
      setGematriaLoading(true);
      const params = new URLSearchParams({ value: v });
      const res = await fetch(
        `${API_BASE_DB}/words/by-gematria?${params.toString()}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setGematriaResults(data || []);
    } catch (err) {
      console.error(err);
      setGematriaError(
        "Erreur lors de la recherche des mots par valeur de guematria."
      );
    } finally {
      setGematriaLoading(false);
    }
  };

  const handleSearchVersesBySum = async (e) => {
    e.preventDefault();
    setVersesExactError("");
    setVersesExactResults([]);

    const v = sumValue.trim();
    if (!v) {
      setVersesExactError("Entre une valeur numérique (ex : 26, 72, 770...).");
      return;
    }

    try {
      setVersesExactLoading(true);
      const params = new URLSearchParams({ value: v });
      const res = await fetch(
        `${API_BASE_DB}/verses/by-sum?${params.toString()}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVersesExactResults(data || []);
    } catch (err) {
      console.error(err);
      setVersesExactError(
        "Erreur lors de la recherche des versets par somme exacte."
      );
    } finally {
      setVersesExactLoading(false);
    }
  };

  const handleSearchVersesNearest = async (e) => {
    e.preventDefault();
    setVersesNearestError("");
    setVersesNearestResults([]);

    const t = nearestTarget.trim();
    if (!t) {
      setVersesNearestError(
        "Entre une valeur cible (ex : 770) pour chercher les versets les plus proches."
      );
      return;
    }

    try {
      setVersesNearestLoading(true);
      const params = new URLSearchParams({
        target: t,
        limit: String(nearestLimit || 20),
      });
      const res = await fetch(
        `${API_BASE_DB}/verses/nearest?${params.toString()}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVersesNearestResults(data || []);
    } catch (err) {
      console.error(err);
      setVersesNearestError(
        "Erreur lors de la recherche des versets les plus proches."
      );
    } finally {
      setVersesNearestLoading(false);
    }
  };

  const handleLoadVerseDetails = async (e) => {
    e.preventDefault();
    setVerseError("");
    setVerseDetails([]);

    const b = verseBook.trim();
    const c = verseChapter.trim();
    const v = verseNumber.trim();

    if (!b || !c || !v) {
      setVerseError("Remplis book, chapitre et verset (ex : BERESHIT 1:1).");
      return;
    }

    try {
      setVerseLoading(true);
      const params = new URLSearchParams({
        book: b,
        chapter: c,
        verse: v,
      });
      const res = await fetch(
        `${API_BASE_DB}/verse?${params.toString()}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVerseDetails(data || []);
    } catch (err) {
      console.error(err);
      setVerseError("Erreur lors du chargement du verset.");
    } finally {
      setVerseLoading(false);
    }
  };

  // --- Petits calculs dérivés ---

  const searchWordOccurrences = searchWordResults.length;
  const searchWordGematria =
    searchWordResults[0]?.gematria_standard != null
      ? Number(searchWordResults[0].gematria_standard)
      : null;

  const verseTotalGematria = verseDetails.reduce((sum, w) => {
    const v = w.gematria_standard;
    return sum + (v != null ? Number(v) : 0);
  }, 0);

  return (
    <div style={{ marginTop: "1.5rem" }}>
      {/* Statistiques globales */}
      <section style={styles.dbSection}>
        <h2>Statistiques globales Torah DB</h2>
        {statsError && <p style={styles.error}>{statsError}</p>}
        {!stats && !statsError && (
          <p style={styles.dbHint}>Chargement des statistiques...</p>
        )}
        {stats && (
          <div>
            <p style={styles.dbHint}>
              Livres : <strong>{stats.books}</strong> – Chapitres :{" "}
              <strong>{stats.chapters}</strong> – Versets :{" "}
              <strong>{stats.verses}</strong> – Mots :{" "}
              <strong>{stats.words}</strong>
            </p>
          </div>
        )}
      </section>

      {/* Recherche par mot (Option 1) */}
      <section style={styles.dbSection}>
        <h2>Recherche par mot dans la Torah</h2>
        <p style={styles.dbHint}>
          Tape un mot hébreu (sans niqqoud de préférence) – par exemple{" "}
          <strong>משה</strong>, <strong>ישראל</strong>, <strong>אמונה</strong>...
        </p>

        <form onSubmit={handleSearchWord} style={styles.dbInputRow}>
          <input
            type="text"
            dir="rtl"
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            placeholder="Mot hébreu à chercher"
            style={styles.dbInput}
          />
          <button
            type="submit"
            style={styles.buttonSmall}
            disabled={searchWordLoading}
          >
            {searchWordLoading ? "Recherche..." : "Rechercher"}
          </button>
        </form>

        {searchWordError && <p style={styles.error}>{searchWordError}</p>}

        {searchWordResults.length > 0 && (
          <>
            <p style={styles.dbHint}>
              Mot recherché :{" "}
              <span dir="rtl" style={{ fontSize: "1.1rem" }}>
                {searchWord}
              </span>{" "}
              – Occurrences :{" "}
              <strong>{searchWordOccurrences}</strong>
              {searchWordGematria != null && (
                <>
                  {" "}
                  – Guematria : <strong>{searchWordGematria}</strong>
                </>
              )}
            </p>

            <div style={styles.dbScrollAreaTall}>
              {searchWordResults.map((r, idx) => (
                <div
                  key={`${r.book_code}-${r.chapter_number}-${r.verse_number}-${r.word_index}-${idx}`}
                  style={{
                    borderBottom: "1px solid #1f2937",
                    paddingBottom: "0.4rem",
                    marginBottom: "0.4rem",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "#9ca3af",
                      marginBottom: "0.2rem",
                    }}
                  >
                    {r.book_name_he} {r.chapter_number}:{r.verse_number} – mot{" "}
                    #{r.word_index} – verset Σ{" "}
                    {r.verse_gematria != null ? r.verse_gematria : "?"}
                  </p>
                  <p dir="rtl" style={{ fontSize: "1.1rem" }}>
                    {highlightWordInVerse(r.verse_text_he, r.word_text_he)}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {!searchWordLoading &&
          !searchWordError &&
          searchWordResults.length === 0 &&
          searchWord.trim() && (
            <p style={styles.dbHint}>
              Aucun résultat pour ce mot (dans son écriture actuelle). Essaie
              éventuellement sans niqqoud ou avec une autre forme.
            </p>
          )}
      </section>

      {/* Mots par valeur de guematria */}
      <section style={styles.dbSection}>
        <h3>Mots par valeur de guematria</h3>
        <form onSubmit={handleSearchWordsByGematria} style={styles.dbInputRow}>
          <input
            type="number"
            value={gematriaValue}
            onChange={(e) => setGematriaValue(e.target.value)}
            placeholder="Valeur (ex : 26, 72, 770)"
            style={styles.dbInput}
          />
          <button
            type="submit"
            style={styles.buttonSmall}
            disabled={gematriaLoading}
          >
            {gematriaLoading ? "Recherche..." : "Chercher les mots"}
          </button>
        </form>
        {gematriaError && <p style={styles.error}>{gematriaError}</p>}
        {gematriaResults.length > 0 && (
          <div style={styles.dbScrollArea}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Mot (sans niqqoud)</th>
                  <th style={styles.th}>Valeur</th>
                  <th style={styles.th}>Occurrences</th>
                </tr>
              </thead>
              <tbody>
                {gematriaResults.map((w, idx) => (
                  <tr key={idx}>
                    <td style={styles.tdCenter} dir="rtl">
                      {w.text_he_no_niqqud}
                    </td>
                    <td style={styles.tdCenter}>{w.gematria_standard}</td>
                    <td style={styles.tdCenter}>{w.occurrences}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Versets par somme exacte / proches */}
      <section style={styles.dbSection}>
        <h3>Versets par somme de guematria</h3>

        <form onSubmit={handleSearchVersesBySum} style={styles.dbInputRow}>
          <input
            type="number"
            value={sumValue}
            onChange={(e) => setSumValue(e.target.value)}
            placeholder="Somme exacte (ex : 770)"
            style={styles.dbInput}
          />
          <button
            type="submit"
            style={styles.buttonSmall}
            disabled={versesExactLoading}
          >
            {versesExactLoading ? "Recherche..." : "Versets (somme exacte)"}
          </button>
        </form>
        {versesExactError && <p style={styles.error}>{versesExactError}</p>}

        {versesExactResults.length > 0 && (
          <div style={styles.dbScrollArea}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Livre</th>
                  <th style={styles.th}>Chapitre</th>
                  <th style={styles.th}>Verset</th>
                  <th style={styles.th}>Somme</th>
                </tr>
              </thead>
              <tbody>
                {versesExactResults.map((v, idx) => (
                  <tr key={idx}>
                    <td style={styles.tdCenter}>{v.livre}</td>
                    <td style={styles.tdCenter}>{v.chapitre}</td>
                    <td style={styles.tdCenter}>{v.verset}</td>
                    <td style={styles.tdCenter}>{v.somme}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <hr style={{ borderColor: "#1f2937", margin: "0.75rem 0" }} />

        <form onSubmit={handleSearchVersesNearest} style={styles.dbInputRow}>
          <input
            type="number"
            value={nearestTarget}
            onChange={(e) => setNearestTarget(e.target.value)}
            placeholder="Valeur cible (ex : 770)"
            style={styles.dbInput}
          />
          <input
            type="number"
            value={nearestLimit}
            onChange={(e) => setNearestLimit(e.target.value)}
            placeholder="Limite (ex : 20)"
            style={{ ...styles.dbInput, maxWidth: "120px" }}
          />
          <button
            type="submit"
            style={styles.buttonSmall}
            disabled={versesNearestLoading}
          >
            {versesNearestLoading
              ? "Recherche..."
              : "Versets les plus proches"}
          </button>
        </form>
        {versesNearestError && (
          <p style={styles.error}>{versesNearestError}</p>
        )}

        {versesNearestResults.length > 0 && (
          <div style={styles.dbScrollArea}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Livre</th>
                  <th style={styles.th}>Chapitre</th>
                  <th style={styles.th}>Verset</th>
                  <th style={styles.th}>Somme</th>
                  <th style={styles.th}>Distance</th>
                </tr>
              </thead>
              <tbody>
                {versesNearestResults.map((v, idx) => (
                  <tr key={idx}>
                    <td style={styles.tdCenter}>{v.livre}</td>
                    <td style={styles.tdCenter}>{v.chapitre}</td>
                    <td style={styles.tdCenter}>{v.verset}</td>
                    <td style={styles.tdCenter}>{v.somme}</td>
                    <td style={styles.tdCenter}>{v.distance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Détail d'un verset */}
      <section style={styles.dbSection}>
        <h3>Détail d’un verset</h3>
        <form onSubmit={handleLoadVerseDetails} style={styles.dbInputRow}>
          <input
            type="text"
            value={verseBook}
            onChange={(e) => setVerseBook(e.target.value)}
            placeholder="Code livre (ex : BERESHIT)"
            style={styles.dbInput}
          />
          <input
            type="number"
            value={verseChapter}
            onChange={(e) => setVerseChapter(e.target.value)}
            placeholder="Chapitre"
            style={{ ...styles.dbInput, maxWidth: "120px" }}
          />
          <input
            type="number"
            value={verseNumber}
            onChange={(e) => setVerseNumber(e.target.value)}
            placeholder="Verset"
            style={{ ...styles.dbInput, maxWidth: "120px" }}
          />
          <button
            type="submit"
            style={styles.buttonSmall}
            disabled={verseLoading}
          >
            {verseLoading ? "Chargement..." : "Afficher le verset"}
          </button>
        </form>
        {verseError && <p style={styles.error}>{verseError}</p>}

        {verseDetails.length > 0 && (
          <>
            <p style={styles.dbHint}>
              Total guematria (recalculé) :{" "}
              <strong>{verseTotalGematria}</strong>
            </p>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Mot (avec niqqoud)</th>
                  <th style={styles.th}>Sans niqqoud</th>
                  <th style={styles.th}>Valeur</th>
                </tr>
              </thead>
              <tbody>
                {verseDetails.map((w, idx) => (
                  <tr key={idx}>
                    <td style={styles.tdCenter}>{w.word_index}</td>
                    <td style={styles.tdCenter} dir="rtl">
                      {w.text_he}
                    </td>
                    <td style={styles.tdCenter} dir="rtl">
                      {w.text_he_no_niqqud}
                    </td>
                    <td style={styles.tdCenter}>{w.gematria_standard}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </div>
  );
}

export default TorahDbTab;
