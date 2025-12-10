import { useState } from "react";

const API_BASE = "http://localhost:3001/api";

export default function TorahDbTools() {
  const [wordValue, setWordValue] = useState("");
  const [wordResults, setWordResults] = useState([]);

  const [verseSumValue, setVerseSumValue] = useState("");
  const [verseResults, setVerseResults] = useState([]);

  const [nearestTarget, setNearestTarget] = useState("");
  const [nearestResults, setNearestResults] = useState([]);

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erreur API");
    return res.json();
  }

  const handleSearchWords = async () => {
    if (!wordValue) return;
    try {
      const data = await fetchJson(
        `${API_BASE}/words/by-gematria?value=${wordValue}`
      );
      setWordResults(data);
    } catch (e) {
      console.error(e);
      setWordResults([]);
    }
  };

  const handleSearchVersesBySum = async () => {
    if (!verseSumValue) return;
    try {
      const data = await fetchJson(
        `${API_BASE}/verses/by-sum?value=${verseSumValue}`
      );
      setVerseResults(data);
    } catch (e) {
      console.error(e);
      setVerseResults([]);
    }
  };

  const handleSearchNearest = async () => {
    if (!nearestTarget) return;
    try {
      const data = await fetchJson(
        `${API_BASE}/verses/nearest?target=${nearestTarget}&limit=20`
      );
      setNearestResults(data);
    } catch (e) {
      console.error(e);
      setNearestResults([]);
    }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Analyse Torah / Base de données Guematria</h2>

      {/* Bloc 1 : mots par valeur */}
      <section style={{ marginTop: "1rem" }}>
        <h3>Mots par valeur de guematria</h3>
        <input
          type="number"
          value={wordValue}
          onChange={(e) => setWordValue(e.target.value)}
          placeholder="Valeur (ex: 26, 770)"
        />
        <button onClick={handleSearchWords}>Chercher</button>

        <table>
          <thead>
            <tr>
              <th>Mot (sans niqqoud)</th>
              <th>Valeur</th>
              <th>Occurrences</th>
            </tr>
          </thead>
          <tbody>
            {wordResults.map((row, idx) => (
              <tr key={idx}>
                <td>{row.text_he_no_niqqud}</td>
                <td>{row.gematria_standard}</td>
                <td>{row.occurrences}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Bloc 2 : versets par somme */}
      <section style={{ marginTop: "2rem" }}>
        <h3>Versets par somme de guematria</h3>
        <input
          type="number"
          value={verseSumValue}
          onChange={(e) => setVerseSumValue(e.target.value)}
          placeholder="Somme (ex: 770)"
        />
        <button onClick={handleSearchVersesBySum}>Chercher</button>

        <table>
          <thead>
            <tr>
              <th>Livre</th>
              <th>Chap.</th>
              <th>Verset</th>
              <th>Somme</th>
            </tr>
          </thead>
          <tbody>
            {verseResults.map((row, idx) => (
              <tr key={`${row.livre}-${row.chapitre}-${row.verset}-${idx}`}>
                <td>{row.livre}</td>
                <td>{row.chapitre}</td>
                <td>{row.verset}</td>
                <td>{row.somme}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Bloc 3 : versets les plus proches d’une valeur */}
      <section style={{ marginTop: "2rem" }}>
        <h3>Versets les plus proches d’une valeur</h3>
        <input
          type="number"
          value={nearestTarget}
          onChange={(e) => setNearestTarget(e.target.value)}
          placeholder="Cible (ex: 770)"
        />
        <button onClick={handleSearchNearest}>Chercher</button>

        <table>
          <thead>
            <tr>
              <th>Livre</th>
              <th>Chap.</th>
              <th>Verset</th>
              <th>Somme</th>
              <th>Distance</th>
            </tr>
          </thead>
          <tbody>
            {nearestResults.map((row, idx) => (
              <tr key={`${row.livre}-${row.chapitre}-${row.verset}-${idx}`}>
                <td>{row.livre}</td>
                <td>{row.chapitre}</td>
                <td>{row.verset}</td>
                <td>{row.somme}</td>
                <td>{row.distance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
