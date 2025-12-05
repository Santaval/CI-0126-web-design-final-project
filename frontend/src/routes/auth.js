const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { passport } = require('../config/passport');

// Register route
router.post('/register', async (req, res) => {
    try {
        const { username, password, email, profileImageUrl } = req.body;

        // Validate input
        if (!username || !password || !email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username, password, and email are required' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [
                { username: username.toLowerCase() },
                { email: email.toLowerCase() }
            ]
        });

        if (existingUser) {
            if (existingUser.username === username.toLowerCase()) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Username already exists' 
                });
            } else {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Email already exists' 
                });
            }
        }

        // Create new user (password will be hashed by the pre-save hook)
        const newUser = new User({
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password,
            imageUrl: profileImageUrl || '/img/default-profile.png'
        });

        await newUser.save();

        // Auto-login after registration
        req.login(newUser, (err) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Registration successful but login failed' 
                });
            }

            // Use the toJSON method to exclude password
            res.status(201).json({ 
                success: true, 
                message: 'User registered successfully',
                user: newUser.toJSON()
            });
        });

    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ 
                success: false, 
                message: messages.join(', ')
            });
        }

        // Handle duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ 
                success: false, 
                message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
            });
        }

        res.status(500).json({ 
            success: false, 
            message: 'Server error during registration' 
        });
    }
});

// Login route
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Server error during login' 
            });
        }

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: info.message || 'Invalid credentials' 
            });
        }

        req.login(user, (err) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Login failed' 
                });
            }

            // Use the toJSON method to exclude password
            res.json({ 
                success: true, 
                message: 'Logged in successfully',
                user: user.toJSON()
            });
        });
    })(req, res, next);
});

// Logout route
router.post('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Logout failed' 
            });
        }
        res.json({ 
            success: true, 
            message: 'Logged out successfully' 
        });
    });
});

// Get current user
router.get('/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ 
            success: true, 
            user: req.user.toJSON()
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: 'Not authenticated' 
        });
    }
});

// Update user profile
router.put('/user', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ 
            success: false, 
            message: 'Not authenticated' 
        });
    }

    try {
        const { email, imageUrl } = req.body;
        
        const updateData = {};
        if (email) updateData.email = email.toLowerCase();
        if (imageUrl) updateData.imageUrl = imageUrl;

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({ 
            success: true, 
            message: 'User updated successfully',
            user: updatedUser.toJSON()
        });
    } catch (error) {
        console.error('Update error:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ 
                success: false, 
                message: messages.join(', ')
            });
        }

        res.status(500).json({ 
            success: false, 
            message: 'Server error during update' 
        });
    }
});

module.exports = router;
