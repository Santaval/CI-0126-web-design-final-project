const Game = require('../models/Game');
const Challenge = require('../models/Challenge');

/**
 * Ship sizes configuration
 */
const SHIP_SIZES = {
    carrier: 5,
    battleship: 4,
    cruiser: 3,
    submarine: 3,
    destroyer: 2
};

/**
 * Attack Service - Business logic for attack operations
 */
class AttackService {
    /**
     * Process an attack on opponent's board
     * @param {string} gameId - Game ID or Game Code
     * @param {string} playerId - Player ID making the attack
     * @param {Object} target - Target coordinates {row, col}
     * @returns {Object} Attack result
     */
    async processAttack(gameId, playerId, target) {
        // Validate input
        if (!gameId || !playerId) {
            throw new Error('Game ID and Player ID are required');
        }

        if (!target || typeof target.row !== 'number' || typeof target.col !== 'number') {
            throw new Error('Valid target coordinates (row, col) are required');
        }

        // Validate target is within bounds
        if (target.row < 0 || target.row >= 10 || target.col < 0 || target.col >= 10) {
            throw new Error('Target must be within 10x10 board (0-9)');
        }

        // Convert playerId to string if it's an ObjectId
        const playerIdStr = playerId.toString();

        // Find the game - try by gameCode first, then by _id
        let game;
        
        if (gameId.match(/^[0-9a-fA-F]{24}$/)) {
            game = await Game.findById(gameId);
        } else {
            game = await Game.findOne({ gameCode: gameId.toUpperCase() });
        }

        if (!game) {
            throw new Error('Game not found');
        }

        // Verify player is in the game
        const player = game.getPlayer(playerIdStr);
        if (!player) {
            throw new Error('Player not found in this game');
        }

        // Check if game is in playing state
        if (game.status !== 'playing') {
            throw new Error(`Cannot attack. Game status is '${game.status}'`);
        }

        // Check if it's this player's turn
        if (game.currentTurn !== player.playerNumber) {
            throw new Error('Not your turn');
        }

        // Check if this cell was already attacked by this player
        const alreadyAttacked = game.moves.some(
            move => move.playerNumber === player.playerNumber && 
                    move.row === target.row && 
                    move.col === target.col
        );

        if (alreadyAttacked) {
            const error = new Error('This cell has already been attacked');
            error.result = 'already_hit';
            throw error;
        }

        // Get opponent's ships
        const opponentShips = player.playerNumber === 1 ? game.player2Ships : game.player1Ships;
        
        if (!opponentShips || opponentShips.length === 0) {
            throw new Error('Opponent has not placed ships yet');
        }

        // Check if attack hits any ship
        const attackResult = this.calculateAttackResult(target, opponentShips, game.moves);

        // Record the move
        const move = {
            turnNumber: game.turnCounter + 1,
            playerNumber: player.playerNumber,
            row: target.row,
            col: target.col,
            result: attackResult.result,
            sunkShip: attackResult.sunkShip,
            timestamp: new Date()
        };

        game.moves.push(move);
        game.turnCounter += 1;

        // Check if game is over - only check this player's moves against opponent's ships
        const playerMoves = game.moves.filter(m => m.playerNumber === player.playerNumber);
        const gameOverResult = this.checkGameOver(opponentShips, playerMoves);
        
        if (gameOverResult.gameOver) {
            game.status = 'finished';
            game.winner = player.playerId;
            
            // Update the associated challenge
            await this.updateChallengeOnGameEnd(game.gameCode, player.playerId);
        } else {
            // Switch turns
            game.currentTurn = player.playerNumber === 1 ? 2 : 1;
        }

        await game.save();

        console.log(`Player ${player.playerNumber} attacked (${target.row},${target.col}) in game ${game.gameCode}: ${attackResult.result}${attackResult.sunkShip ? ` - sunk ${attackResult.sunkShip}` : ''}`);

        return {
            result: attackResult.result,
            sunkShip: attackResult.sunkShip,
            gameOver: gameOverResult.gameOver,
            winner: gameOverResult.gameOver ? player.playerNumber : null,
            nextTurn: game.currentTurn,
            message: gameOverResult.gameOver 
                ? `Game Over! Player ${player.playerNumber} wins!` 
                : `Attack ${attackResult.result}${attackResult.sunkShip ? ` - ${attackResult.sunkShip} sunk!` : ''}`
        };
    }

    /**
     * Calculate attack result (hit, miss, sunk)
     * @param {Object} target - Target coordinates
     * @param {Array} opponentShips - Opponent's ships
     * @param {Array} previousMoves - Previous moves in the game
     * @returns {Object} Attack result
     */
    calculateAttackResult(target, opponentShips, previousMoves) {
        let result = 'miss';
        let hitShip = null;
        let sunkShip = null;

        for (const ship of opponentShips) {
            // Use shipId instead of type, and positions array instead of position
            const shipType = ship.shipId || ship.type;
            const shipSize = SHIP_SIZES[shipType];
            
            // Ships are stored with positions array, not position object
            const shipCells = ship.positions || this.getShipCells(ship, shipSize);

            // Check if target hits this ship
            const isHit = shipCells.some(
                cell => cell.row === target.row && cell.col === target.col
            );

            if (isHit) {
                result = 'hit';
                hitShip = ship;

                // Check if ship is sunk
                const shipHits = previousMoves.filter(move => {
                    return shipCells.some(cell => cell.row === move.row && cell.col === move.col);
                });

                // Add 1 for the current hit
                if (shipHits.length + 1 === shipSize) {
                    result = 'sunk';
                    sunkShip = shipType;
                }

                break;
            }
        }

        return { result, sunkShip };
    }

    /**
     * Get all cells occupied by a ship
     * @param {Object} ship - Ship object with type, position, orientation
     * @param {number} shipSize - Size of the ship
     * @returns {Array} Array of cell coordinates
     */
    getShipCells(ship, shipSize) {
        const cells = [];
        
        for (let i = 0; i < shipSize; i++) {
            if (ship.orientation === 'horizontal') {
                cells.push({
                    row: ship.position.row,
                    col: ship.position.col + i
                });
            } else {
                cells.push({
                    row: ship.position.row + i,
                    col: ship.position.col
                });
            }
        }
        
        return cells;
    }

    /**
     * Check if all opponent ships are sunk
     * @param {Array} opponentShips - Opponent's ships
     * @param {Array} moves - All moves in the game
     * @returns {Object} Game over result
     */
    checkGameOver(opponentShips, moves) {
        const sunkShips = new Set();
        
        console.log('Checking game over with', moves.length, 'player moves and', opponentShips.length, 'opponent ships');
        
        for (const ship of opponentShips) {
            const shipType = ship.shipId || ship.type;
            const shipSize = SHIP_SIZES[shipType];
            
            // Use positions array if available, otherwise calculate from position
            const shipCells = ship.positions || this.getShipCells(ship, shipSize);

            const shipHits = moves.filter(move => {
                return shipCells.some(cell => cell.row === move.row && cell.col === move.col);
            });

            console.log(`Ship ${shipType}: ${shipHits.length}/${shipSize} hits`);

            if (shipHits.length === shipSize) {
                sunkShips.add(shipType);
                console.log(`Ship ${shipType} is SUNK!`);
            }
        }

        const gameOver = sunkShips.size === 5;
        console.log(`Game over check: ${sunkShips.size}/5 ships sunk. Game over: ${gameOver}`);

        // If all 5 ships are sunk, game is over
        return {
            gameOver: gameOver,
            sunkShipsCount: sunkShips.size
        };
    }

    /**
     * Update the challenge when game ends
     * @param {string} gameCode - Game code
     * @param {string} winnerPlayerId - Winner's player ID
     */
    async updateChallengeOnGameEnd(gameCode, winnerPlayerId) {
        try {
            // Find the challenge with this game code
            const challenge = await Challenge.findOne({ gameCode });
            
            if (!challenge) {
                console.warn(`No challenge found for game code ${gameCode}`);
                return;
            }

            // Determine winner and loser based on playerId
            const winnerId = winnerPlayerId;
            const loserId = challenge.challenger.toString() === winnerId 
                ? challenge.challenged 
                : challenge.challenger;

            // Update challenge status
            challenge.status = 'finished';
            challenge.winner = winnerId;
            challenge.loser = loserId;
            challenge.updatedAt = new Date();

            await challenge.save();

            console.log(`Challenge ${challenge._id} updated - Winner: ${winnerId}`);
        } catch (error) {
            console.error('Error updating challenge on game end:', error);
            // Don't throw - game should still be marked as finished even if challenge update fails
        }
    }
}

module.exports = new AttackService();
