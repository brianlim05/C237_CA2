const express = require('express');
const db = require('../db');

const router = express.Router();

// Home page
router.get('/', (req, res) => {
  if (!req.session.userId) { // If not in session redirect back to login
    req.flash('error', 'Please log in to access the homepage.');
    return res.redirect('/login');
  }

  db.query(
    'SELECT firstname, profile_pic FROM users WHERE id = ?', 
    [req.session.userId], 
    (err, results) => {
      if (err) {
        console.error('Homepage error:', err);
        req.flash('error', 'Something went wrong. Please try again.');
        return res.redirect('/login');
      }

      if (!results.length) {
        req.flash('error', 'Session invalid. Please log in again.');
        req.session.destroy(() => res.redirect('/login'));
        return;
      }

      // Store user content to display firstname and profile pic 
      const user = {
        firstname: results[0].firstname,
        profile_pic: results[0].profile_pic || 'default.png'
      };

      res.render('home', { 
        user,
        session: req.session
      });
    }
  );  
});

module.exports = router;
