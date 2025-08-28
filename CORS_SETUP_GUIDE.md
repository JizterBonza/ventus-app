# CORS Setup Guide

## Problem
You're encountering a CORS (Cross-Origin Resource Sharing) error when trying to access the API from your local development server (`http://localhost:3000`) to `https://api-staging.littleemperors.com`.

## Solutions Implemented

### Solution 1: Create React App Proxy (Recommended for Development)
- Added `"proxy": "https://api-staging.littleemperors.com"` to `package.json`
- Updated API calls to use relative URLs in development
- This automatically proxies all requests from `/v2/*` to `https://api-staging.littleemperors.com/v2/*`

### Solution 2: CORS Proxy Services (Fallback for Production)
- Configured multiple CORS proxy options in `src/utils/api.ts`
- Available proxies:
  - `cors-anywhere`: `https://cors-anywhere.herokuapp.com/`
  - `allOrigins`: `https://api.allorigins.win/raw?url=`
  - `corsProxy`: `https://corsproxy.io/?`

## How to Use

### For Development:
1. The proxy is already configured in `package.json`
2. Restart your development server: `npm start`
3. API calls will automatically use relative URLs and be proxied

### For Production:
1. Choose a CORS proxy by setting `SELECTED_PROXY` in `src/utils/api.ts`
2. Options: `'corsAnywhere'`, `'allOrigins'`, `'corsProxy'`, or `null` for direct API

### To Switch Proxy Services:
Edit `src/utils/api.ts` and change the `SELECTED_PROXY` value:
```typescript
const SELECTED_PROXY = 'allOrigins'; // or any other option
```

## Alternative Solutions

### Option 1: Contact API Provider
Ask the API provider (`littleemperors.com`) to add CORS headers to allow requests from your domain.

### Option 2: Build Your Own Proxy
Create a simple Express.js proxy server:
```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use('/api', createProxyMiddleware({
  target: 'https://api-staging.littleemperors.com',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/v2'
  }
}));

app.listen(3001);
```

### Option 3: Use Environment Variables
Set up different API URLs for different environments:
```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api-staging.littleemperors.com/v2';
```

## Testing
Use the `testApiConnectivity()` function in `src/utils/api.ts` to test if the API is accessible:
```typescript
import { testApiConnectivity } from './utils/api';

testApiConnectivity().then(result => {
  console.log(result);
});
```

## Notes
- The Create React App proxy only works in development
- CORS proxy services may have rate limits
- For production, consider setting up your own proxy server
- Always test API connectivity before deploying
