# Passport.js Authentication Implementation

This application now uses Passport.js with local strategy (username/password) for authentication.

## Features

- ✅ User registration with password hashing (bcrypt)
- ✅ User login with session management
- ✅ Logout functionality
- ✅ Protected routes with authentication middleware
- ✅ User profile updates
- ✅ Persistent sessions using express-session

## API Endpoints

### Authentication Routes (All under `/api/auth`)

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "username": "string (required)",
  "password": "string (required)",
  "email": "string (required)",
  "profileImageUrl": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 123456789,
    "username": "example_user",
    "email": "user@example.com",
    "imageUrl": "/img/default-profile.png",
    "createdAt": "2024-12-04T..."
  }
}
```

#### POST `/api/auth/login`
Login with username and password.

**Request Body:**
```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "user": {
    "id": 1,
    "username": "example_user",
    "email": "user@example.com",
    "imageUrl": "...",
    "createdAt": "..."
  }
}
```

#### POST `/api/auth/logout`
Logout the current user.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET `/api/auth/user`
Get the current authenticated user's data.

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "example_user",
    "email": "user@example.com",
    "imageUrl": "...",
    "createdAt": "..."
  }
}
```

#### PUT `/api/auth/user`
Update the current user's profile (requires authentication).

**Request Body:**
```json
{
  "email": "string (optional)",
  "imageUrl": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "user": {
    "id": 1,
    "username": "example_user",
    "email": "newemail@example.com",
    "imageUrl": "...",
    "createdAt": "..."
  }
}
```

## Authentication Flow

1. **Registration**: User submits registration form → Backend hashes password → Saves to `user.json` → Auto-login
2. **Login**: User submits credentials → Passport verifies → Creates session → Returns user data
3. **Protected Routes**: Middleware checks `req.isAuthenticated()` → Allow/deny access
4. **Logout**: Destroys session → Clears client-side cache

## Security Features

- **Password Hashing**: Uses bcrypt with salt rounds of 10
- **Session Management**: HTTP-only cookies with configurable security
- **No Password Exposure**: Passwords are never sent back to the client
- **Session Secret**: Configurable via environment variable

## Environment Variables

Create a `.env` file in the frontend directory:

```env
SESSION_SECRET=your-super-secret-key-change-this
NODE_ENV=development
PORT=3000
```

⚠️ **Important**: Change the session secret in production!

## Testing Credentials

A default test user is included:
- **Username**: `example_user`
- **Password**: `securepassword123`

## File Structure

```
frontend/src/
├── config/
│   └── passport.js          # Passport configuration & strategies
├── routes/
│   └── auth.js              # Authentication API routes
├── middleware/
│   └── auth.js              # Authentication middleware
└── public/utils/
    └── user.js              # Client-side auth service
```

## Usage in Frontend

The `AuthService` class automatically handles API communication:

```javascript
import AuthService from "/utils/user.js";

// Register
await AuthService.register({
  username: "newuser",
  password: "password123",
  email: "user@example.com"
});

// Login
await AuthService.login({
  username: "example_user",
  password: "securepassword123"
});

// Get current user
const user = await AuthService.getUser();

// Update user
await AuthService.updateUser({
  email: "newemail@example.com"
});

// Logout
await AuthService.logout();
```

## Protecting Routes

To protect server routes, use the middleware:

```javascript
const { isAuthenticated } = require('./middleware/auth');

app.get('/api/protected', isAuthenticated, (req, res) => {
  res.json({ user: req.user });
});
```

## Data Storage

User data is stored in `JSONDatabase/user.json` with the following structure:

```json
[
  {
    "id": 1,
    "username": "example_user",
    "password": "$2b$10$...",  // bcrypt hashed
    "email": "user@example.com",
    "imageUrl": "/img/default-profile.png",
    "createdAt": "2023-10-01T11:00:00Z"
  }
]
```

## Migration Notes

The system maintains backward compatibility by:
- Caching user data in localStorage for quick access
- Falling back to localStorage if API calls fail
- Preserving the same AuthService interface

Your existing frontend code will continue to work without modifications!
