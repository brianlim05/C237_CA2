// Brian's Route
const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { body, validationResult } = require('express-validator');
const { requireRole, requireAnyRole } = require('../access/authRole'); // roles
const router = express.Router();

// Admin Dashboard
router.get('/admin', requireAnyRole(['superadmin', 'admin']), (req, res) => {
  db.query('SELECT id, firstname, lastname, studentId, email, role FROM users', (err, results) => {
    if (err) {
      console.error('Admin dashboard error:', err);
      req.flash('error', 'Something went wrong');
      return res.redirect('/home');
    }

    // If admin hide superadmin accounts
    if (req.session.role === 'admin') {
      results = results.filter(user => user.role !== 'superadmin');
    }

    res.render('adminDashboard', {
      users: results,
      success: req.flash('success'),
      error: req.flash('error'),
      session: req.session
    });
  });
});

// Create new admin - superadmin rights
router.post('/admin/createAdmin', requireRole('superadmin'), [
  body('firstname').notEmpty().withMessage('Firstname required'),
  body('lastname').notEmpty().withMessage('Lastname required'),
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 8 }).withMessage('Password too short'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(e => e.msg).join('<br>'));
    return res.redirect('/admin');
  }

  const { firstname, lastname, email, password } = req.body;
  const studentId = Math.floor(10000000 + Math.random() * 90000000).toString();

  db.query('SELECT id FROM users WHERE email = ?', [email], async (err, existing) => {
    if (err) {
      console.error('Check email error:', err);
      req.flash('error', 'Something went wrong.');
      return res.redirect('/admin');
    }
    if (existing.length) {
      req.flash('error', 'Email already exists');
      return res.redirect('/admin');
    }

    const hash = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (firstname, lastname, studentId, email, password_hash, role, is_verified) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
      [firstname, lastname, studentId, email, hash, 'admin'],
      (insertErr) => {
        if (insertErr) {
          console.error('Create admin error:', insertErr);
          req.flash('error', 'Something went wrong.');
          return res.redirect('/admin');
        }
        req.flash('success', `Admin account created for ${firstname} ${lastname}`);
        res.redirect('/admin');
      }
    );
  });
});

// Update ffirstname, lastname
router.post('/admin/updateUser/:id', requireAnyRole(['superadmin', 'admin']), (req, res) => {
  const userId = req.params.id;
  const { firstname, lastname, role } = req.body;

  if (req.session.userId == userId) {
    req.flash('error', 'You cannot change your own account.');
    return res.redirect('/admin');
  }

  // Admin not allowed to edit superadmin
  if (req.session.role === 'admin' && role === 'superadmin') {
    req.flash('error', 'Admins cannot assign superadmin role.');
    return res.redirect('/admin');
  }

  db.query(
    'UPDATE users SET firstname = ?, lastname = ?, role = ? WHERE id = ?',
    [firstname, lastname, role, userId],
    (err) => {
      if (err) {
        console.error('Update user error:', err);
        req.flash('error', 'Something went wrong.');
      } else {
        req.flash('success', 'User updated successfully');
      }
      res.redirect('/admin');
    }
  );
});

// Delete user
router.post('/admin/deleteUser/:id', requireAnyRole(['superadmin', 'admin']), (req, res) => {
  const userId = req.params.id;

  if (req.session.userId == userId) {
    req.flash('error', 'You cannot delete your own account.');
    return res.redirect('/admin');
  }

  db.query('SELECT role FROM users WHERE id = ?', [userId], (err, results) => {
    if (err || !results.length) {
      req.flash('error', 'User not found');
      return res.redirect('/admin');
    }

    // Admins cannot delete superadmins
    if (results[0].role === 'superadmin') {
      req.flash('error', 'Cannot delete a superadmin.');
      return res.redirect('/admin');
    }

    db.query('DELETE FROM users WHERE id = ?', [userId], (deleteErr) => {
      if (deleteErr) {
        console.error('Delete user error:', deleteErr);
        req.flash('error', 'Something went wrong.');
      } else {
        req.flash('success', 'User deleted successfully');
      }
      res.redirect('/admin');
    });
  });
});

module.exports = router;
