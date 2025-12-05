# Testing Guide - Passport Authentication

## 🧪 How to Test Your Authentication System

### Prerequisites
✅ Server is running on http://localhost:3000
✅ Backend API is configured at `/api/auth`

---

## Test 1: Registration Flow

1. **Navigate to Registration Page**
   - Open: http://localhost:3000/auth/register/

2. **Fill in the Form**
   - Username: `testuser123`
   - Email: `test@example.com`
   - Password: `mypassword123`

3. **Submit Form**
   - Click "Register" button
   - Button should change to "Registering..."
   - On success: Green message appears, then redirects to home
   - On error: Red error message appears

4. **Expected Backend Call**
   ```
   POST /api/auth/register
   Body: {
     "username": "testuser123",
     "email": "test@example.com",
     "password": "mypassword123",
     "profileImageUrl": "/img/default-profile.png"
   }
   ```

5. **What Happens**
   - Password is hashed with bcrypt
   - User saved to `JSONDatabase/user.json`
   - Session is created (auto-login)
   - User redirected to home page

---

## Test 2: Login Flow

1. **Navigate to Login Page**
   - Open: http://localhost:3000/auth/login/

2. **Use Existing Test Credentials**
   - Username: `example_user`
   - Password: `securepassword123`

3. **Submit Form**
   - Click "Login" button
   - Button should change to "Logging in..."
   - On success: Redirects to home
   - On error: Red error message appears

4. **Expected Backend Call**
   ```
   POST /api/auth/login
   Body: {
     "username": "example_user",
     "password": "securepassword123"
   }
   ```

5. **What Happens**
   - Passport validates credentials
   - Password compared with bcrypt
   - Session is created
   - User data cached in localStorage
   - User redirected to home page

---

## Test 3: Error Handling

### Test Invalid Login
1. Go to login page
2. Enter wrong credentials:
   - Username: `wronguser`
   - Password: `wrongpass`
3. **Expected**: Red error message appears
4. **Backend Response**: 401 Unauthorized

### Test Duplicate Registration
1. Go to register page
2. Try to register with existing username: `example_user`
3. **Expected**: Error message "Username already taken"
4. **Backend Response**: 400 Bad Request

### Test Empty Fields
1. Try submitting forms with empty fields
2. **Expected**: Browser validation prevents submission
3. If bypassed, backend returns 400 error

---

## Test 4: Session Persistence

1. **Login Successfully**
   - Login with valid credentials
   - You should be redirected to home

2. **Check Session**
   - Open browser console
   - Type: `document.cookie`
   - You should see a `connect.sid` cookie

3. **Refresh Page**
   - The session should persist
   - User should still be logged in

4. **Check User Data**
   - Open console
   - Type: `localStorage.getItem('user')`
   - Should return user data

---

## Test 5: API Endpoints Directly

Open browser console and test:

### Get Current User
```javascript
fetch('/api/auth/user', {
    credentials: 'include'
})
.then(r => r.json())
.then(console.log);
```

### Logout
```javascript
fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
})
.then(r => r.json())
.then(console.log);
```

### Login via Console
```javascript
fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        username: 'example_user',
        password: 'securepassword123'
    })
})
.then(r => r.json())
.then(console.log);
```

### Register via Console
```javascript
fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        username: 'consoleuser',
        password: 'testpass123',
        email: 'console@test.com'
    })
})
.then(r => r.json())
.then(console.log);
```

---

## 📊 Monitoring Backend

### Check Server Logs
Watch the terminal where `npm start` is running. You should see:

```
POST /api/auth/register 201 ... ms
POST /api/auth/login 200 ... ms
GET /api/auth/user 200 ... ms
POST /api/auth/logout 200 ... ms
```

### Check User Database
```bash
cat JSONDatabase/user.json
```

Should show users with hashed passwords:
```json
[
  {
    "id": 1,
    "username": "example_user",
    "password": "$2b$10$...",
    "email": "example_user@example.com",
    "imageUrl": "...",
    "createdAt": "..."
  }
]
```

---

## 🐛 Troubleshooting

### Error: "Not authenticated"
- Session expired or not created
- Try logging in again
- Check if cookies are enabled

### Error: "Username already exists"
- Try a different username
- Or delete the user from `user.json`

### Error: Network request failed
- Check if server is running
- Verify URL is correct
- Check browser console for CORS errors

### Form doesn't submit
- Check browser console for JavaScript errors
- Verify `main.js` is loaded correctly
- Check network tab for failed requests

---

## ✅ Success Indicators

### Registration Success
- ✅ Green success message appears
- ✅ Redirects to home page within 1 second
- ✅ User appears in `user.json` with hashed password
- ✅ User data in localStorage
- ✅ Session cookie created

### Login Success
- ✅ Redirects to home page immediately
- ✅ User data in localStorage
- ✅ Session cookie created
- ✅ `/api/auth/user` returns user data

### Logout Success
- ✅ Session destroyed
- ✅ localStorage cleared
- ✅ `/api/auth/user` returns 401

---

## 🔍 Debug Checklist

- [ ] Server is running on port 3000
- [ ] No errors in server console
- [ ] Browser console shows no errors
- [ ] Network tab shows API calls
- [ ] Forms have correct action/method
- [ ] Input fields have `name` attributes
- [ ] AuthService is imported correctly
- [ ] user.json exists and is writable
- [ ] Session secret is configured

---

## 📝 Expected User Flow

1. User visits `/auth/register/`
2. Fills form and submits
3. **Frontend** → AuthService.register() → **POST /api/auth/register**
4. **Backend** → Hash password → Save to JSON → Create session
5. **Response** → User data (no password)
6. **Frontend** → Cache in localStorage → Redirect to `/`
7. User is now logged in!

Same flow for login, but with existing credentials.

---

## 🎯 Quick Test Commands

```bash
# Start server
cd frontend && npm start

# Test login endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"example_user","password":"securepassword123"}' \
  -c cookies.txt

# Test get user (with session)
curl http://localhost:3000/api/auth/user -b cookies.txt

# Test logout
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt
```

Now your login and register pages are fully connected to the Passport.js backend! 🚀
