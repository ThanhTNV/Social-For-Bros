import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Backend API URL
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
// Frontend URL
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

// HTTPS enforcement for production - TEMPORARILY DISABLED
// if (NODE_ENV === 'production') {
//   app.use((req, res, next) => {
//     // Check if request is secure (HTTPS)
//     // req.secure checks for HTTPS
//     // x-forwarded-proto header is set by load balancers/reverse proxies (AWS ALB, Nginx, etc.)
//     const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
//     
//     if (!isSecure) {
//       // Redirect HTTP to HTTPS
//       return res.redirect(301, `https://${req.headers.host}${req.url}`);
//     }
//     
//     next();
//   });
//   
//   console.log('[Security] HTTPS enforcement enabled for production environment');
// }

// Enable CORS
app.use(cors({
  origin: 'CORS_URL', // Allow all origins - adjust as needed for security
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      backend: BACKEND_URL,
      frontend: FRONTEND_URL
    }
  });
});

// Proxy API requests to backend (3001)
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // Remove /api prefix when forwarding to backend
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[API Gateway] Proxying API request: ${req.method} ${req.url} -> ${BACKEND_URL}${req.url}`);
  },
  onError: (err, req, res) => {
    console.error(`[API Gateway] Proxy error:`, err);
    res.status(500).json({ 
      error: 'Backend service unavailable',
      message: err.message 
    });
  }
}));

// Proxy all other requests to frontend (4200)
app.use('/', createProxyMiddleware({
  target: FRONTEND_URL,
  changeOrigin: true,
  ws: true, // Enable WebSocket support for Angular dev server
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[API Gateway] Proxying frontend request: ${req.method} ${req.url} -> ${FRONTEND_URL}${req.url}`);
  },
  onError: (err, req, res) => {
    console.error(`[API Gateway] Proxy error:`, err);
    res.status(500).json({ 
      error: 'Frontend service unavailable',
      message: err.message 
    });
  }
}));

// Start the API Gateway
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║             API Gateway Server Running                     ║
╠════════════════════════════════════════════════════════════╣
║  Gateway:  http://localhost:${PORT}                        ║
║  Backend:  ${BACKEND_URL}                                  ║
║  Frontend: ${FRONTEND_URL}                                 ║
╠════════════════════════════════════════════════════════════╣
║  Routes:                                                   ║
║  • /api/*     → Backend  (${BACKEND_URL})                  ║
║  • /*         → Frontend (${FRONTEND_URL})                 ║
║  • /health    → Gateway health check                       ║
╚════════════════════════════════════════════════════════════╝
  `);
});
