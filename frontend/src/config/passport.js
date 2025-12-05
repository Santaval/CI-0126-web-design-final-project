const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

const USER_DB_PATH = path.join(__dirname, '../../..', 'JSONDatabase', 'user.json');

// Helper function to read users from JSON file
async function readUsers() {
    try {
        const data = await fs.readFile(USER_DB_PATH, 'utf8');
        const users = JSON.parse(data);
        // Support both single user object and array of users
        return Array.isArray(users) ? users : [users];
    } catch (error) {
        console.error('Error reading users:', error);
        return [];
    }
}

// Helper function to write users to JSON file
async function writeUsers(users) {
    try {
        await fs.writeFile(USER_DB_PATH, JSON.stringify(users, null, 4), 'utf8');
    } catch (error) {
        console.error('Error writing users:', error);
        throw error;
    }
}

// Helper function to find user by username
async function findUserByUsername(username) {
    const users = await readUsers();
    return users.find(user => user.username === username);
}

// Helper function to find user by ID
async function findUserById(id) {
    const users = await readUsers();
    return users.find(user => user.id === id);
}

// Configure Local Strategy
passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const user = await findUserByUsername(username);
            
            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }

            // Compare passwords
            const isMatch = await bcrypt.compare(password, user.password);
            
            if (!isMatch) {
                return done(null, false, { message: 'Incorrect password.' });
            }

            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }
));

// Serialize user for the session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await findUserById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

module.exports = {
    passport,
    findUserByUsername,
    findUserById,
    readUsers,
    writeUsers
};
