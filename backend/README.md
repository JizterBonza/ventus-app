# Ventus Backend API

Backend API for the Ventus Hotel Booking App with PostgreSQL database.

## Features

- User authentication (signup, login, logout)
- JWT token-based authentication
- PostgreSQL database
- Password hashing with bcrypt
- CORS enabled
- RESTful API endpoints

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database

## Local Development Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set your database URL and JWT secret:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/ventus_db
   JWT_SECRET=your-super-secret-key
   NODE_ENV=development
   PORT=5000
   ```

3. **Initialize database:**
   ```bash
   npm run init-db
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

   Server will run on http://localhost:5000

## API Endpoints

### Health Check
- `GET /api/health` - Check server and database status

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Authenticate user
- `GET /api/auth/verify` - Verify JWT token (requires auth)
- `GET /api/auth/user` - Get current user (requires auth)
- `POST /api/auth/logout` - Logout user (requires auth)

## Database Schema

### Users Table
```sql
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
);
```

## Deployment to Render

See `POSTGRES_RENDER_SETUP.md` for complete deployment instructions.

## Security Notes

- Passwords are hashed using bcrypt
- JWT tokens expire after 7 days
- Always use HTTPS in production
- Change JWT_SECRET in production
- Never commit .env file

