const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

//DAVID
let torahCache = null;


const app = express();
app.use(cors());
app.use(express.json());

// ⚠️ Pour l’instant : Node tourne sur ta machine, PostgreSQL est dans Docker
// exposé en localhost:5432 → on se connecte en 127.0.0.1
// Quand on dockerisera l’API, on changera host: "postgres"
const pool = new Pool({
  host: "127.0.0.1",
  port: 5432,
  database: "torah_gematria",
  user: "postgres",
  password: "torahpass",
});

async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const res = await client.query(sql, params);
    return res.rows;
  } finally {
    client.release();
  }
}

//DAVID
function cleanHebrewWord(raw) {
  return (raw || "")
    // enlever niqqoud + signes de cantillation
    .replace(/[\u0591-\u05C7]/g, "")
    // ne garder que les lettres א à ת
    .replace(/[^א-ת]/g, "")
    .trim();
}

//DAVID
// Vérifier une liste de mots tseroufim dans la Torah
// POST /api/tseroufim/check-words
// body: { "words": ["בהן","גוס", ...] }
app.post("/api/tseroufim/check-words", async (req, res) => {
  try {
    const list = Array.isArray(req.body?.words) ? req.body.words : [];

    // Nettoyage + dédoublonnage
    const cleanedList = list
      .map(cleanHebrewWord)
      .filter((w, idx, arr) => w && arr.indexOf(w) === idx);

    if (cleanedList.length === 0) {
      return res.json({ results: [] });
    }

    // Récupérer le nombre d'occurrences de chaque mot dans torah_word
    const torahRes = await pool.query(
       `
         SELECT text_he_no_niqqud AS word, COUNT(*) AS count
         FROM words
         WHERE text_he_no_niqqud = ANY($1)
         GROUP BY text_he_no_niqqud
  `,
  [cleanedList]
 
    );

    const occByWord = {};
    for (const row of torahRes.rows) {
      occByWord[row.word] = Number(row.count || 0);
    }

    // Reconstituer un tableau aligné avec la liste d'origine
    const results = list.map((original) => {
      const cleaned = cleanHebrewWord(original);
      const count = cleaned ? occByWord[cleaned] || 0 : 0;
      return {
        original,
        cleaned,
        torahOccurrences: count,
      };
    });

    res.json({ results });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Erreur lors de la vérification des mots de tseroufim" });
  }
});



//DAVID
async function getTorahString() {
  if (torahCache) return torahCache;

  const rows = await query(
    `
    SELECT string_agg(t.text, '') AS torah
    FROM (
      SELECT COALESCE(w.text_he_no_niqqud, w.text_he) AS text
      FROM words w
      JOIN verses v   ON v.id = w.verse_id
      JOIN chapters c ON c.id = v.chapter_id
      JOIN books b    ON b.id = c.book_id
      ORDER BY b.order_index, c.number, v.verse_num, w.word_index
    ) t
    `
  );

  torahCache = rows[0]?.torah || "";
  return torahCache;
}

//DAVID
app.get("/api/torah/raw", async (req, res) => {
  try {
    const torah = await getTorahString();
    res.json({
      length: torah.length,
      torah,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors du chargement du texte de la Torah" });
  }
});


// Recherche d'un mot dans toute la Torah
// GET /api/search/word?text=משה
// GET /api/search/word?text=משה
app.get("/api/search/word", async (req, res) => {
  try {
    const rawText = (req.query.text || "").trim();

    if (!rawText) {
      return res.status(400).json({ error: "Paramètre 'text' requis" });
    }

    // Nettoyage : on garde uniquement les lettres hébraïques
    const cleanText = rawText
      .split("")
      .filter((ch) => ch >= "\u05D0" && ch <= "\u05EA")
      .join("");

    if (!cleanText) {
      return res.status(400).json({
        error:
          "Après nettoyage, le mot est vide. Utilise uniquement des lettres hébraïques.",
      });
    }

    const sql = `
      SELECT
        b.name_he          AS book_name_he,
        b.code             AS book_code,
        b.order_index      AS book_order,
        c.number           AS chapter_number,
        v.verse_num        AS verse_number,

        -- texte complet du verset
        (
          SELECT string_agg(w2.text_he, ' ' ORDER BY w2.word_index)
          FROM words w2
          WHERE w2.verse_id = v.id
        ) AS verse_text_he,

        -- le mot précis trouvé
        w.text_he            AS word_text_he,
        w.text_he_no_niqqud  AS word_text_clean,
        w.word_index,
        w.gematria_standard,

        -- somme du verset (recalculée pour éviter les soucis de vue)
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


// Petit endpoint de test
app.get("/api/health", async (req, res) => {
  try {
    await query("SELECT 1");
    res.json({ status: "ok" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: "error" });
  }
});

/// GET /api/stats
app.get("/api/stats", async (req, res) => {
  try {
    // On fait 4 requêtes simples, l'une après l'autre (plus facile à débuguer)
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


// 2) Mots par valeur de guematria
app.get("/api/words/by-gematria", async (req, res) => {
  const value = Number(req.query.value);
  if (!value) {
    return res.status(400).json({ error: "Paramètre 'value' requis" });
  }

  try {
    const rows = await query(
      `
      SELECT 
        text_he_no_niqqud,
        gematria_standard,
        COUNT(*) AS occurrences
      FROM words
      WHERE gematria_standard = $1
      GROUP BY text_he_no_niqqud, gematria_standard
      ORDER BY occurrences DESC
      `,
      [value]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Erreur lors de la recherche des mots par valeur" });
  }
});

// 3) Versets par somme de guematria
app.get("/api/verses/by-sum", async (req, res) => {
  const value = Number(req.query.value);
  if (!value) {
    return res.status(400).json({ error: "Paramètre 'value' requis" });
  }

  try {
    const rows = await query(
      `
      SELECT 
        book_name_he   AS livre,
        chapter_number AS chapitre,
        verse_number   AS verset,
        verse_gematria AS somme
      FROM verse_gematria_sum
      WHERE verse_gematria = $1
      ORDER BY book_order, chapter_number, verse_number
      `,
      [value]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Erreur lors de la recherche des versets par somme" });
  }
});

// 4) Versets les plus proches d’une valeur
app.get("/api/verses/nearest", async (req, res) => {
  const target = Number(req.query.target);
  const limit = Number(req.query.limit || 20);
  if (!target) {
    return res.status(400).json({ error: "Paramètre 'target' requis" });
  }

  try {
    const rows = await query(
      `
      SELECT 
        book_name_he   AS livre,
        chapter_number AS chapitre,
        verse_number   AS verset,
        verse_gematria AS somme,
        ABS(verse_gematria - $1) AS distance
      FROM verse_gematria_sum
      ORDER BY distance, book_order, chapter_number, verse_number
      LIMIT $2
      `,
      [target, limit]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Erreur lors de la recherche des versets proches" });
  }
});

// (optionnel) Détail d’un verset : utile si tu veux plus tard
app.get("/api/verse", async (req, res) => {
  const { book, chapter, verse } = req.query;
  if (!book || !chapter || !verse) {
    return res
      .status(400)
      .json({ error: "Paramètres 'book', 'chapter', 'verse' requis" });
  }

  try {
    const rows = await query(
      `
      SELECT 
        b.name_he        AS livre,
        c.number         AS chapitre,
        v.verse_num      AS verset,
        w.word_index     AS index_mot,
        w.text_he,
        w.text_he_no_niqqud,
        w.gematria_standard
      FROM words w
      JOIN verses v   ON v.id = w.verse_id
      JOIN chapters c ON c.id = v.chapter_id
      JOIN books b    ON b.id = c.book_id
      WHERE b.code      = $1
        AND c.number    = $2
        AND v.verse_num = $3
      ORDER BY w.word_index
      `,
      [book, Number(chapter), Number(verse)]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération du verset" });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API Torah DB en écoute sur http://localhost:${PORT}`);
});