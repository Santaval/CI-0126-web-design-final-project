const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/game/create
 * Create a new game room
 * 
 * Request body:
 * {
 *   playerName: string (required)
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   gameCode: "ABC123",
 *   gameId: "mongodb-object-id",
 *   playerId: "uuid-v4",
 *   playerNumber: 1
 * }
 */
router.post('/create', async (req, res) => {
    try {
        const { playerName } = req.body;

        // Validate input
        if (!playerName || playerName.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Player name is required'
            });
        }

        // Generate unique game code
        let gameCode;
        let codeExists = true;
        let attempts = 0;
        const maxAttempts = 10;

        // Try to generate a unique code
        while (codeExists && attempts < maxAttempts) {
            gameCode = Game.generateGameCode();
            const existingGame = await Game.findOne({ gameCode });
            codeExists = !!existingGame;
            attempts++;
        }

        if (codeExists) {
            return res.status(500).json({
                success: false,
                error: 'Failed to generate unique game code. Please try again.'
            });
        }

        // Generate unique player ID
        const playerId = uuidv4();

        // Create new game
        const newGame = new Game({
            gameCode,
            status: 'waiting',
            players: [{
                playerId,
                playerName: playerName.trim(),
                playerNumber: 1,
                ready: false,
                isConnected: true,
                lastSeen: new Date()
            }],
            currentTurn: 1,
            turnCounter: 0,
            player1Ships: [],
            player2Ships: [],
            moves: []
        });

        await newGame.save();

        console.log(`Game created: ${gameCode} by ${playerName} (${playerId})`);

        // Return success response
        return res.status(201).json({
            success: true,
            gameCode,
            gameId: newGame._id.toString(),
            playerId,
            playerNumber: 1,
            message: `Game room ${gameCode} created successfully`
        });

    } catch (error) {
        console.error('Error creating game:', error);
        
        // Handle duplicate gameCode error (shouldn't happen with our logic, but just in case)
        if (error.code === 11000) {
            return res.status(500).json({
                success: false,
                error: 'Failed to create game. Please try again.'
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Internal server error while creating game'
        });
    }
});

module.exports = router;
