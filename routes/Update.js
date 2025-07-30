
app.get('/UpdateItem/:id', (req, res) => {
    const itemId = req.params.id;
    const sql = 'UPDATE inventory SET status = ? WHERE itemId = ?';
    const updateValue = 'updated';

    // Pass the update value and the itemId to the query
    connection.query(sql, [updateValue, itemId], (error, dbResults) => {
        // If an error occurs during the database query, send a 500 status and return.
        if (error) {
            console.error('Error updating item:', error);
            return res.status(500).send('Error updating item');
        }

        // If no rows were affected,Send a 404 status and return.
        if (dbResults.affectedRows === 0) {
            console.log(`No item found with ID ${itemId} to update.`);
            return res.status(404).send('Item not found or no changes made');
        }
        
        console.log(`Item with ID ${itemId} updated successfully.`);
        res.redirect('/'); 
    });
});
