// server.js
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// ⚠️ Adapte ces paramètres à ta config Postgres si besoin
const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "torahpass",
  database: process.env.DB_NAME || "torah_gematria",
});


// ===============================================

// ===============================================
// 1.b Références pour la légende (livre/chapitre/verset)
// ===============================================
// GET /api/torah/refs?indices=105,200,300&withText=1
// Renvoie la référence (livre/chapitre/verset) correspondant à chaque index lettre
// dans la Torah "sans espaces". (On mappe l'index lettre -> mot -> verset.)

const verseTextCache = new Map();

function findWordIndexForLetterIndex(letterIndex, wordStarts, wordEnds) {
  if (!Number.isFinite(letterIndex)) return -1;
  if (!Array.isArray(wordStarts) || !Array.isArray(wordEnds)) return -1;
  if (wordStarts.length === 0) return -1;

  let lo = 0;
  let hi = wordStarts.length - 1;
  let ans = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (wordStarts[mid] <= letterIndex) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (ans < 0) return -1;
  if (letterIndex > wordEnds[ans]) return -1;
  return ans;
}

async function getVerseTextHe(verseId) {
  if (!verseId) return null;
  if (verseTextCache.has(verseId)) return verseTextCache.get(verseId);

  const sql = `
    SELECT string_agg(w.text_he, ' ' ORDER BY w.word_index) AS verse_text_he
    FROM words w
    WHERE w.verse_id = $1
  `;
  const { rows } = await pool.query(sql, [verseId]);
  const text = rows?.[0]?.verse_text_he || null;
  verseTextCache.set(verseId, text);
  return text;
}

app.get("/api/torah/refs", async (req, res) => {
  try {
    const raw = (req.query.indices || "").toString().trim();
    const withText = req.query.withText === "1" || req.query.withText === "true";

    if (!raw) return res.json({ refs: [] });

    const asked = raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 300); // sécurité

    const indices = asked.map((x) => parseInt(x, 10));

    // buildTorahCache() doit retourner en cache:
    // - wordStarts, wordEnds (tableaux d'index)
    const { wordStarts, wordEnds, wordMeta } = await buildTorahCache();

    const refs = [];
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      if (!Number.isFinite(idx)) {
        refs.push({ index: asked[i], found: false });
        continue;
      }

      const wi = findWordIndexForLetterIndex(idx, wordStarts, wordEnds);
      if (wi < 0) {
        refs.push({ index: idx, found: false });
        continue;
      }

      const meta = wordMeta?.[wi];
      if (!meta) {
        refs.push({ index: idx, found: false });
        continue;
      }

      const verse_text_he = withText ? await getVerseTextHe(meta.verse_id) : null;

      refs.push({
        index: idx,
        found: true,
        verse_id: meta.verse_id,
        book_name_he: meta.book_name_he,
        book_code: meta.book_code,
        chapter_number: meta.chapter_number,
        verse_number: meta.verse_number,
        verse_text_he,
      });
    }

    return res.json({ refs });
  } catch (err) {
    console.error("ERREUR /api/torah/refs :", err);
    res.status(500).json({ error: "Erreur lors de la récupération des références" });
  }
});
// 1. Torah linéaire pour l'onglet "Codes Torah"
// ===============================================

let torahCache = null;

async function buildTorahCache() {
  if (torahCache) return torahCache;

  const sql = `
    SELECT      b.order_index,
      b.name_he          AS book_name_he,
      b.code             AS book_code,
      c.number           AS chapter_number,
      v.verse_num        AS verse_number,
      v.id               AS verse_id,
      w.word_index,
      w.text_he_no_niqqud
    FROM words w
    JOIN verses   v ON v.id = w.verse_id
    JOIN chapters c ON c.id = v.chapter_id
    JOIN books    b ON b.id = c.book_id
    ORDER BY b.order_index, c.number, v.verse_num, w.word_index
  `;

  const { rows } = await pool.query(sql);

  const parts = [];
  const wordStarts = [];
  const wordEnds = [];
  const wordMeta = [];

  let offset = 0;
  for (const row of rows) {
    const w = row.text_he_no_niqqud;
    if (!w) continue;

    const start = offset;
    const end = offset + w.length - 1;

    wordStarts.push(start);
    wordEnds.push(end);
    wordMeta.push({
      start,
      end,
      verse_id: row.verse_id,
      book_name_he: row.book_name_he,
      book_code: row.book_code,
      chapter_number: row.chapter_number,
      verse_number: row.verse_number,
    });

    offset += w.length;
    parts.push(w);
  }

  const torah = parts.join("");
  torahCache = {
    torah,
    wordStarts,
    wordEnds,
    wordMeta,
    wordCount: wordStarts.length,
  };

  console.log(
    "Torah linéaire construite, longueur =",
    torah.length,
    "| mots =",
    torahCache.wordCount
  );

  return torahCache;
}

// GET /api/torah/raw
// Option: ?meta=1 pour inclure les index des débuts/fins de mots (utile pour ר״ת / ס״ת).
app.get("/api/torah/raw", async (req, res) => {
  try {
    const { torah, wordStarts, wordEnds, wordCount } = await buildTorahCache();
    const meta = req.query.meta === "1";

    if (meta) {
      return res.json({ torah, wordStarts, wordEnds, wordCount });
    }
    return res.json({ torah });
  } catch (err) {
    console.error("ERREUR /api/torah/raw :", err);
    res.status(500).json({ error: "Erreur lors du chargement de la Torah" });
  }
});


// ==========================
// 2. Statistiques globales
// ==========================

// GET /api/stats
app.get("/api/stats", async (req, res) => {
  try {
    const booksRes = await pool.query("SELECT COUNT(*) AS c FROM books");
    const chaptersRes = await pool.query("SELECT COUNT(*) AS c FROM chapters");
    const versesRes = await pool.query("SELECT COUNT(*) AS c FROM verses");
    const wordsRes = await pool.query("SELECT COUNT(*) AS c FROM words");

    const books = parseInt(booksRes.rows[0].c, 10);
    const chapters = parseInt(chaptersRes.rows[0].c, 10);
    const verses = parseInt(versesRes.rows[0].c, 10);
    const words = parseInt(wordsRes.rows[0].c, 10);

    res.json({ books, chapters, verses, words });
  } catch (err) {
    console.error("ERREUR /api/stats :", err);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des statistiques" });
  }
});

// ===========================================
// 3. Super recherche par mot (analyse + tserouf)
// ===========================================
// UNIQUEMENT en query : /api/search/word?text=בן ou ?word=בן ou ?q=בן

app.get("/api/search/word", async (req, res) => {
  try {
    const rawText = (
      req.query.text ||   // /api/search/word?text=בן
      req.query.word ||   // /api/search/word?word=בן (tseroufim éventuel)
      req.query.q    ||   // /api/search/word?q=בן
      ""
    ).trim();

    // Si rien → réponse vide, pas d'erreur
    if (!rawText) {
      return res.json({
        query: "",
        cleaned: "",
        count: 0,
        results: [],
      });
    }

    // On garde uniquement les lettres hébraïques
    const cleanText = rawText
      .split("")
      .filter((ch) => ch >= "\u05D0" && ch <= "\u05EA")
      .join("");

    if (!cleanText) {
      return res.json({
        query: rawText,
        cleaned: "",
        count: 0,
        results: [],
      });
    }

    const sql = `
      SELECT
        b.name_he          AS book_name_he,
        b.code             AS book_code,
        b.order_index      AS book_order,
        c.number           AS chapter_number,
        v.verse_num        AS verse_number,

        (
          SELECT string_agg(w2.text_he, ' ' ORDER BY w2.word_index)
          FROM words w2
          WHERE w2.verse_id = v.id
        ) AS verse_text_he,

        w.text_he            AS word_text_he,
        w.text_he_no_niqqud  AS word_text_clean,
        w.word_index,
        w.gematria_standard,

        (
          SELECT SUM(w3.gematria_standard)
          FROM words w3
          WHERE w3.verse_id = v.id
        ) AS verse_gematria
      FROM words w
      JOIN verses   v ON v.id = w.verse_id
      JOIN chapters c ON c.id = v.chapter_id
      JOIN books    b ON b.id = c.book_id
      WHERE w.text_he_no_niqqud = $1
      ORDER BY b.order_index, c.number, v.verse_num, w.word_index
      LIMIT 500
    `;

    const { rows } = await pool.query(sql, [cleanText]);

    res.json({
      query: rawText,
      cleaned: cleanText,
      count: rows.length,
      results: rows,
    });
  } catch (err) {
    console.error("ERREUR /api/search/word :", err);
    res
      .status(500)
      .json({ error: "Erreur lors de la recherche du mot dans la Torah" });
  }
});

// ===========================================
// 3b. Tseroufim : vérifier la présence des mots
// ===========================================

// POST /api/tseroufim/check-words
// Body: { "words": ["בן","..."] }
// Réponse: { results: [ { word:"בן", torahOccurrences:25 }, ... ] }
app.post("/api/tseroufim/check-words", async (req, res) => {
  try {
    const words = Array.isArray(req.body.words) ? req.body.words : [];

    if (words.length === 0) {
      return res.json({ results: [] });
    }

    // On nettoie chaque mot (lettres hébraïques seulement)
    const cleaned = words.map((w) =>
      (w || "")
        .toString()
        .split("")
        .filter((ch) => ch >= "\u05D0" && ch <= "\u05EA")
        .join("")
    );

    const nonEmpty = cleaned.filter((w) => w.length > 0);

    if (nonEmpty.length === 0) {
      return res.json({
        results: words.map((w) => ({ word: w, torahOccurrences: 0 })),
      });
    }

    const sql = `
      SELECT text_he_no_niqqud AS word, COUNT(*) AS occurrences
      FROM words
      WHERE text_he_no_niqqud = ANY($1::text[])
      GROUP BY text_he_no_niqqud
    `;
    const { rows } = await pool.query(sql, [nonEmpty]);

    const map = {};
    for (const row of rows) {
      map[row.word] = parseInt(row.occurrences, 10);
    }

    const results = words.map((original, idx) => {
      const key = cleaned[idx];
      const count = key && map[key] ? map[key] : 0;
      return { word: original, torahOccurrences: count };
    });

    res.json({ results });
  } catch (err) {
    console.error("ERREUR /api/tseroufim/check-words :", err);
    res
      .status(500)
      .json({ error: "Erreur lors de la vérification des mots." });
  }
});

// ===========================================
// 3c. Tseroufim : occurrences d’un mot
// ===========================================

// GET /api/tseroufim/occurrences?word=בן
// Réponse: { hits: [ { book_name_he, chapter_number, verse_number, verse_text }, ... ] }
app.get("/api/tseroufim/occurrences", async (req, res) => {
  try {
    const rawText = (req.query.word || req.query.text || "").trim();

    if (!rawText) {
      return res.json({ hits: [] });
    }

    const cleanText = rawText
      .split("")
      .filter((ch) => ch >= "\u05D0" && ch <= "\u05EA")
      .join("");

    if (!cleanText) {
      return res.json({ hits: [] });
    }

    const sql = `
      SELECT
        b.name_he          AS book_name_he,
        b.code             AS book_code,
        b.order_index      AS book_order,
        c.number           AS chapter_number,
        v.verse_num        AS verse_number,
        (
          SELECT string_agg(w2.text_he, ' ' ORDER BY w2.word_index)
          FROM words w2
          WHERE w2.verse_id = v.id
        ) AS verse_text
      FROM words w
      JOIN verses   v ON v.id = w.verse_id
      JOIN chapters c ON c.id = v.chapter_id
      JOIN books    b ON b.id = c.book_id
      WHERE w.text_he_no_niqqud = $1
      ORDER BY b.order_index, c.number, v.verse_num, w.word_index
      LIMIT 500
    `;
    const { rows } = await pool.query(sql, [cleanText]);

    res.json({ hits: rows });
  } catch (err) {
    console.error("ERREUR /api/tseroufim/occurrences :", err);
    res
      .status(500)
      .json({ error: "Erreur lors du chargement des occurrences." });
  }
});


// ===================================
// 4. Mots par valeur de guematria
// ===================================

// GET /api/words/by-gematria?value=26
app.get("/api/words/by-gematria", async (req, res) => {
  const value = parseInt(req.query.value, 10);
  if (Number.isNaN(value)) {
    return res.status(400).json({ error: "Paramètre 'value' invalide" });
  }

  try {
    const sql = `
      SELECT
        text_he_no_niqqud,
        gematria_standard,
        COUNT(*) AS occurrences
      FROM words
      WHERE gematria_standard = $1
      GROUP BY text_he_no_niqqud, gematria_standard
      ORDER BY occurrences DESC, text_he_no_niqqud
    `;
    const { rows } = await pool.query(sql, [value]);
    res.json(rows);
  } catch (err) {
    console.error("ERREUR /api/words/by-gematria :", err);
    res
      .status(500)
      .json({ error: "Erreur lors de la recherche des mots par valeur" });
  }
});

// ===================================
// 5. Versets par somme exacte
// ===================================

// GET /api/verses/by-sum?value=770
app.get("/api/verses/by-sum", async (req, res) => {
  const value = parseInt(req.query.value, 10);
  if (Number.isNaN(value)) {
    return res.status(400).json({ error: "Paramètre 'value' invalide" });
  }

  try {
    const sql = `
      SELECT
        b.name_he          AS livre,
        c.number           AS chapitre,
        v.verse_num        AS verset,
        vs.verse_gematria  AS somme
      FROM verse_gematria_sum vs
      JOIN verses   v ON v.id = vs.verse_id
      JOIN chapters c ON c.id = v.chapter_id
      JOIN books    b ON b.id = c.book_id
      WHERE vs.verse_gematria = $1
      ORDER BY b.order_index, c.number, v.verse_num
    `;
    const { rows } = await pool.query(sql, [value]);
    res.json(rows);
  } catch (err) {
    console.error("ERREUR /api/verses/by-sum :", err);
    res
      .status(500)
      .json({ error: "Erreur lors de la recherche des versets par somme" });
  }
});

// ===================================
// 6. Versets les plus proches d'une valeur
// ===================================

// GET /api/verses/nearest?target=770&limit=20
app.get("/api/verses/nearest", async (req, res) => {
  const target = parseInt(req.query.target, 10);
  const limit = parseInt(req.query.limit || "20", 10);

  if (Number.isNaN(target)) {
    return res.status(400).json({ error: "Paramètre 'target' invalide" });
  }

  try {
    const sql = `
      SELECT
        b.name_he          AS livre,
        c.number           AS chapitre,
        v.verse_num        AS verset,
        vs.verse_gematria  AS somme,
        ABS(vs.verse_gematria - $1) AS distance
      FROM verse_gematria_sum vs
      JOIN verses   v ON v.id = vs.verse_id
      JOIN chapters c ON c.id = v.chapter_id
      JOIN books    b ON b.id = c.book_id
      ORDER BY distance ASC, b.order_index, c.number, v.verse_num
      LIMIT $2
    `;
    const { rows } = await pool.query(sql, [target, limit]);
    res.json(rows);
  } catch (err) {
    console.error("ERREUR /api/verses/nearest :", err);
    res
      .status(500)
      .json({ error: "Erreur lors de la recherche des versets proches" });
  }
});

// ===================================
// 7. Détail d'un verset
// ===================================

// GET /api/verse?book=BERESHIT&chapter=1&verse=1
app.get("/api/verse", async (req, res) => {
  const { book, chapter, verse } = req.query;

  if (!book || !chapter || !verse) {
    return res.status(400).json({
      error: "Paramètres requis : book, chapter, verse",
    });
  }

  try {
    const sql = `
      SELECT
        w.word_index,
        w.text_he,
        w.text_he_no_niqqud,
        w.gematria_standard
      FROM words w
      JOIN verses   v ON v.id = w.verse_id
      JOIN chapters c ON c.id = v.chapter_id
      JOIN books    b ON b.id = c.book_id
      WHERE b.code = $1
        AND c.number = $2
        AND v.verse_num = $3
      ORDER BY w.word_index
    `;
    const { rows } = await pool.query(sql, [book, chapter, verse]);
    res.json(rows);
  } catch (err) {
    console.error("ERREUR /api/verse :", err);
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération du verset" });
  }
});

// ===================================
// 8. Lancement du serveur
// ===================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API Torah DB en écoute sur http://localhost:${PORT}/api`);
})