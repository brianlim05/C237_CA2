// function.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const flash = require('connect-flash');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const inventoryRoutes = require('./routes/inventory');
const borrowRoutes = require('./routes/borrow');

const app = express();

// Session config
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 }
}));

// Flash messages
app.use(flash());

// Global middleware for flash + user
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
  next();
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', authRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/borrow', borrowRoutes);

// Default homepage
app.get('/', (req, res) => {
  res.render('index');
});

// 404 page
app.use((req, res) => {
  res.status(404).render('error', { message: 'Page Not Found' });
});

module.exports = app;
