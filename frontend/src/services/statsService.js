const Game = require('../models/Game');
const Challenge = require('../models/Challenge');
const User = require('../models/User');

/**
 * Stats Service - Business logic for user statistics
 */
class StatsService {
    /**
     * Get comprehensive user statistics
     * @param {string} userId - User ID
     * @returns {Object} User statistics
     */
    async getUserStats(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        const userIdStr = userId.toString();

        // Get all challenges involving this user
        const challenges = await Challenge.find({
            $or: [
                { challenger: userId },
                { challenged: userId }
            ]
        }).sort({ createdAt: -1 });

        // Get all games where this user played
        const games = await Game.find({
            'players.playerId': userIdStr,
            status: 'finished'
        }).sort({ createdAt: -1 });

        // Calculate statistics
        const totalGames = games.length;
        const wins = games.filter(g => g.winner === userIdStr).length;
        const losses = totalGames - wins;
        const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

        // Challenge statistics
        const totalChallenges = challenges.length;
        const challengesSent = challenges.filter(c => c.challenger.toString() === userIdStr).length;
        const challengesReceived = challenges.filter(c => c.challenged.toString() === userIdStr).length;
        const challengesWon = challenges.filter(c => c.winner && c.winner.toString() === userIdStr).length;
        const challengesLost = challenges.filter(c => c.loser && c.loser.toString() === userIdStr).length;
        const pendingChallenges = challenges.filter(c => c.status === 'pending').length;

        // Game performance stats
        let totalShots = 0;
        let totalHits = 0;
        let totalShipsSunk = 0;
        let totalShipsLost = 0;
        let fastestWin = null;
        let longestGame = null;

        for (const game of games) {
            const player = game.players.find(p => p.playerId === userIdStr);
            if (!player) continue;

            const playerMoves = game.moves.filter(m => m.playerNumber === player.playerNumber);
            const opponentMoves = game.moves.filter(m => m.playerNumber !== player.playerNumber);

            totalShots += playerMoves.length;
            totalHits += playerMoves.filter(m => m.result === 'hit' || m.result === 'sunk').length;

            // Count ships sunk
            const shipsSunk = [...new Set(playerMoves.filter(m => m.sunkShip).map(m => m.sunkShip))];
            totalShipsSunk += shipsSunk.length;

            // Count ships lost
            const shipsLost = [...new Set(opponentMoves.filter(m => m.sunkShip).map(m => m.sunkShip))];
            totalShipsLost += shipsLost.length;

            // Track fastest win and longest game
            const gameDuration = playerMoves.length;
            if (game.winner === userIdStr) {
                if (!fastestWin || gameDuration < fastestWin) {
                    fastestWin = gameDuration;
                }
            }
            if (!longestGame || gameDuration > longestGame) {
                longestGame = gameDuration;
            }
        }

        const accuracy = totalShots > 0 ? (totalHits / totalShots) * 100 : 0;
        const avgShotsPerGame = totalGames > 0 ? totalShots / totalGames : 0;

        // Current streak
        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;
        
        for (let i = games.length - 1; i >= 0; i--) {
            if (games[i].winner === userIdStr) {
                tempStreak++;
                if (i === games.length - 1) currentStreak++;
            } else {
                if (i === games.length - 1) currentStreak = 0;
                tempStreak = 0;
            }
            bestStreak = Math.max(bestStreak, tempStreak);
        }

        // Get recent games history with opponent info
        const recentGames = await this.getGameHistory(userId, 10);

        return {
            overview: {
                totalGames,
                wins,
                losses,
                winRate: Math.round(winRate * 100) / 100,
                currentStreak,
                bestStreak
            },
            challenges: {
                total: totalChallenges,
                sent: challengesSent,
                received: challengesReceived,
                won: challengesWon,
                lost: challengesLost,
                pending: pendingChallenges
            },
            performance: {
                totalShots,
                totalHits,
                accuracy: Math.round(accuracy * 100) / 100,
                avgShotsPerGame: Math.round(avgShotsPerGame * 100) / 100,
                totalShipsSunk,
                totalShipsLost,
                fastestWin,
                longestGame
            },
            recentGames
        };
    }

    /**
     * Get game history with opponent information
     * @param {string} userId - User ID
     * @param {number} limit - Number of games to return
     * @returns {Array} Game history
     */
    async getGameHistory(userId, limit = 20) {
        const userIdStr = userId.toString();

        const games = await Game.find({
            'players.playerId': userIdStr,
            status: 'finished'
        })
        .sort({ createdAt: -1 })
        .limit(limit);

        const history = [];

        for (const game of games) {
            const player = game.players.find(p => p.playerId === userIdStr);
            const opponent = game.players.find(p => p.playerId !== userIdStr);

            if (!player || !opponent) continue;

            // Get opponent user info
            let opponentInfo = null;
            try {
                const opponentUser = await User.findById(opponent.playerId);
                if (opponentUser) {
                    opponentInfo = {
                        id: opponentUser._id,
                        username: opponentUser.username,
                        avatar: opponentUser.avatar
                    };
                }
            } catch (error) {
                console.error('Error fetching opponent info:', error);
            }

            const playerMoves = game.moves.filter(m => m.playerNumber === player.playerNumber);
            const opponentMoves = game.moves.filter(m => m.playerNumber !== player.playerNumber);

            const youWon = game.winner === userIdStr;
            const playerHits = playerMoves.filter(m => m.result === 'hit' || m.result === 'sunk').length;
            const playerShipsSunk = [...new Set(playerMoves.filter(m => m.sunkShip).map(m => m.sunkShip))].length;
            const opponentShipsSunk = [...new Set(opponentMoves.filter(m => m.sunkShip).map(m => m.sunkShip))].length;

            history.push({
                gameId: game._id,
                gameCode: game.gameCode,
                date: game.createdAt,
                result: youWon ? 'win' : 'loss',
                opponent: opponentInfo || { username: 'Unknown' },
                stats: {
                    yourShots: playerMoves.length,
                    yourHits: playerHits,
                    yourAccuracy: playerMoves.length > 0 ? Math.round((playerHits / playerMoves.length) * 100) : 0,
                    yourShipsSunk: playerShipsSunk,
                    opponentShipsSunk: opponentShipsSunk
                },
                duration: game.turnCounter
            });
        }

        return history;
    }

    /**
     * Get user leaderboard ranking
     * @param {string} userId - User ID
     * @returns {Object} Leaderboard info
     */
    async getUserRanking(userId) {
        const userIdStr = userId.toString();

        // Get all users with their stats
        const allUsers = await User.find({});
        const rankings = [];

        for (const user of allUsers) {
            const games = await Game.find({
                'players.playerId': user._id.toString(),
                status: 'finished'
            });

            const wins = games.filter(g => g.winner === user._id.toString()).length;
            const totalGames = games.length;
            const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

            rankings.push({
                userId: user._id,
                username: user.username,
                avatar: user.avatar,
                wins,
                totalGames,
                winRate
            });
        }

        // Sort by wins (primary) and win rate (secondary)
        rankings.sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            return b.winRate - a.winRate;
        });

        // Find user's rank
        const userRank = rankings.findIndex(r => r.userId.toString() === userIdStr) + 1;

        return {
            rank: userRank,
            totalPlayers: rankings.length,
            topPlayers: rankings.slice(0, 10),
            userStats: rankings.find(r => r.userId.toString() === userIdStr)
        };
    }
}

module.exports = new StatsService();
