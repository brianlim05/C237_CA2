// Zhi Shan's Routes

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const connection = require('../db'); // Adjust this path if your db.js is in a different location

// Multer setup for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images'); // Uploads go to public/images
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Rename to avoid conflicts
  }
});

const upload = multer({ storage: storage });

// GET: Add item form
router.get('/addItem', (req, res) => {
  res.render('addItem', { user: req.session.user });
});

// POST: Handle form submission
router.post('/addItem', upload.single('image'), (req, res) => {
  const { name, tag, quantity, price, availability } = req.body;
  const image = req.file ? req.file.filename : null;

  const sql = 'INSERT INTO items (itemName, itemTag, quantity, price, availability, image) VALUES (?, ?, ?, ?, ?, ?)';
  connection.query(sql, [name, tag, quantity, price, availability, image], (error, results) => {
    if (error) {
      console.error("Error adding item:", error);
      res.status(500).send('Error adding item');
    } else {
      req.flash('success', 'Item added successfully!');
      res.redirect('/inventory'); // Or wherever you list items
    }
  });
});

module.exports = router;
