const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Define paths first
const buildPath = path.join(__dirname, 'build');
const indexPath = path.join(buildPath, 'index.html');

// Health check endpoint for Render.com - must be first to always respond
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    buildExists: fs.existsSync(buildPath)
  });
});

// Root endpoint - responds immediately for Render health checks
app.get('/', (req, res, next) => {
  // If build and index.html exist, let the catch-all handler serve index.html
  if (fs.existsSync(buildPath) && fs.existsSync(indexPath)) {
    return next(); // Continue to catch-all handler
  }
  // Otherwise return a response indicating server is running but build isn't ready
  res.status(200).json({ 
    status: 'server running',
    message: 'Server is running but build directory may not be ready',
    buildExists: fs.existsSync(buildPath),
    indexExists: fs.existsSync(indexPath),
    timestamp: new Date().toISOString()
  });
});

if (!fs.existsSync(buildPath)) {
  console.error('WARNING: Build directory does not exist at:', buildPath);
  console.error('Server will start but will return errors for all requests.');
  console.error('Please ensure "npm run build" completes successfully before deployment.');
  
  // Don't exit - let the server start so we can see errors in logs
  // Serve a helpful error message for any request
  app.use((req, res) => {
    res.status(503).json({
      error: 'Build directory not found',
      message: 'The application build directory is missing. Please check the build logs.',
      path: buildPath
    });
  });
} else if (!fs.existsSync(indexPath)) {
  console.error('WARNING: index.html not found in build directory!');
  console.error('Build directory exists but is missing index.html');
  
  app.use((req, res) => {
    res.status(503).json({
      error: 'index.html not found',
      message: 'The build directory exists but index.html is missing. Please rebuild the application.',
      path: indexPath
    });
  });
} else {
  console.log('Build directory found, serving static files from:', buildPath);
  
  // Serve static files from the React app build directory
  app.use(express.static(buildPath, {
    maxAge: '1d',
    etag: true,
    index: false // Don't serve index.html automatically, we'll handle it in catch-all
  }));

  // Catch all handler: send back React's index.html file for any route that doesn't match a static file
  app.get('*', (req, res, next) => {
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error sending index.html:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error serving application', details: err.message });
        }
      }
    });
  });
}

// Error handling middleware - must be last
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// Get port from environment or use default
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const host = '0.0.0.0';

// Log startup information
console.log('=== Server Starting ===');
console.log(`Port: ${port}`);
console.log(`Host: ${host}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`Working Directory: ${__dirname}`);
console.log(`Build Path: ${buildPath}`);
console.log(`Build Exists: ${fs.existsSync(buildPath)}`);

const server = app.listen(port, host, () => {
  console.log(`✓ Server is running on http://${host}:${port}`);
  console.log(`✓ Server is ready to accept connections`);
  console.log(`=== Server Started Successfully ===`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('=== Server Error ===');
  if (err.code === 'EADDRINUSE') {
    console.error(`✗ Port ${port} is already in use`);
    process.exit(1);
  } else if (err.code === 'EACCES') {
    console.error(`✗ Permission denied to bind to port ${port}`);
    process.exit(1);
  } else {
    console.error('✗ Server error:', err);
    process.exit(1);
  }
});

// Configure timeouts to prevent 502 errors
server.keepAliveTimeout = 65000; // 65 seconds (slightly less than typical proxy timeout)
server.headersTimeout = 66000; // 66 seconds

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('=== Uncaught Exception ===');
  console.error(err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('=== Unhandled Rejection ===');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('=== SIGTERM received, shutting down gracefully ===');
  server.close(() => {
    console.log('✓ Server closed');
    console.log('✓ Process terminated');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('✗ Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
});
