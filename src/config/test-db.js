const pool = require('./db');

async function testDB() {
  try {
    const [rows] = await pool.query('SELECT * FROM roles');
    console.log('DB connected successfully');
    console.log(rows);
    process.exit(0);
  } catch (error) {
    console.error('DB connection failed:', error.message);
    process.exit(1);
  }
}

testDB();