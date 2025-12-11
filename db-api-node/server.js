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
app.get("/api/search/word", async (req, res) => {
  try {
    const rawText = (req.query.text || "").trim();

    if (!rawText) {
      return res.status(400).json({ error: "Paramètre 'text' requis" });
    }

    // Nettoyage simple : on garde uniquement les lettres hébraïques (א à ת)
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

    // ⚠️ Adapte les noms de tables si besoin
    const { rows } = await pool.query(
      `
      SELECT
        b.book_name_he,
        b.book_code,
        v.chapter_number,
        v.verse_number,
        v.text_he       AS verse_text_he,
        w.text_he       AS word_text_he,
        w.text_he_no_niqqud AS word_text_clean,
        w.word_index,
        w.gematria_standard,
        vs.verse_gematria
      FROM torah_word w
      JOIN torah_verse v ON v.id = w.verse_id
      JOIN torah_book  b ON b.id = v.book_id
      LEFT JOIN verse_gematria_sum vs ON vs.verse_id = v.id
      WHERE w.text_he_no_niqqud = $1
      ORDER BY b.book_order, v.chapter_number, v.verse_number, w.word_index
      LIMIT 500
      `,
      [cleanText]
    );

    res.json({
      query: rawText,
      cleaned: cleanText,
      count: rows.length,
      results: rows,
    });
  } catch (err) {
    console.error(err);
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

// 1) Stats globales
app.get("/api/stats", async (req, res) => {
  try {
    const [books, chapters, verses, words] = await Promise.all([
      query("SELECT COUNT(*) FROM books"),
      query("SELECT COUNT(*) FROM chapters"),
      query("SELECT COUNT(*) FROM verses"),
      query("SELECT COUNT(*) FROM words"),
    ]);

    res.json({
      books: Number(books[0].count),
      chapters: Number(chapters[0].count),
      verses: Number(verses[0].count),
      words: Number(words[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur stats" });
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
