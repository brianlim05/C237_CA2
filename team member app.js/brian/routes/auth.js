const express = require('express');
const bcrypt = require('bcrypt');
const conn = require('../db');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// ROUTE - login
router.get('/', (req, res) => {
  res.redirect('/login');
});

router.get('/login', (req, res) => {
  res.render('login');
});

router.get('/register', (req, res) => {
  res.render('register');
});

// ROUTE - register
router.post('/register', [
    // email validation
  body('email').isEmail().withMessage('Invalid email format'),
  // password validation
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Must contain a lowercase letter')
    .matches(/[A-Z]/).withMessage('Must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Must contain a number')
    .matches(/[\W]/).withMessage('Must contain a special character'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match');
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => e.msg).join('<br>');
    return res.status(400).send(messages);
  }

  const { email, password } = req.body;

  const [existing] = await conn.promise().query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    return res.status(400).send('Email already exists');
  }

  const hash = await bcrypt.hash(password, 10);
  await conn.promise().query('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, hash]);

  req.flash('success', 'Registration successful. Please log in');
  res.redirect('/login');
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await conn.promise().query('SELECT * FROM users WHERE email = ?', [email]);
  if (!rows.length) {
    req.flash('error', 'Invalid email or password');
    return res.redirect('/login');
  }

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    req.flash('error', 'Invalid email or password');
    return res.redirect('/login');
  }

  req.session.userId = user.id;
  req.session.email = user.email;

  res.send('Login successful');
});

module.exports = router;
