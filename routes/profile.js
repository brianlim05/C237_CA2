// Brian's Route
const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Prevent access without login
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    req.flash('error', 'Login required');
    return res.redirect('/login');
  }
  next();
}

// Image naming using uuid for unique-ness
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (ext) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG, PNG files are allowed'));
    }
  }
});

// Profile page
router.get('/profile', requireLogin, (req, res) => {
  db.query(
    'SELECT firstname, lastname, email, studentId, profile_pic FROM users WHERE id = ?',
    [req.session.userId],
    (err, results) => {
      if (err) {
        console.error('Profile error:', err);
        req.flash('error', 'Something went wrong');
        return res.redirect('/home');
      }
      if (!results.length) {
        req.flash('error', 'User not found');
        return res.redirect('/login');
      }
      res.render('profile', { user: results[0] });
    }
  );
});

// Update profile
router.post(
  '/updateProfile',
  requireLogin,
  upload.single('profile_pic'),
  [
    body('firstname').notEmpty().withMessage('Firstname required'),
    body('lastname').notEmpty().withMessage('Lastname required'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array().map(e => e.msg).join('<br>'));
      return res.redirect('/profile');
    }

    const { firstname, lastname } = req.body;
    let updateQuery = 'UPDATE users SET firstname = ?, lastname = ?';
    const values = [firstname, lastname];

    // Profile pic update
    if (req.file) {
      updateQuery += ', profile_pic = ?';
      values.push(req.file.filename);
    }

    updateQuery += ' WHERE id = ?';
    values.push(req.session.userId);

    db.query(updateQuery, values, (err) => {
      if (err) {
        console.error('Update profile error:', err);
        req.flash('error', 'Something went wrong');
        return res.redirect('/profile');
      }
      req.flash('success', 'Profile updated successfully');
      res.redirect('/profile');
    });
  }
);

// Update password
router.post(
  '/updatePassword',
  requireLogin,
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword')
      .isLength({ min: 8 }).withMessage('Minimum 8 characters')
      .matches(/[A-Z]/).withMessage('Include uppercase')
      .matches(/[a-z]/).withMessage('Include lowercase')
      .matches(/[0-9]/).withMessage('Include number')
      .matches(/[^\w\s]/).withMessage('Include special character'),
    body('confirmPassword').custom((val, { req }) => {
      if (val !== req.body.newPassword) throw new Error('Passwords do not match');
      return true;
    }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array().map(e => e.msg).join('<br>'));
      return res.redirect('/profile');
    }

    const { currentPassword, newPassword } = req.body;

    db.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.session.userId],
      async (err, results) => {
        if (err) {
          console.error('Password check error:', err);
          req.flash('error', 'Something went wrong');
          return res.redirect('/profile');
        }
        if (!results.length || !(await bcrypt.compare(currentPassword, results[0].password_hash))) {
          req.flash('error', 'Current password incorrect');
          return res.redirect('/profile');
        }

        const newHash = await bcrypt.hash(newPassword, 10);

        db.query(
          'UPDATE users SET password_hash = ? WHERE id = ?',
          [newHash, req.session.userId],
          (err2) => {
            if (err2) {
              console.error('Password update error:', err2);
              req.flash('error', 'Something went wrong');
              return res.redirect('/profile');
            }
            req.flash('success', 'Password updated successfully');
            res.redirect('/profile');
          }
        );
      }
    );
  }
);

module.exports = router;
