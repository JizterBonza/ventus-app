const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy for backend API (authentication, etc.)
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying API request:', req.method, req.url);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('API proxy response status:', proxyRes.statusCode);
      },
      onError: (err, req, res) => {
        console.error('API proxy error:', err);
      }
    })
  );

  // Proxy for hotel search API
  app.use(
    '/v2',
    createProxyMiddleware({
      target: 'https://api-staging.littleemperors.com',
      changeOrigin: true,
      secure: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying request:', req.method, req.url);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('Proxy response status:', proxyRes.statusCode);
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
      }
    })
  );
};
