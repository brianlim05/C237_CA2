app.get('/deleteItem/:id', (req, res) => {
    const itemId = req.params.id
    const sql = 'DELETE FROM inventory WHERE itemId = ?';
    connection.query( sql, [itemId], (error, res) => {
        if (error) {
            console.error('Error deleting item:', error);
            res.status(500).send('Error deleting item');

        } else {
            res.redirect('/');
        }
    })


});

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <title>Inventory List App</title>
</head>
<body>
  <nav class="navbar navbar-expand-sm bg-dark navbar-dark">
    <div class="container-fluid">
      <a class="navbar-brand" href="/">Inventory List App</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#collapsibleNavbar">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="collapsibleNavbar">
        <ul class="navbar-nav">
          <li class="nav-item">
            <a class="nav-link" href="/addItem">Add new item</a>
          </li> 
        </ul>
      </div>
    </div>
  </nav>

  <div class="container">
    <br>
    <div class="text-center"><h2>Items from Inventory List App Database</h2></div>
    <br>

    <table class="table table-hover small text-center">
      <thead>
        <tr>
          <th width="100">Item Name</th>
          <th width="100">Item Image</th>
          <th width="50">Item Tag</th>
          <th width="50">Total Stock</th>
          <th width="50">Edit</th>
          <th width="50">Delete</th>
        </tr>
      </thead>
      <tbody>
        <% for(let i = 0; i < inventory.length; i++) { %>
          <tr>
            <td>
              <a href='/inventory/<%= inventory[i].itemId %>'><%= inventory[i].name %></a>
            </td>
            <td><img src='images/<%= inventory[i].image %>' width="20%"></td>
            <td><%= inventory[i].tag %></td>
            <td><%= inventory[i].stock %></td>
            <td><a href='/updateItem/<%= inventory[i].itemId %>'>Edit</a></td>
            <td>
              <a 
                href='/deleteItem/<%= inventory[i].itemId %>' 
                onclick='return confirm("Are you sure you want to delete?")'>Delete</a>
            </td>
          </tr>
        <% } %>
      </tbody>
    </table>
  </div>
</body>
</html>


