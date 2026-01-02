import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Backend API URL
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
// Frontend URL
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

// Enable CORS
app.use(cors());

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
║  Gateway:  http://localhost:${PORT}                          ║
║  Backend:  ${BACKEND_URL}                                    ║
║  Frontend: ${FRONTEND_URL}                                   ║
╠════════════════════════════════════════════════════════════╣
║  Routes:                                                   ║
║  • /api/*     → Backend  (${BACKEND_URL})                    ║
║  • /*         → Frontend (${FRONTEND_URL})                   ║
║  • /health    → Gateway health check                       ║
╚════════════════════════════════════════════════════════════╝
  `);
});
