const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Health check endpoint for Render.com
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Check if build directory exists
const buildPath = path.join(__dirname, 'build');
if (!fs.existsSync(buildPath)) {
  console.error('ERROR: Build directory does not exist!');
  console.error('Please run "npm run build" before starting the server.');
  process.exit(1);
}

// Serve static files from the React app build directory
app.use(express.static(buildPath, {
  maxAge: '1d',
  etag: true
}));

// Catch all handler: send back React's index.html file for any route that doesn't match a static file
app.get('*', (req, res, next) => {
  const indexPath = path.join(buildPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('ERROR: index.html not found in build directory!');
    return res.status(500).send('Server configuration error: index.html not found');
  }
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      if (!res.headersSent) {
        res.status(500).send('Error serving application');
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 3000;
const host = '0.0.0.0';

const server = app.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

// Configure timeouts to prevent 502 errors
server.keepAliveTimeout = 65000; // 65 seconds (slightly less than typical proxy timeout)
server.headersTimeout = 66000; // 66 seconds

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});
