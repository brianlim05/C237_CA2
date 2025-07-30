const express = require('express');
const router = express.Router();
const connection = require('../db');

// Middleware: Only logged-in normal users can borrow
const requireUser = (req, res, next) => {
  if (!req.session.userId || req.session.role !== 'user') {
    req.flash('error', 'Login as a user to borrow items.');
    return res.redirect('/login');
  }
  next();
};

// GET: Borrowing page
router.get('/borrowing', requireUser, (req, res) => {
  connection.query('SELECT * FROM items WHERE quantity > 0', (err, results) => {
    if (err) {
      console.error('Error fetching items:', err);
      req.flash('error', 'Unable to load items.');
      return res.redirect('/home');
    }

    res.render('borrowing', {
      items: results,
      errors: req.flash('error'),
      success: req.flash('success'),
      session: req.session,
      active: 'borrowing'
    });
  });
});

// POST: Add to borrow list and reduce quantity
router.post('/add-to-list/:id', requireUser, (req, res) => {
  const itemId = parseInt(req.params.id);
  const quantity = parseInt(req.body.quantity);

  if (!quantity || quantity < 1) {
    req.flash('error', 'Invalid quantity selected.');
    return res.redirect('/borrowing');
  }

  connection.query('SELECT * FROM items WHERE itemId = ?', [itemId], (err, results) => {
    if (err || results.length === 0) {
      req.flash('error', 'Item not found.');
      return res.redirect('/borrowing');
    }

    const item = results[0];

    if (item.quantity < quantity) {
      req.flash('error', `Only ${item.quantity} available. Cannot borrow ${quantity}.`);
      return res.redirect('/borrowing');
    }

    // Initialize list
    if (!req.session.list) req.session.list = [];

    // Add or update item in session
    const existing = req.session.list.find(x => x.itemId === itemId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      req.session.list.push({
        itemId: item.itemId,
        itemName: item.itemName,
        itemTag: item.itemTag,
        price: item.price,
        quantity: quantity,
        image: item.image
      });
    }

    // Reduce stock in DB
    const updatedQuantity = item.quantity - quantity;
    connection.query('UPDATE items SET quantity = ? WHERE itemId = ?', [updatedQuantity, itemId], (updateErr) => {
      if (updateErr) {
        console.error('Update error:', updateErr);
        req.flash('error', 'Could not update item quantity.');
        return res.redirect('/borrowing');
      }

      req.flash('success', `${item.itemName} added to your borrow list.`);
      res.redirect('/borrowList');
    });
  });
});

// GET: View borrow list
router.get('/borrowList', requireUser, (req, res) => {
  const list = req.session.list || [];
  const returnDate = new Date();
  returnDate.setDate(returnDate.getDate() + 7);

  res.render('borrowList', {
    list,
    returnDate: returnDate.toLocaleDateString('en-SG', {
      year: 'numeric', month: 'short', day: 'numeric'
    }),
    session: req.session,
    active: 'borrowList'
  });
});

// GET: Checkout (clears session)
router.get('/checkout', requireUser, (req, res) => {
  req.session.list = [];
  res.render('checkout', {
    session: req.session,
    active: 'home'
  });
});

module.exports = router;
