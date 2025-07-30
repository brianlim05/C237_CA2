// routes/update.js
// Jay (UpdateItem by ID)

const express = require('express');
const router = express.Router();
const connection = require('../db'); // Adjust if db.js is in another folder

// GET: Update item status by ID
router.get('/UpdateItem/:id', (req, res) => {
  const itemId = req.params.id;
  const sql = 'UPDATE inventory SET status = ? WHERE itemId = ?';
  const updateValue = 'updated';

  connection.query(sql, [updateValue, itemId], (error, dbResults) => {
    if (error) {
      console.error('Error updating item:', error);
      return res.status(500).send('Error updating item');
    }

    if (dbResults.affectedRows === 0) {
      console.log(`No item found with ID ${itemId} to update.`);
      return res.status(404).send('Item not found or no changes made');
    }

    console.log(`Item with ID ${itemId} updated successfully.`);
    res.redirect('/inventory'); // Or another page like '/home'
  });
});

module.exports = router;
