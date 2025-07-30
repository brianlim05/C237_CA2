// routes/item.js

const express = require('express');
const router = express.Router();
const connection = require('../db');

// View item details by ID
router.get('/item/:id', (req, res) => {
  const itemId = req.params.id;

  connection.query('SELECT * FROM items WHERE itemId = ?', [itemId], (error, results) => {
    if (error) {
      console.error('Error fetching item:', error);
      return res.status(500).send('Database error');
    }

    if (results.length > 0) {
      const userRole = req.session.role || 'user';

      res.render('item', {
        item: results[0], // ✅ changed from items to item
        session: req.session,
        active: userRole === 'admin' ? 'inventory' : 'borrowing'
      });
    } else {
      res.status(404).send('Item not found');
    }
  });
});

module.exports = router;
