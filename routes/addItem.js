// Zhi Shan's Route – Add Item (Admins Only)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const connection = require('../db');

// Role restriction middleware
const requireAdmin = (req, res, next) => {
  if (!req.session.userId || (req.session.role !== 'admin' && req.session.role !== 'superadmin')) {
    req.flash('error', 'Access denied');
    return res.redirect('/login');
  }
  next();
};

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images'); // Store files in /public/images
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique file name
  }
});

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Only image files are allowed!'));
  },
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB max
});

// GET: Show add item form
router.get('/addItem', requireAdmin, (req, res) => {
  res.render('addItem');
});

// POST: Handle item submission
router.post('/addItem', requireAdmin, upload.single('image'), (req, res) => {
  const { name, tag, quantity, price, availability } = req.body;
  const image = req.file ? req.file.filename : null;

  const sql = `
    INSERT INTO items (itemName, itemTag, quantity, price, availability, image)
    VALUES (?, ?, ?, ?, ?, ?)`;

  connection.query(sql, [name, tag, quantity, price, availability, image], (error, results) => {
    if (error) {
      console.error("Error adding item:", error);
      req.flash('error', 'Something went wrong while adding the item.');
      return res.redirect('/addItem');
    }

    req.flash('success', 'Item added successfully!');
    res.redirect('/inventory');
  });
});

module.exports = router;
