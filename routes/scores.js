// routes/scores.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Helper: ensureAuth middleware should be applied at app level or here
// (We will apply it when mounting in server.js)


// GET /api/scores
// Return all scores for logged-in student
router.get('/', async (req, res) => {
  try {
    const student = req.session?.student;
    if (!student) return res.status(401).json({ ok: false, error: 'Not authenticated' });

    const [rows] = await pool.query(
      `SELECT id, subject, exam_type, score, max_score, exam_date, notes, created_at
       FROM scores WHERE student_id = ? ORDER BY exam_date DESC, created_at DESC`,
      [student.id]
    );

    res.json({ ok: true, scores: rows });
  } catch (err) {
    console.error('GET /api/scores error', err);
    res.status(500).json({ ok: false, error: 'Database error' });
  }
});

// POST /api/scores
// Create new score
router.post('/', async (req, res) => {
  try {
    const student = req.session?.student;
    if (!student) return res.status(401).json({ ok: false, error: 'Not authenticated' });

    const { subject, exam_type, score, max_score, exam_date, notes } = req.body;
    if (!subject || !exam_type || score == null || !max_score || !exam_date) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    const [result] = await pool.execute(
      `INSERT INTO scores (student_id, subject, exam_type, score, max_score, exam_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [student.id, subject, exam_type, Number(score), Number(max_score), exam_date, notes || null]
    );

    const insertedId = result.insertId;
    const [[newRow]] = await pool.query(`SELECT id, subject, exam_type, score, max_score, exam_date, notes, created_at FROM scores WHERE id = ?`, [insertedId]);

    res.json({ ok: true, score: newRow });
  } catch (err) {
    console.error('POST /api/scores error', err);
    res.status(500).json({ ok: false, error: 'Database error' });
  }
});

// PUT /api/scores/:id
// Update existing score (only owner)
router.put('/:id', async (req, res) => {
  try {
    const student = req.session?.student;
    if (!student) return res.status(401).json({ ok: false, error: 'Not authenticated' });

    const id = Number(req.params.id);
    const { subject, exam_type, score, max_score, exam_date, notes } = req.body;
    // Validate ownership
    const [rows] = await pool.query('SELECT student_id FROM scores WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    if (rows[0].student_id !== student.id) return res.status(403).json({ ok: false, error: 'Forbidden' });

    await pool.execute(
      `UPDATE scores SET subject = ?, exam_type = ?, score = ?, max_score = ?, exam_date = ?, notes = ? WHERE id = ?`,
      [subject, exam_type, Number(score), Number(max_score), exam_date, notes || null, id]
    );

    const [[updated]] = await pool.query('SELECT id, subject, exam_type, score, max_score, exam_date, notes, created_at FROM scores WHERE id = ?', [id]);
    res.json({ ok: true, score: updated });
  } catch (err) {
    console.error('PUT /api/scores/:id error', err);
    res.status(500).json({ ok: false, error: 'Database error' });
  }
});

// DELETE /api/scores/:id
router.delete('/:id', async (req, res) => {
  try {
    const student = req.session?.student;
    if (!student) return res.status(401).json({ ok: false, error: 'Not authenticated' });

    const id = Number(req.params.id);
    const [rows] = await pool.query('SELECT student_id FROM scores WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: 'Not found' });
    if (rows[0].student_id !== student.id) return res.status(403).json({ ok: false, error: 'Forbidden' });

    await pool.execute('DELETE FROM scores WHERE id = ?', [id]);
    res.json({ ok: true, deletedId: id });
  } catch (err) {
    console.error('DELETE /api/scores/:id error', err);
    res.status(500).json({ ok: false, error: 'Database error' });
  }
});

module.exports = router;
