require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const { passport } = require('./config/passport');
const authRoutes = require('./routes/auth');
const challengeRoutes = require('./routes/challenge');
const connectDB = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;
const bodyParser = require('body-parser');
const morgan = require('morgan');

// Connect to MongoDB
connectDB();

app.use(morgan('dev'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport and session
app.use(passport.initialize());
app.use(passport.session());

// Auth routes
app.use('/api/auth', authRoutes);

// Challenge routes
app.use('/api/challenge', challengeRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, './public')));

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
