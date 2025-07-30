// routes/inventory.js – View Inventory and Handle Update/Delete

const express = require('express');
const router = express.Router();
const connection = require('../db');

// GET: Show inventory list
router.get('/inventory', (req, res) => {
  connection.query('SELECT * FROM items', (err, results) => {
    if (err) {
      console.error('Error fetching inventory:', err);
      req.flash('error', 'Unable to load inventory');
      return res.redirect('/home');
    }

    res.render('inventory', {
      items: results,
      success: req.flash('success'),
      error: req.flash('error'),
      session: req.session,
      active: 'inventory'
    });
  });
});

// POST: Update an item by ID (Admins and Superadmins)
router.post('/updateItem/:id', (req, res) => {
  const itemId = req.params.id;
  let { itemName, itemTag, price, quantity, status } = req.body;

  // Ensure that fields are not set to null
  itemName = itemName || '';  // Default empty string for itemName if not provided
  itemTag = itemTag || '';    // Default empty string for itemTag if not provided
  price = price || 0;         // Default to 0 if price is not provided
  quantity = quantity || 0;   // Default to 0 if quantity is not provided
  status = status || 'available'; // Default to 'available' if status is not provided

  const sql = 'UPDATE items SET itemName = ?, itemTag = ?, price = ?, quantity = ?, status = ? WHERE itemId = ?';

  connection.query(
    sql,
    [itemName, itemTag, price, quantity, status, itemId],
    (error, dbResults) => {
      if (error) {
        console.error('Error updating item:', error);
        req.flash('error', 'Failed to update item.');
        return res.redirect(`/inventory`);
      }

      if (dbResults.affectedRows === 0) {
        req.flash('error', 'Item not found or no changes made.');
      } else {
        req.flash('success', 'Item updated successfully.');
      }

      res.redirect('/inventory');
    }
  );
});

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
