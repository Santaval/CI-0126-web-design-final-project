const express = require('express');
const router = express.Router();
const gameService = require('../services/gameService');
const attackService = require('../services/attackService');

/**
 * POST /api/game/create
 * Create a new game room
 */
router.post('/create', async (req, res) => {
    try {
        const { playerName } = req.body;
        const result = await gameService.createGame(playerName);
        
        return res.status(201).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Error creating game:', error);
        
        return res.status(error.message.includes('not found') ? 404 : 400).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/game/join
 * Join an existing game room
 */
router.post('/join', async (req, res) => {
    try {
        const { gameCode, playerName } = req.body;
        const result = await gameService.joinGame(gameCode, playerName);
        
        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Error joining game:', error);
        
        const statusCode = error.message.includes('not found') ? 404 : 400;
        return res.status(statusCode).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/game/place-ships
 * Place ships on the board during setup phase
 */
router.post('/place-ships', async (req, res) => {
    try {
        const { gameId, playerId, ships } = req.body;
        const result = await gameService.placeShips(gameId, playerId, ships);
        
        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Error placing ships:', error);
        
        const statusCode = error.message.includes('not found') ? 404 : 
                          error.message.includes('Player not found') ? 403 : 400;
        return res.status(statusCode).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/game/attack
 * Make an attack on opponent's board
 */
router.post('/attack', async (req, res) => {
    try {
        const { gameId, playerId, target } = req.body;
        const result = await attackService.processAttack(gameId, playerId, target);
        
        return res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Error processing attack:', error);
        
        const statusCode = error.message.includes('not found') ? 404 : 
                          error.message.includes('Player not found') ? 403 : 400;
        
        const response = {
            success: false,
            error: error.message
        };
        
        // Include result if it's an already_hit error
        if (error.result) {
            response.result = error.result;
        }
        
        return res.status(statusCode).json(response);
    }
});

/**
 * GET /api/game/state/:gameId/:playerId
 * Get current game state for polling
 */
router.get('/state/:gameId/:playerId', async (req, res) => {
    try {
        const { gameId, playerId } = req.params;
        const state = await gameService.getGameState(gameId, playerId);
        
        return res.status(200).json({
            success: true,
            ...state
        });
    } catch (error) {
        console.error('Error getting game state:', error);
        
        const statusCode = error.message.includes('not found') ? 404 : 
                          error.message.includes('Player not found') ? 403 : 400;
        return res.status(statusCode).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
