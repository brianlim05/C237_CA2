// routes/updateItem.js – Jay (Update Item by ID)

const express = require('express');
const router = express.Router();
const connection = require('../db'); // Adjust if db.js is in another folder

// GET: Update item status by ID
router.get('/updateItem/:id', (req, res) => {
  const itemId = req.params.id;
  const sql = 'UPDATE items SET status = ? WHERE itemId = ?'; // Fixed table name to 'items'
  const updateValue = 'updated'; // The status to update the item to

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
    res.redirect('/inventory'); // Redirect to inventory after update
  });
});

module.exports = router;
