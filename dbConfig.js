const mysql = require('mysql2'); // Use the promise API
const util = require('util');
//const dotenv = require('dotenv');
const AppError = require('./Utils/appError.js');

//dotenv.config();
const { DB_HOSTIP, DB_USERNAME, DB_PASSWORD, DB_NAME } = process.env;

const options = {
  host: DB_HOSTIP,
  user: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  queueLimit: 0,
  connectionLimit: 10,
  connectTimeout: 15000,
};

// Create a MySQL pool
const pool = mysql.createPool(options);

// Function to establish database connection (for checking connection status)
const connectToDatabase = () => {
  pool.getConnection((error, connection) => {
    if (error) {
      console.error('Error connecting to the database:', error.message);
      throw new AppError(error.message, 500);
    }
    console.log('✅ Connected to the MySQL database');
    connection.release();
  });
};

// Call the function to check the connection
connectToDatabase();

// Promisify the query method
const db = util.promisify(pool.query).bind(pool);

module.exports = { db };
