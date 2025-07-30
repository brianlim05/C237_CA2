// routes/deleteItem.js – Jing Xi's route

const express = require('express');
const router = express.Router();
const connection = require('../db');

// POST: Delete an item by ID (Admins only)
router.post('/deleteItem/:id', (req, res) => {
  const itemId = req.params.id;

  const sql = 'DELETE FROM items WHERE itemId = ?';

  connection.query(sql, [itemId], (error, results) => {
    if (error) {
      console.error('Error deleting item:', error);
      req.flash('error', 'Failed to delete item.');
    } else {
      req.flash('success', 'Item deleted successfully.');
    }
    res.redirect('/inventory');
  });
});

module.exports = router;
