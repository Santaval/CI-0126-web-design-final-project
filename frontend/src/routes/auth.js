const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { passport, findUserByUsername, readUsers, writeUsers } = require('../config/passport');

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
        const existingUser = await findUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username already exists' 
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const users = await readUsers();
        const newUser = {
            id: Date.now(),
            username,
            password: hashedPassword,
            email,
            imageUrl: profileImageUrl || '/img/default-profile.png',
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        await writeUsers(users);

        // Auto-login after registration
        req.login(newUser, (err) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Registration successful but login failed' 
                });
            }

            // Don't send password back
            const userResponse = { ...newUser };
            delete userResponse.password;

            res.status(201).json({ 
                success: true, 
                message: 'User registered successfully',
                user: userResponse
            });
        });

    } catch (error) {
        console.error('Registration error:', error);
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

            // Don't send password back
            const userResponse = { ...user };
            delete userResponse.password;

            res.json({ 
                success: true, 
                message: 'Logged in successfully',
                user: userResponse
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
        const userResponse = { ...req.user };
        delete userResponse.password;
        
        res.json({ 
            success: true, 
            user: userResponse 
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
        const users = await readUsers();
        
        const userIndex = users.findIndex(u => u.id === req.user.id);
        if (userIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Update user data
        if (email) users[userIndex].email = email;
        if (imageUrl) users[userIndex].imageUrl = imageUrl;

        await writeUsers(users);

        const updatedUser = { ...users[userIndex] };
        delete updatedUser.password;

        res.json({ 
            success: true, 
            message: 'User updated successfully',
            user: updatedUser 
        });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during update' 
        });
    }
});

module.exports = router;
