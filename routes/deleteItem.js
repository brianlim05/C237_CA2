// Jing Xi's route

const express = require('express');
const router = express.Router();
const connection = require('../db'); // adjust path to your db.js

// POST: Delete an item by ID
router.post('/deleteItem/:id', (req, res) => {
    const itemId = req.params.id;
    const sql = 'DELETE FROM inventory WHERE itemId = ?';

    connection.query(sql, [itemId], (error, results) => {
        if (error) {
            console.error('Error deleting item:', error);
            return res.status(500).send('Error deleting item');
        } else {
            req.flash('success', 'Item deleted successfully.');
            return res.redirect('/inventory'); // match your addItem redirect
        }
    });
});

module.exports = router;
