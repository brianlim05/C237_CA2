const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3307, //filessio running on port 3307 - local mysql port 3306
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('[-] Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('[+] Database connection succeeded');
});

module.exports = db;
