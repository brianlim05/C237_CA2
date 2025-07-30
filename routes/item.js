const session = require("express-session");

app.get('/product/:id', (req, res) => {
  // Extract the product ID from the request parameters
  const itemId = req.params.id;
 
  // Fetch data from MySQL based on the product ID
  connection.query('SELECT * FROM items WHERE itemId = ?', [itemId], (error, results) => {
      if (error) throw error;
 
      // Check if any product with the given ID was found
      if (results.length > 0) {
          // Render HTML page with the product data
          res.render('item', { items: results[0], session: req.session.user  });
      } else {
          // If no product with the given ID was found, render a 404 page or handle it accordingly
          res.status(404).send('item not found');
      }
  });
});