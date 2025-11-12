const { Pool } = require('pg');

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

let pool;

if (isProduction) {
  // Production - Use Supabase PostgreSQL
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('🚀 Connected to PostgreSQL (Supabase)');
} else {
  // Development - Use SQLite
  pool = null; // We'll handle SQLite separately
  console.log('💻 Using SQLite for development');
}

// Database query function
const query = (text, params) => {
  if (isProduction) {
    return pool.query(text, params);
  } else {
    // Fallback to SQLite for development
    return new Promise((resolve, reject) => {
      const sqlite3 = require('sqlite3').verbose();
      const db = new sqlite3.Database('./prof_mbinda.db');
      
      db.all(text, params, (err, rows) => {
        if (err) reject(err);
        else resolve({ rows });
        db.close();
      });
    });
  }
};

module.exports = { query, pool };