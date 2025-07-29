// Brian's Route
const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db'); // db.js to connect to mysql
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const router = express.Router();

// Mailgun used to send email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((err) => {
  if (err) console.error('[-] Mailgun Error:', err);
  else console.log('[+] Mailgun connection successful');
});

// Start at login page
router.get('/', (req, res) => res.redirect('/login'));

// Login page
router.get('/login', (req, res) => {
  res.render('login', {
    email: req.session.tempEmail || '' // Record user email during login
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // DB query SELECT * FROM users WHERE email = ?
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error('Login error:', err);
      req.flash('error', 'Something went wrong');
      return res.render('login', {
        email, // retain entered email
        success: req.flash('success'),
        error: req.flash('error'),
        session: req.session
      });
    }

    // User not found or password compare failed
    if (!results.length || !(await bcrypt.compare(password, results[0].password_hash))) {
      req.flash('error', 'Invalid login credentials');
      return res.render('login', {
        email, // retain entered email
        success: req.flash('success'),
        error: req.flash('error'),
        session: req.session
      });
    }

    const user = results[0];

    if (!user.is_verified) {
      req.flash('error', 'Please verify your email before logging in.');
      return res.render('login', {
        email,
        success: req.flash('success'),
        error: req.flash('error'),
        session: req.session
      });
    }

    // Random num generator for otp
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    req.session.otp = otp;
    req.session.tempUserId = user.id;
    req.session.tempEmail = email;
    req.session.tempRole = user.role; // Save role temporarily until OTP verified

    transporter.sendMail({
      from: `"C237 CA2" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your 2FA Code',
      text: `Your verification code is: ${otp}`
    }, (mailErr) => {
      if (mailErr) console.error('Send OTP error:', mailErr);
      req.flash('success', 'OTP sent to your email.');
      return res.redirect('/verification');
    });
  });
});

// OTP Verification
router.get('/verification', (req, res) => {
  if (!req.session.otp || !req.session.tempUserId) { // If user not in otp session or userid session (not otp checking stage)
    req.flash('error', 'Session expired. Please log in again.');
    return res.redirect('/login');
  }
  res.render('verification');
});

router.post('/verification', (req, res) => {
  const { otp } = req.body;
  // If input otp match
  if (otp === req.session.otp) {
    req.session.userId = req.session.tempUserId; // Set current session userid
    req.session.email = req.session.tempEmail; // Set current session email
    req.session.role = req.session.tempRole;   // Set current session role

    // Reset
    req.session.otp = null;
    req.session.tempUserId = null;
    req.session.tempEmail = null;
    req.session.tempRole = null;

    return res.redirect('/home');
  } else {
    req.flash('error', 'Invalid 2FA code');
    return res.redirect('/verification');
  }
});

// Registration
router.get('/register', (req, res) => res.render('register'));

// Input vvalidations
router.post('/register', [
  body('firstname').notEmpty().withMessage('Firstname required'),
  body('lastname').notEmpty().withMessage('Lastname required'),
  body('studentId')
    .matches(/^\d{8}$/).withMessage('Student ID must be 8 digits'),
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
    // Render register.ejs with cached inputs
    return res.render('register', {
      success: req.flash('success'),
      error: req.flash('error'),
      session: req.session,
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      studentId: req.body.studentId,
      email: req.body.email
    });
  }

  const { firstname, lastname, studentId, email, password } = req.body;

  // DB query SELECT id from users where email = ? OR studentId = ?
  db.query('SELECT id FROM users WHERE email = ? OR studentId = ?', [email, studentId], async (err, existing) => {
    if (err) {
      console.error('Check email/studentId error:', err);
      req.flash('error', 'Something went wrong.');
      return res.redirect('/register');
    }

    if (existing.length) {
      req.flash('error', 'Email or Student ID already exists');
      return res.redirect('/register');
    }

    // Store password as hash in database
    const hash = await bcrypt.hash(password, 10);
    const token = uuidv4();

    db.query(
      'INSERT INTO users (firstname, lastname, studentId, email, password_hash, email_verification_token) VALUES (?, ?, ?, ?, ?, ?)',
      [firstname, lastname, studentId, email, hash, token],
      (insertErr) => {
        if (insertErr) {
          console.error('Register error:', insertErr);
          req.flash('error', 'Something went wrong.');
          return res.redirect('/register');
        }

        const verifyLink = `${process.env.BASE_URL}/verify-email?token=${token}`;
        transporter.sendMail({
          from: `"C237 CA2" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Verify your email',
          html: `<p>Click below to verify your email address:</p><a href="${verifyLink}">${verifyLink}</a>`
        });

        req.flash('success', 'Registered! Please verify your email.');
        res.redirect('/login');
      }
    );
  });
});

// Email verification
router.get('/verify-email', (req, res) => {
  const token = req.query.token;
  if (!token) {
    req.flash('error', 'Invalid or expired verification link.');
    return res.redirect('/login');
  }

  db.query('SELECT * FROM users WHERE email_verification_token = ?', [token], (err, results) => {
    if (err || !results.length) {
      req.flash('error', 'Invalid or expired verification link.');
      return res.redirect('/login');
    }

    db.query(
      'UPDATE users SET is_verified = TRUE, email_verification_token = NULL WHERE id = ?',
      [results[0].id],
      (updateErr) => {
        if (updateErr) {
          console.error('Verify email error:', updateErr);
          req.flash('error', 'Something went wrong.');
          return res.redirect('/login');
        }

        req.flash('success', 'Email verified! Please log in.');
        res.redirect('/login');
      }
    );
  });
});

// Forgot Password
router.get('/forgotPassword', (req, res) => res.render('forgotPassword'));

router.post('/forgotPassword', (req, res) => {
  const { email } = req.body;
  const msg = 'If the email exists, a reset link has been sent.';

  // DB query SELECT id FROM users WHERE email = ?
  db.query('SELECT id FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      console.error('Forgot password error:', err);
      req.flash('error', 'Something went wrong.');
      return res.redirect('/forgotPassword');
    }

    if (!results.length) {
      req.flash('success', msg);
      return res.redirect('/forgotPassword');
    }

    const token = uuidv4();
    const expires = new Date(Date.now() + 3600000); // set link to expire in 1hr

    // DB query UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?
    db.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?',
      [token, expires, email],
      (updateErr) => {
        if (updateErr) {
          console.error('Reset token error:', updateErr);
          req.flash('error', 'Something went wrong.');
          return res.redirect('/forgotPassword');
        }

        const resetLink = `${process.env.BASE_URL}/resetPassword?token=${token}`;
        transporter.sendMail({
          from: `"C237 CA2" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Reset your password',
          html: `<p>Click to reset (expires in 1 hr):</p><a href="${resetLink}">${resetLink}</a>`
        });

        req.flash('success', msg);
        res.redirect('/forgotPassword');
      }
    );
  });
});

// Reset Password
router.get('/resetPassword', (req, res) => {
  const token = req.query.token;
  if (!token) {
    req.flash('error', 'Invalid or expired token');
    return res.redirect('/login');
  }

  // DB query SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()
  db.query(
    'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()', [token], // Check if token is still valid. Expiry date > time now
    (err, results) => {
      if (err || !results.length) {
        req.flash('error', 'Invalid or expired token');
        return res.redirect('/login');
      }
      res.render('resetPassword', { token });
    }
  );
});

router.post('/resetPassword', async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    req.flash('error', 'Passwords do not match');
    return res.redirect(`/resetPassword?token=${token}`);
  }

  db.query(
    'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()', [token],
    async (err, results) => {
      if (err || !results.length) {
        req.flash('error', 'Invalid or expired token');
        return res.redirect('/login');
      }

      const hash = await bcrypt.hash(password, 10);

      db.query(
        'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
        [hash, results[0].id],
        (updateErr) => {
          if (updateErr) {
            console.error('Password reset error:', updateErr);
            req.flash('error', 'Something went wrong');
            return res.redirect('/login');
          }

          req.flash('success', 'Password updated. Please log in.');
          res.redirect('/login');
        }
      );
    }
  );
});

router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      req.flash('error', 'Could not log you out. Try again.');
      return res.redirect('/home');
    }
    res.clearCookie('connect.sid'); // Clear session cookie
    res.render('logout');
  });
});

// app.use('/', authRoutes) in appjs
module.exports = router;
