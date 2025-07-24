const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const app = express();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); 
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); 
    }
});

const upload = multer({ storage: storage });

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Republic_C207',
    database: 'inventoryitem'
  });

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({
    extended: false
}));

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } 
}));

app.use(flash());

app.get('/', (req, res) => {
    connection.query('SELECT * FROM users', (error, results) => {
        if (error) throw error;
        res.render('index', { users: results });
    });
});

app.get('/inventory', (req, res) => {
    connection.query('SELECT * FROM items', (error, results) => {
      if (error) throw error;
      res.render('inventory', { items: results, user: req.session.user });
    });
});

app.get('/addItem', (req, res) => {
    res.render('addItem', {user: req.session.user } ); 
});

app.post('/addItem', upload.single('image'),  (req, res) => {
    const { name, quantity, availability } = req.body;
    let image;
    if (req.file) {
        image = req.file.filename;
    } else {
        image = null;
    }

    const sql = 'INSERT INTO items (itemName, quantity, availability , image) VALUES (?, ?, ?, ?)';
    connection.query(sql , [name, quantity, availability , image], (error, results) => {
        if (error) {
            console.error("Error adding item:", error);
            res.status(500).send('Error adding item');
        } else {
            res.redirect('/inventory');
        }
    });
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
