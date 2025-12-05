# MongoDB Integration Guide

## 🗄️ MongoDB Database Migration

Your authentication system has been successfully migrated from JSON file storage to **MongoDB** using **Mongoose ODM**.

---

## 📋 What Changed

### ✅ New Components

1. **Database Configuration** (`src/config/database.js`)
   - MongoDB connection setup
   - Connection event handlers
   - Graceful shutdown handling

2. **User Model** (`src/models/User.js`)
   - Mongoose schema for users
   - Automatic password hashing on save
   - Password comparison method
   - Data validation
   - Indexes for performance

3. **Updated Authentication**
   - Passport now uses MongoDB
   - Auth routes use Mongoose queries
   - Better error handling with validation

4. **Migration Script** (`src/scripts/migrateUsers.js`)
   - Transfer existing users from JSON to MongoDB
   - Preserves hashed passwords
   - Handles duplicates gracefully

---

## 🚀 Installation & Setup

### Step 1: Install MongoDB

#### macOS (using Homebrew):
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Verify it's running
brew services list
```

#### Manual Installation:
Download from https://www.mongodb.com/try/download/community

#### Verify Installation:
```bash
mongosh --version
# or
mongo --version
```

### Step 2: Start MongoDB

```bash
# Start MongoDB as a service (macOS)
brew services start mongodb-community

# Or start manually
mongod --dbpath /usr/local/var/mongodb
```

Verify MongoDB is running on `mongodb://localhost:27017`

### Step 3: Configure Environment Variables

Create a `.env` file in the frontend directory:

```bash
cp .env.example .env
```

Edit `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/web-design-project
SESSION_SECRET=your-super-secret-key-change-this
NODE_ENV=development
PORT=3000
```

### Step 4: Migrate Existing Users

Transfer users from `JSONDatabase/user.json` to MongoDB:

```bash
npm run migrate
```

Expected output:
```
🚀 Starting user migration from JSON to MongoDB...

🔌 Connecting to MongoDB...
✅ Connected to MongoDB

📖 Reading users from JSON file...
Found 2 users in JSON file

✅ Migrated user: example_user
✅ Migrated user: savaldev

📊 Migration Summary:
   ✅ Migrated: 2
   ⏭️  Skipped: 0
   ❌ Failed: 0
   📝 Total: 2

🔌 Disconnected from MongoDB
```

### Step 5: Start the Server

```bash
npm start
# or for development with auto-reload
npm run dev
```

You should see:
```
✅ MongoDB connected successfully
📊 Database: web-design-project
Server is running on http://localhost:3000
```

---

## 📊 Database Schema

### User Collection

```javascript
{
  _id: ObjectId("..."),
  username: String,      // Unique, lowercase, 3-30 chars
  email: String,         // Unique, lowercase, valid email
  password: String,      // Bcrypt hashed, min 6 chars
  imageUrl: String,      // Default: '/img/default-profile.png'
  createdAt: Date,       // Auto-generated
  updatedAt: Date        // Auto-updated
}
```

### Indexes
- `username` (unique)
- `email` (unique)

---

## 🔧 MongoDB Operations

### Using MongoDB Shell

```bash
# Connect to MongoDB
mongosh

# Switch to your database
use web-design-project

# View all users
db.users.find().pretty()

# Find user by username
db.users.findOne({ username: "example_user" })

# Count users
db.users.countDocuments()

# Delete a user
db.users.deleteOne({ username: "testuser" })

# Drop entire users collection (careful!)
db.users.drop()
```

### Using Mongoose in Code

```javascript
const User = require('./models/User');

// Find all users
const users = await User.find();

// Find one user
const user = await User.findOne({ username: 'example_user' });

// Find by ID
const user = await User.findById(userId);

// Create user
const newUser = new User({
  username: 'newuser',
  email: 'user@example.com',
  password: 'password123'
});
await newUser.save();

// Update user
await User.findByIdAndUpdate(userId, { email: 'new@email.com' });

// Delete user
await User.findByIdAndDelete(userId);
```

---

## 🔐 Security Features

### Password Hashing
- Automatic hashing on user creation
- Uses bcrypt with 10 salt rounds
- Pre-save hook in User model
- Password never stored in plain text

### Validation
- Username: 3-30 characters, unique, lowercase
- Email: Valid format, unique, lowercase
- Password: Minimum 6 characters
- All fields required

### Data Protection
- Password excluded from JSON responses
- `toJSON()` method removes sensitive data
- Mongoose validation on all updates

---

## 📝 API Endpoints (Unchanged)

All API endpoints work the same way:

- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/logout` - End session
- `GET /api/auth/user` - Get current user
- `PUT /api/auth/user` - Update profile

Frontend code requires **no changes**!

---

## 🐛 Troubleshooting

### Error: "MongoDB connection error"

**Problem**: MongoDB is not running

**Solution**:
```bash
# Start MongoDB
brew services start mongodb-community

# Check status
brew services list

# Or start manually
mongod --config /usr/local/etc/mongod.conf
```

### Error: "connect ECONNREFUSED"

**Problem**: Wrong MongoDB URI

**Solution**: Check `.env` file
```env
MONGODB_URI=mongodb://localhost:27017/web-design-project
```

### Migration shows "0 users"

**Problem**: JSON file is empty or path is wrong

**Solution**: Check `JSONDatabase/user.json` exists and has data

### Users not logging in after migration

**Problem**: Password hash format issue

**Solution**: Re-migrate users or reset passwords

### Duplicate key error

**Problem**: User with same username/email exists

**Solution**: Use different username/email or delete existing user

---

## 🔍 Monitoring & Debugging

### View Connection Status

In your server logs, look for:
```
✅ MongoDB connected successfully
📊 Database: web-design-project
Mongoose connected to MongoDB
```

### Enable Mongoose Debug Mode

In `src/config/database.js`, add:
```javascript
mongoose.set('debug', true);
```

This will log all MongoDB queries to console.

### Check Database Stats

```bash
mongosh
use web-design-project
db.stats()
```

---

## 📈 Performance Tips

### Indexes
Already created on `username` and `email` for fast queries.

### Connection Pooling
Mongoose handles this automatically.

### Query Optimization
```javascript
// Good - select only needed fields
User.findOne({ username: 'test' }).select('username email');

// Good - use lean() for read-only data
User.find().lean();

// Avoid - loading all users at once
const users = await User.find(); // Bad for large datasets
```

---

## 🔄 Backup & Restore

### Backup Database
```bash
# Backup all data
mongodump --db=web-design-project --out=/path/to/backup

# Backup only users collection
mongodump --db=web-design-project --collection=users --out=/path/to/backup
```

### Restore Database
```bash
# Restore from backup
mongorestore --db=web-design-project /path/to/backup/web-design-project
```

---

## 🚀 Production Deployment

### MongoDB Atlas (Cloud)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string
4. Update `.env`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/web-design-project?retryWrites=true&w=majority
```

### Environment Variables

**Never commit `.env` to Git!**

Add to `.gitignore`:
```
.env
node_modules/
```

---

## 📚 Next Steps

### Optional Enhancements

1. **Add more user fields**:
   ```javascript
   // In src/models/User.js
   bio: String,
   avatar: String,
   role: { type: String, enum: ['user', 'admin'], default: 'user' }
   ```

2. **Add user stats**:
   ```javascript
   gamesPlayed: { type: Number, default: 0 },
   wins: { type: Number, default: 0 },
   losses: { type: Number, default: 0 }
   ```

3. **Add timestamps to track activity**:
   ```javascript
   lastLogin: Date,
   lastActive: Date
   ```

4. **Add email verification**:
   ```javascript
   isVerified: { type: Boolean, default: false },
   verificationToken: String
   ```

---

## 📊 Comparison: JSON vs MongoDB

| Feature | JSON File | MongoDB |
|---------|-----------|---------|
| **Speed** | Slow (file I/O) | Fast (in-memory) |
| **Scalability** | Poor | Excellent |
| **Queries** | Manual filtering | Rich query language |
| **Validation** | Manual | Built-in |
| **Indexing** | None | Full support |
| **Concurrency** | Risky | Safe |
| **Production Ready** | ❌ No | ✅ Yes |

---

## ✅ Summary

Your authentication system now uses:
- ✅ MongoDB for persistent storage
- ✅ Mongoose for data modeling
- ✅ Automatic password hashing
- ✅ Data validation
- ✅ Indexes for performance
- ✅ Scalable architecture
- ✅ Production-ready setup

The frontend code remains **100% compatible** - no changes needed!

---

## 🆘 Quick Reference

```bash
# Start MongoDB
brew services start mongodb-community

# Migrate users from JSON
npm run migrate

# Start server
npm start

# View users in MongoDB
mongosh
use web-design-project
db.users.find().pretty()

# Stop MongoDB
brew services stop mongodb-community
```

Now your application is ready for production with a real database! 🎉
