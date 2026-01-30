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

  // Proxy for hotel search API (forwards auth so hotel details work)
  const hotelApiToken = process.env.REACT_APP_API_TOKEN || 'lev2_U4Jp8lyg5iXR2mTQVJEn_sbfi9YLSzE3NTIxNDQxODY';
  app.use(
    '/v2',
    createProxyMiddleware({
      target: 'https://api-staging.littleemperors.com',
      changeOrigin: true,
      secure: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        if (hotelApiToken && !proxyReq.getHeader('authorization')) {
          proxyReq.setHeader('Authorization', `Bearer ${hotelApiToken}`);
        }
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
