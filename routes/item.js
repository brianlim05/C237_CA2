// routes/item.js

const express = require('express');
const router = express.Router();
const connection = require('../db'); // ✅ Make sure this path is correct

// View single product by ID
router.get('/product/:id', (req, res) => {
  const itemId = req.params.id;

  connection.query('SELECT * FROM items WHERE itemId = ?', [itemId], (error, results) => {
    if (error) throw error;

    if (results.length > 0) {
      res.render('item', {
        items: results[0],
        session: req.session.user
      });
    } else {
      res.status(404).send('Item not found');
    }
  });
});

module.exports = router;
