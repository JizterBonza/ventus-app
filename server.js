const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'build')));

// Catch all handler: send back React's index.html file for any route that doesn't match a static file
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const port = process.env.PORT || 10000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});

// Configure timeouts to prevent 502 errors
server.keepAliveTimeout = 120000; // 120 seconds
server.headersTimeout = 120000; // 120 seconds

