const Game = require('../models/Game');

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
     * @param {string} gameId - Game ID
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

        // Find the game
        const game = await Game.findById(gameId);

        if (!game) {
            throw new Error('Game not found');
        }

        // Verify player is in the game
        const player = game.getPlayer(null, playerId);
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

        // Check if this cell was already attacked
        const alreadyAttacked = game.moves.some(
            move => move.row === target.row && move.col === target.col
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

        // Check if game is over
        const gameOverResult = this.checkGameOver(opponentShips, game.moves);
        
        if (gameOverResult.gameOver) {
            game.status = 'finished';
            game.winner = player.playerNumber;
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
            const shipSize = SHIP_SIZES[ship.type];
            const shipCells = this.getShipCells(ship, shipSize);

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
                    sunkShip = ship.type;
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
        
        for (const ship of opponentShips) {
            const shipSize = SHIP_SIZES[ship.type];
            const shipCells = this.getShipCells(ship, shipSize);

            const shipHits = moves.filter(move => {
                return shipCells.some(cell => cell.row === move.row && cell.col === move.col);
            });

            if (shipHits.length === shipSize) {
                sunkShips.add(ship.type);
            }
        }

        // If all 5 ships are sunk, game is over
        return {
            gameOver: sunkShips.size === 5,
            sunkShipsCount: sunkShips.size
        };
    }
}

module.exports = new AttackService();
