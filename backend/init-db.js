const { Pool } = require('pg');
require('dotenv').config();

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('✗ Error: DATABASE_URL environment variable is not set!');
  console.error('Please create a .env file in the backend directory with your DATABASE_URL.');
  console.error('See ENV_example.txt for the format.');
  process.exit(1);
}

// Validate DATABASE_URL format
const dbUrl = process.env.DATABASE_URL.trim();
if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
  console.error('✗ Error: DATABASE_URL must start with postgresql:// or postgres://');
  process.exit(1);
}

// Parse and validate connection string has password
let parsedUrl;
try {
  parsedUrl = new URL(dbUrl);
  if (!parsedUrl.password) {
    console.error('✗ Error: DATABASE_URL is missing a password!');
    console.error('Format should be: postgresql://username:password@host:port/database');
    process.exit(1);
  }
  
  // Check for Render database hostname issues
  const hostname = parsedUrl.hostname;
  if (hostname.startsWith('dpg-') && !hostname.includes('.')) {
    console.error('✗ Error: Render database hostname appears to be missing the domain!');
    console.error('The hostname "' + hostname + '" looks incomplete.');
    console.error('\nFor Render databases, you need to use the EXTERNAL connection string.');
    console.error('Internal connection strings (ending with -a) only work within Render\'s network.');
    console.error('\nTo fix:');
    console.error('1. Go to Render Dashboard → Your Database → Connection');
    console.error('2. Copy the "External Database URL" (not the internal one)');
    console.error('3. It should look like: postgresql://user:pass@dpg-xxxxx-a.oregon-postgres.render.com/dbname');
    process.exit(1);
  }
} catch (error) {
  console.error('✗ Error: DATABASE_URL format is invalid!');
  console.error('Format should be: postgresql://username:password@host:port/database');
  process.exit(1);
}

// Determine SSL configuration based on database host and environment
const getSSLConfig = () => {
  // If DATABASE_SSL is explicitly set, use it
  if (process.env.DATABASE_SSL !== undefined) {
    if (process.env.DATABASE_SSL === 'false' || process.env.DATABASE_SSL === '0') {
      return false;
    }
    if (process.env.DATABASE_SSL === 'true' || process.env.DATABASE_SSL === '1') {
      return { rejectUnauthorized: false };
    }
  }
  
  // Check if connecting to localhost (local database doesn't support SSL)
  if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
    return false;
  }
  
  // Only enable SSL for known cloud providers that require it
  // For other databases, default to no SSL unless explicitly enabled
  const requiresSSL = dbUrl.includes('render.com') || 
                      dbUrl.includes('heroku.com') || 
                      dbUrl.includes('amazonaws.com') ||
                      dbUrl.includes('azure.com') ||
                      dbUrl.includes('digitalocean.com');
  
  if (requiresSSL && process.env.NODE_ENV === 'production') {
    return { rejectUnauthorized: false };
  }
  
  // Default: no SSL (most databases don't require it)
  return false;
};

const pool = new Pool({
  connectionString: dbUrl,
  ssl: getSSLConfig()
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
    console.error('✗ Error initializing database:', error.message);
    
    // Provide helpful guidance for common connection errors
    if (error.code === 'ENOTFOUND') {
      console.error('\nConnection Error: Could not resolve database hostname.');
      const hostname = parsedUrl?.hostname || 'unknown';
      console.error('Hostname: ' + hostname);
      console.error('\nPossible issues:');
      console.error('1. Using an internal database URL instead of external');
      console.error('   - Render internal URLs (ending with -a) only work within Render\'s network');
      console.error('   - Use the "External Database URL" from Render dashboard');
      console.error('2. Network connectivity issues');
      console.error('3. Incorrect hostname in DATABASE_URL');
      console.error('\nFor Render databases:');
      console.error('- Go to Render Dashboard → Your Database → Connection');
      console.error('- Copy the "External Database URL"');
      console.error('- It should include a full domain like: .oregon-postgres.render.com');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\nConnection Error: Database server refused the connection.');
      console.error('Possible issues:');
      console.error('1. Database server is not running');
      console.error('2. Incorrect port number');
      console.error('3. Firewall blocking the connection');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('\nConnection Error: Connection timed out.');
      console.error('Possible issues:');
      console.error('1. Database server is not accessible from your network');
      console.error('2. Firewall or security group blocking the connection');
      console.error('3. Using internal URL instead of external URL');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();

