require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');

/* BRIAN ROUTES */
const authRoutes = require('./routes/auth');
const homeRoutes = require('./routes/home');
const profileRoutes = require('./routes/profile');

/* XXXX ROUTES */
// Add routes here for your function

const app = express();

// Body parsers
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session timeout (Brian)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 } // 1 hour
}));

// Flash to display msg
app.use(flash());
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.session = req.session;
  next();
});

// Static files - img upload
app.use(express.static(path.join(__dirname, 'public')));

/* BRIAN ROUTES */
app.use('/', authRoutes);
app.use('/home', homeRoutes);
app.use('/', profileRoutes);

/* XXXX ROUTES */
// Add routes here for your function

// 404 Handler
app.use((req, res) => {
  res.status(404).render('404'); 
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
