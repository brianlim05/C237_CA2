const express = require('express');
const bcrypt = require('bcrypt');
const conn = require('../db');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const router = express.Router();

// Mailgun SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Mailgun api error
transporter.verify((err) => {
  if (err) console.error('[-] Mailgun Error:', err);
  else console.log('[+] Mailgun connection successful');
});

// Homepg accessible after logging in
router.get('/home', async (req, res) => {
  //  If user attempt to navigate to homepage without logging in, redirect to homepage
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  // Select firstname from DB to display on the homepage after logging in
  try {
    const [rows] = await conn.promise().query('SELECT firstname FROM users WHERE id = ?', [req.session.userId]);
    if (!rows.length) return res.redirect('/login');
    res.render('home', { firstname: rows[0].firstname });
  } catch (err) {
    console.error('Homepage error:', err);
    req.flash('error', 'Something went wrong.');
    res.redirect('/login');
  }
});

// Login with otp
router.get('/', (req, res) => res.redirect('/login'));
router.get('/login', (req, res) => { // Not login and not in session redirect to homepg
  res.render('login', {
    email: req.session.tempEmail || ''
  });
});

// Check login password against database
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await conn.promise().query('SELECT * FROM users WHERE email = ?', [email]);

    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
      req.flash('error', 'Invalid login credentials');
      return res.redirect('/login');
    }

    if (!rows[0].is_verified) {
      req.flash('error', 'Please verify your email before logging in.');
      return res.redirect('/login');
    }

    // 6 digit otp
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Checking otp against what user has entered
    req.session.otp = otp;
    req.session.tempUserId = rows[0].id;
    req.session.tempEmail = email;

    await transporter.sendMail({
      from: `"C237 CA2" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your 2FA Code',
      text: `Your verification code is: ${otp}`
    });

    req.flash('success', 'OTP sent to your email.');
    return res.redirect('/verify-2fa');
    // If there is error
  } catch (err) {
    console.error('Login error:', err);
    req.flash('error', 'Something went wrong.');
    res.redirect('/login');
  }
});

// 2FA verification

// If OTP expires
router.get('/verify-2fa', (req, res) => {
  if (!req.session.otp || !req.session.tempUserId) {
    req.flash('error', 'Session expired. Please log in again.');
    return res.redirect('/login');
  }

  res.render('verify-2fa');
});

router.post('/verify-2fa', async (req, res) => {
  const { otp } = req.body;

  // If otp matches
  if (otp === req.session.otp) {
    req.session.userId = req.session.tempUserId;
    req.session.email = req.session.tempEmail;

    req.session.otp = null;
    req.session.tempUserId = null;
    req.session.tempEmail = null;

    return res.redirect('/home');
  } else {
    req.flash('error', 'Invalid 2FA code');
    res.redirect('/verify-2fa');
  }
});

// Registration
router.get('/register', (req, res) => res.render('register'));

router.post('/register', [
  body('firstname').notEmpty().withMessage('Firstname required'),
  body('lastname').notEmpty().withMessage('Lastname required'),
  body('email').isEmail().withMessage('Invalid email'),
  body('password')
    .isLength({ min: 8 }).withMessage('Minimum 8 characters')
    .matches(/[A-Z]/).withMessage('Include uppercase')
    .matches(/[a-z]/).withMessage('Include lowercase')
    .matches(/[0-9]/).withMessage('Include number')
    .matches(/[^\w\s]/).withMessage('Include special character'),
  body('confirmPassword').custom((val, { req }) => {
    if (val !== req.body.password) throw new Error('Passwords do not match');
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(e => e.msg).join('<br>'));
    return res.redirect('/register');
  }

  const { firstname, lastname, email, password } = req.body;

  try {
    const [existing] = await conn.promise().query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      req.flash('error', 'Email already exists');
      return res.redirect('/register');
    }

    const hash = await bcrypt.hash(password, 10);
    const token = uuidv4();

    await conn.promise().query(
      'INSERT INTO users (firstname, lastname, email, password_hash, email_verification_token) VALUES (?, ?, ?, ?, ?)',
      [firstname, lastname, email, hash, token]
    );

    const verifyLink = `http://localhost:3000/verify-email?token=${token}`;

    await transporter.sendMail({
      from: `"C237 CA2" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify your email',
      html: `<p>Click below to verify your email address:</p><a href="${verifyLink}">${verifyLink}</a>`
    });

    req.flash('success', 'Registered! Please verify your email.');
    res.redirect('/login');
  } catch (err) {
    console.error('Register error:', err);
    req.flash('error', 'Something went wrong.');
    res.redirect('/register');
  }
});

// Verify email for registration
router.get('/verify-email', async (req, res) => {
  const token = req.query.token;

  if (!token) {
    req.flash('error', 'Invalid or expired verification link.');
    return res.redirect('/login');
  }

  try {
    const [rows] = await conn.promise().query(
      'SELECT * FROM users WHERE email_verification_token = ?', [token]
    );

    if (!rows.length) {
      req.flash('error', 'Invalid or expired verification link.');
      return res.redirect('/login');
    }

    // 
    await conn.promise().query(
      'UPDATE users SET is_verified = TRUE, email_verification_token = NULL WHERE id = ?',
      [rows[0].id]
    );

    req.flash('success', 'Email verified! Please log in.');
    res.redirect('/login');
  } catch (err) {
    console.error('Verify email error:', err);
    req.flash('error', 'Something went wrong.');
    res.redirect('/login');
  }
});

// Forget password
router.get('/forgot-password', (req, res) => res.render('forgot-password'));

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const msg = 'If the email exists, a reset link has been sent.';

  try {
    const [rows] = await conn.promise().query('SELECT id FROM users WHERE email = ?', [email]);

    // Return generic success message regardless email found or not
    if (!rows.length) {
      req.flash('success', msg);
      return res.redirect('/forgot-password');
    }

    const token = uuidv4();
    const expires = new Date(Date.now() + 3600000);

    await conn.promise().query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
      [token, expires, email]
    );

    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    await transporter.sendMail({
      from: `"C237 CA2" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset your password',
      html: `<p>Click to reset (valid 1 hour):</p><a href="${resetLink}">${resetLink}</a>`
    });

    req.flash('success', msg);
    res.redirect('/forgot-password');
  } catch (err) {
    console.error('Forgot password error:', err);
    req.flash('error', 'Something went wrong.');
    res.redirect('/forgot-password');
  }
});

// Password reset
router.get('/reset-password', async (req, res) => {
  const token = req.query.token;
  if (!token) {
    req.flash('error', 'Invalid or expired token');
    return res.redirect('/login');
  }

  try {
    const [rows] = await conn.promise().query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()', [token]
    );

    if (!rows.length) {
      req.flash('error', 'Invalid or expired token');
      return res.redirect('/login');
    }

    res.render('reset-password', { token });
  } catch (err) {
    console.error('Token validation error:', err);
    req.flash('error', 'Something went wrong');
    res.redirect('/login');
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    req.flash('error', 'Passwords do not match');
    return res.redirect(`/reset-password?token=${token}`);
  }

  // Check if reset_token has expired
  try {
    const [rows] = await conn.promise().query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()', [token]
    );

    if (!rows.length) {
      req.flash('error', 'Invalid or expired token');
      return res.redirect('/login');
    }

    const hash = await bcrypt.hash(password, 10);

    await conn.promise().query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hash, rows[0].id]
    );

    req.flash('success', 'Password updated. Please log in.');
    res.redirect('/login');
  } catch (err) {
    console.error('Reset error:', err);
    req.flash('error', 'Something went wrong');
    res.redirect('/login');
  }
});

module.exports = router;