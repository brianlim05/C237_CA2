//Zhi Shan's Routes
router.get('/addItem', (req, res) => {
    res.render('addItem', {user: req.session.user } ); 
});

router.post('/addItem', upload.single('image'),  (req, res) => {
    const { name, tag, quantity, price, availability } = req.body;
    let image;
    if (req.file) {
        image = req.file.filename;
    } else {
        image = null;
    }

    const sql = 'INSERT INTO items (itemName, itemTag, quantity, price, availability , image) VALUES (?,?,?, ?, ?, ?)';
    connection.query(sql , [name, tag, quantity, price, availability , image], (error, results) => {
        if (error) {
            console.error("Error adding item:", error);
            res.status(500).send('Error adding item');
        } else {
            res.redirect('/inventory');
        }
    });
});

// app.use('/', authRoutes) in appjs
module.exports = router;