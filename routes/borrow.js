// Zhi Shan's Routes
app.get('/borrowing', (req, res) => {
    connection.query('SELECT * FROM items', (error, results) => {
        if (error) throw error;
        res.render('borrowing', { user: req.session.user, items: results, errors: req.flash('error')});
      });
});

app.post('/add-to-list/:id', (req, res) => {
    const itemId = parseInt(req.params.id);
    const quantity = parseInt(req.body.quantity) || 1;

    connection.query('SELECT * FROM items WHERE itemId = ?', [itemId], (error, results) => {
        if (error) throw error;

        if (results.length > 0) {
            const item = results[0];

            if (item.quantity === 0) {
                req.flash('error', `"${item.itemName}" is currently out of stock.`);
                return res.redirect('/borrowing');
            }

            if (quantity > item.quantity) {
                req.flash('error', 'Not enough stock to borrow');
                return res.redirect('/borrowing');
            }

            if (!req.session.list) {
                req.session.list = [];
            }

            const existingItem = req.session.list.find(object => object.itemId === itemId);
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                req.session.list.push({
                    itemId: item.itemId,
                    itemName: item.itemName,
                    itemTag: item.itemTag,
                    price: item.price,
                    quantity: quantity,
                    image: item.image
                });
            }

            const newQuantity = item.quantity - quantity;
            connection.query('UPDATE items SET quantity = ? WHERE itemId = ?', [newQuantity, itemId], (error, results) => {
                if (error) throw error;
                res.redirect('/borrowList');
            });

        } else {
            res.status(404).send("Item not found");
        }
    });
});

app.get('/borrowList', (req, res) => {
    const list = req.session.list || [];
    const today = new Date();
    const returnDate = new Date(today);
    returnDate.setDate(today.getDate() + 7);
    const formatDate = returnDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
    res.render('borrowList', { list, user: req.session.user, returnDate: formatDate });
});

app.get('/checkout', (req, res) => {
  req.session.list = [];
  res.render('checkout');
});

// app.use('/', authRoutes) in appjs
module.exports = router;