// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const pool = require('../db');

const router = express.Router();

// Registration
router.post(
  '/register',
  [
    body('full_name').trim().isLength({ min: 3 }).withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 chars')
      .matches(/\d/).withMessage('Password must contain a number'),
    body('phone').optional({ values: 'falsy' }).isMobilePhone().withMessage('Valid phone required'),
    body('course').trim().notEmpty().withMessage('Course required'),
    body('semester').trim().notEmpty().withMessage('Semester required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, errors: errors.array() });
    }

    const { full_name, email, password, phone, course, semester } = req.body;

    try {
      const [existing] = await pool.query('SELECT id FROM students WHERE email = ?', [email]);
      if (existing.length) {
        return res.status(409).json({ ok: false, message: 'Email already registered. Please login.' });
      }

      const hash = await bcrypt.hash(password, 12);
      const [result] = await pool.query(
        'INSERT INTO students (full_name, email, password_hash, phone, course, semester) VALUES (?, ?, ?, ?, ?, ?)',
        [full_name, email, hash, phone || null, course, semester]
      );

      // Auto-login after registration
      req.session.student = {
        id: result.insertId,
        full_name,
        email,
        phone,
        course,
        semester
      };
      return res.json({ ok: true, redirect: '/pages/index.html' });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: 'Server error' });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const [rows] = await pool.query('SELECT * FROM students WHERE email = ?', [email]);
      if (!rows.length) {
        return res.status(401).json({ ok: false, message: 'Not registered. Please sign up.' });
      }

      const student = rows[0];
      const ok = await bcrypt.compare(password, student.password_hash);
      if (!ok) return res.status(401).json({ ok: false, message: 'Invalid credentials.' });

      // set session
      req.session.student = {
        id: student.id,
        full_name: student.full_name,
        email: student.email,
        phone: student.phone,
        course: student.course,
        semester: student.semester
      };
      return res.json({ ok: true, redirect: '/pages/index.html' });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: 'Server error' });
    }
  }
);

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true, redirect: '/pages/login.html' });
  });
});

module.exports = router;
