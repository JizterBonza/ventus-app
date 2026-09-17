# Ventus Backend API

Backend API for the Ventus Hotel Booking App with PostgreSQL database.

## Features

- User authentication (signup, login, logout)
- JWT token-based authentication
- PostgreSQL database
- Password hashing with bcrypt
- CORS enabled
- RESTful API endpoints
- Mailgun password-reset and booking emails (see `../BOOKING_EMAIL_SETUP.md`)

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database

## Local Development Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp ENV_example.txt .env
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

### Homepage content
- `GET /api/homepage` - Public featured slider and inspiration cards
- `GET /api/homepage/admin` - Current content and version (editor only)
- `PUT /api/homepage/admin` - Publish validated content (editor only)
- `POST /api/homepage/admin/images` - Upload a JPEG, PNG, or WebP up to 4 MB (editor only)

The browser editor is at `/admin/homepage` on the frontend. Editors sign in with
their existing Ventus account; set `HOMEPAGE_EDITOR_EMAILS` on the backend to a
comma-separated list of verified account email addresses. An empty value denies
all editing. Each editor must also enter a one-time code sent to their account
email before their first edit; this is required because normal Ventus sign-up
does not verify email ownership. Mailgun or Resend delivery must be configured.
Content and uploaded images are stored in PostgreSQL, so a Render
redeploy does not discard edits. Changes become public on save, subject to the
public endpoint's short cache lifetime. Do not store editor passwords in the
repository or Render environment settings.

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
