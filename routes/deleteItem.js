// Jing Xi's route
app.post('/deleteItem/:id', (req, res) => {
    const itemId = req.params.id;
    const sql = 'DELETE FROM inventory WHERE itemId = ?';
    connection.query(sql, [itemId], (error, res) => {
        if (error) {
            console.error('Error deleting item:', error);
            res.status(500).send('Error deleting item');
        } else {
            res.redirect('/inventory'); // to match with addItem, change accordingly?
        }
    });
});

// app.use('/', authRoutes) in appjs
module.exports = router;