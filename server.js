// server.js
const path = require('path');
const express = require('express');
const session = require('express-session');
const authRoutes = require('./routes/auth');
const ensureAuth = require('./middleware/ensureAuth');
const pool = require('./db');   // ✅ DB connection
require('dotenv').config();
const axios = require('axios');

const app = express();

// ================== Middleware ==================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'supersecret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));

// Views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// ================== Public Pages ==================
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'pages', 'index.html')));
app.get('/login', (_req, res) => res.sendFile(path.join(__dirname, 'pages', 'login.html')));
app.get('/register', (_req, res) => res.sendFile(path.join(__dirname, 'pages', 'register.html')));

// ================== Protected Pages ==================
app.get('/dashboard', ensureAuth, (req, res) => {
  res.render('dashboard', { student: req.session.student });
});

app.get('/scores', ensureAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM scores WHERE student_id = ? ORDER BY exam_date DESC`,
      [req.session.student.id]
    );
    res.render('scores', { student: req.session.student, scores: rows || [] });
  } catch (err) {
    console.error('❌ Error fetching scores:', err);
    res.render('scores', { student: req.session.student, scores: [] });
  }
});

app.get('/goals', ensureAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM goals WHERE student_id = ? ORDER BY deadline ASC',
      [req.session.student.id]
    );
    res.render('goals', { student: req.session.student, goals: rows || [] });
  } catch (err) {
    console.error('❌ Error loading goals:', err);
    res.render('goals', { student: req.session.student, goals: [] });
  }
});

// ================== Auth API ==================
app.use('/api', authRoutes);

app.get('/api/me', (req, res) => {
  if (req.session?.student) {
    return res.json({ ok: true, student: req.session.student });
  }
  res.json({ ok: false });
});

// ================== Scores API ==================
// Create new score
app.post('/api/scores', ensureAuth, async (req, res) => {
  try {
    const { subject, exam_type, score, max_score, exam_date, notes } = req.body;
    if (!subject || !exam_type || !score || !max_score || !exam_date) {
      return res.json({ ok: false, error: 'Missing required fields' });
    }

    const [result] = await pool.query(
      `INSERT INTO scores (student_id, subject, exam_type, score, max_score, exam_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.session.student.id, subject, exam_type, score, max_score, exam_date, notes || null]
    );

    const [rows] = await pool.query(`SELECT * FROM scores WHERE id = ?`, [result.insertId]);
    res.json({ ok: true, score: rows[0] });
  } catch (err) {
    console.error('❌ Save score error:', err);
    res.json({ ok: false, error: 'Database error' });
  }
});

// Update existing score
app.put('/api/scores/:id', ensureAuth, async (req, res) => {
  try {
    const { subject, exam_type, score, max_score, exam_date, notes } = req.body;
    const { id } = req.params;

    await pool.query(
      `UPDATE scores SET subject=?, exam_type=?, score=?, max_score=?, exam_date=?, notes=? 
       WHERE id=? AND student_id=?`,
      [subject, exam_type, score, max_score, exam_date, notes || null, id, req.session.student.id]
    );

    const [rows] = await pool.query(`SELECT * FROM scores WHERE id = ?`, [id]);
    res.json({ ok: true, score: rows[0] });
  } catch (err) {
    console.error('❌ Update score error:', err);
    res.json({ ok: false, error: 'Database error' });
  }
});

// Delete score
app.delete('/api/scores/:id', ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `DELETE FROM scores WHERE id = ? AND student_id = ?`,
      [id, req.session.student.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Delete score error:', err);
    res.json({ ok: false, error: 'Database error' });
  }
});


// ================== Planner API ==================
// ================== Planner API ==================

// Get tasks
app.get('/api/planner', ensureAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM planner WHERE student_id = ? ORDER BY date, time ASC`,
      [req.session.student.id]
    );
    res.json({ ok: true, tasks: rows });
  } catch (err) {
    console.error("❌ Fetch planner error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch tasks" });
  }
});

// Create new task
app.post('/api/planner', ensureAuth, async (req, res) => {
  try {
    const { date, time, subject, task, category, priority, status, notes } = req.body;
    if (!date || !task) {
      return res.json({ ok: false, error: "Date and Task are required" });
    }
    const [result] = await pool.query(
      `INSERT INTO planner (student_id, date, time, subject, task, category, priority, status, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.session.student.id, date, time, subject, task, category, priority, status || "Pending", notes || ""]
    );

    const [rows] = await pool.query(`SELECT * FROM planner WHERE id = ?`, [result.insertId]);
    res.json({ ok: true, task: rows[0] });
  } catch (err) {
    console.error("❌ Save planner error:", err);
    res.status(500).json({ ok: false, error: "Database error" });
  }
});

// Update task
app.put('/api/planner/:id', ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, subject, task, category, priority, status, notes } = req.body;

    await pool.query(
      `UPDATE planner SET date=?, time=?, subject=?, task=?, category=?, priority=?, status=?, notes=? 
       WHERE id=? AND student_id=?`,
      [date, time, subject, task, category, priority, status, notes, id, req.session.student.id]
    );

    const [rows] = await pool.query(`SELECT * FROM planner WHERE id = ?`, [id]);
    res.json({ ok: true, task: rows[0] });
  } catch (err) {
    console.error("❌ Update planner error:", err);
    res.status(500).json({ ok: false, error: "Database error" });
  }
});

// Delete task
app.delete('/api/planner/:id', ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM planner WHERE id = ? AND student_id = ?`, [id, req.session.student.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Delete planner error:", err);
    res.status(500).json({ ok: false, error: "Database error" });
  }
});


// ================== Chatbot API ==================
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.json({ ok: false, reply: "⚠️ Empty message" });

  try {
    if (process.env.GROQ_API_KEY) {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama3-8b-8192",
          messages: [
            { role: "system", content: "You are EduTrack's helpful academic assistant." },
            { role: "user", content: message }
          ]
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );
      const reply = response.data.choices?.[0]?.message?.content || "⚠️ No reply from Groq";
      return res.json({ ok: true, reply });
    }

    const fallbackReply = `You said: "${message}". (Groq API not available)`;
    res.json({ ok: true, reply: fallbackReply });

  } catch (err) {
    console.error("❌ Chatbot Error:", err.response?.data || err.message);
    const fallbackReply = `You said: "${message}". (Groq API failed)`;
    res.json({ ok: true, reply: fallbackReply });
  }
});

// ================== Daily Academic Diary ==================
(async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS diary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  )`);
})();

// GET Diary Page
app.get('/diary', ensureAuth, async (req, res) => {
  const studentId = req.session.student.id;
  const [diaryEntries] = await pool.query(
    'SELECT * FROM diary WHERE student_id = ? ORDER BY date DESC', 
    [studentId]
  );
  res.render('diary', { diaryEntries, student: req.session.student });
});

// POST New Entry
app.post('/diary', ensureAuth, async (req, res) => {
  const { date, title, description } = req.body;
  const studentId = req.session.student.id;
  await pool.query(
    'INSERT INTO diary (student_id, date, title, description) VALUES (?, ?, ?, ?)',
    [studentId, date, title, description]
  );
  res.redirect('/diary');
});

// DELETE Entry
app.post('/diary/delete/:id', ensureAuth, async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM diary WHERE id = ? AND student_id = ?', [id, req.session.student.id]);
  res.redirect('/diary');
});

// UPDATE Entry
app.post('/diary/update/:id', ensureAuth, async (req, res) => {
  const { id } = req.params;
  const { title, description, date } = req.body;
  await pool.query(
    'UPDATE diary SET title = ?, description = ?, date = ? WHERE id = ? AND student_id = ?',
    [title, description, date, id, req.session.student.id]
  );
  res.redirect('/diary');
});

// ================== Contact Form ==================
(async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
})();

app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  try {
    const sql = "INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)";
    await pool.query(sql, [name, email, message]);
    return res.json({ success: true, message: "✅ Message sent successfully!" });
  } catch (error) {
    console.error("❌ Contact form error:", error);
    return res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
});

// ================== 404 Fallback ==================
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'pages', '404.html'));
});

// ================== Start ==================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ EduTrack running at http://localhost:${PORT}`)
);
