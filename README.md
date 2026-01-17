[![Build and Test](https://github.com/ThanhTNV/Social-For-Bros/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/ThanhTNV/Social-For-Bros/actions/workflows/build-and-test.yml)
# Social For Bros - API Gateway

This is the API Gateway service that routes requests to the backend API and frontend application.

## Architecture

```
Client Request
      ↓
API Gateway (Port 3000)
      ↓
      ├─→ /api/* → Backend API (Port 3001)
      └─→ /*     → Frontend Web (Port 4200)
```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy the environment configuration:
```bash
copy .env.example .env
```

3. Update `.env` file if needed with your service URLs

## Development

Run in development mode with hot reload:
```bash
npm run dev
```

## Production

1. Build the TypeScript project:
```bash
npm run build
```

2. Start the server:
```bash
npm start
```

## Configuration

Edit `.env` file to configure:

- `PORT`: API Gateway port (default: 3000)
- `BACKEND_URL`: Backend API URL (default: http://localhost:3001)
- `FRONTEND_URL`: Frontend web URL (default: http://localhost:4200)

## Endpoints

- `GET /health` - Health check endpoint
- `/api/*` - Proxied to backend API (strips /api prefix)
- `/*` - Proxied to frontend application

## Usage Example

If your backend has an endpoint `GET /users`, access it via:
```
http://localhost:3000/api/users
```

The gateway will forward it to:
```
http://localhost:3001/users
```

## Notes

- Make sure your backend service is running on port 3001
- Make sure your frontend service is running on port 4200
- The gateway supports WebSocket connections for frontend hot reload
