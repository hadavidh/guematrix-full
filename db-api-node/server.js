const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

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
