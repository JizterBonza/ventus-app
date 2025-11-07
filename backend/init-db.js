const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDatabase() {
  console.log('=== Initializing Database ===');
  
  try {
    // Drop existing table (optional - remove in production)
    console.log('Dropping existing users table if exists...');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    
    // Create users table
    console.log('Creating users table...');
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        avatar VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index on email for faster lookups
    console.log('Creating index on email...');
    await pool.query('CREATE INDEX idx_users_email ON users(email)');
    
    console.log('✓ Database initialized successfully!');
    console.log('\nDatabase schema:');
    console.log('- users table created');
    console.log('- email index created');
    console.log('\nReady to accept user registrations!');
    
  } catch (error) {
    console.error('✗ Error initializing database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();

