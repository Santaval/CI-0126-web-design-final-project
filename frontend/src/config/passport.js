const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');

// Configure Local Strategy
passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            // Find user by username (case-insensitive)
            const user = await User.findOne({ username: username.toLowerCase() });
            
            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }

            // Compare passwords using the User model method
            const isMatch = await user.comparePassword(password);
            
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
    done(null, user._id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

module.exports = {
    passport
};
