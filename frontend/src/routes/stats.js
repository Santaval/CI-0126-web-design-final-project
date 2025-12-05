const express = require('express');
const router = express.Router();
const statsService = require('../services/statsService');
const { isAuthenticated } = require('../middleware/auth');

/**
 * GET /api/stats
 * Get current user's statistics
 */
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        const stats = await statsService.getUserStats(userId);
        res.json(stats);
    } catch (error) {
        console.error('Error getting user stats:', error);
        res.status(500).json({ 
            error: 'Failed to get statistics',
            message: error.message 
        });
    }
});

/**
 * GET /api/stats/history
 * Get current user's game history
 */
router.get('/history', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        const limit = parseInt(req.query.limit) || 20;
        const history = await statsService.getGameHistory(userId, limit);
        res.json(history);
    } catch (error) {
        console.error('Error getting game history:', error);
        res.status(500).json({ 
            error: 'Failed to get game history',
            message: error.message 
        });
    }
});

/**
 * GET /api/stats/ranking
 * Get user's leaderboard ranking
 */
router.get('/ranking', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        const ranking = await statsService.getUserRanking(userId);
        res.json(ranking);
    } catch (error) {
        console.error('Error getting ranking:', error);
        res.status(500).json({ 
            error: 'Failed to get ranking',
            message: error.message 
        });
    }
});

module.exports = router;
