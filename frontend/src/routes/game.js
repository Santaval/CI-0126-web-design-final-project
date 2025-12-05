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

/**
 * POST /api/game/join
 * Join an existing game room
 * 
 * Request body:
 * {
 *   gameCode: string (required),
 *   playerName: string (required)
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   gameId: "mongodb-object-id",
 *   playerId: "uuid-v4",
 *   playerNumber: 2,
 *   opponentName: "Player1"
 * }
 */
router.post('/join', async (req, res) => {
    try {
        const { gameCode, playerName } = req.body;

        // Validate input
        if (!gameCode || gameCode.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Game code is required'
            });
        }

        if (!playerName || playerName.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Player name is required'
            });
        }

        // Find the game by code
        const game = await Game.findOne({ gameCode: gameCode.trim().toUpperCase() });

        if (!game) {
            return res.status(404).json({
                success: false,
                error: `Game with code ${gameCode} not found`
            });
        }

        // Check if game is full
        if (game.isFull()) {
            return res.status(400).json({
                success: false,
                error: 'Game is already full'
            });
        }

        // Check if game has already started
        if (game.status !== 'waiting') {
            return res.status(400).json({
                success: false,
                error: `Cannot join game. Game status is '${game.status}'`
            });
        }

        // Generate unique player ID for player 2
        const playerId = uuidv4();

        // Add player 2 to the game
        game.players.push({
            playerId,
            playerName: playerName.trim(),
            playerNumber: 2,
            ready: false,
            isConnected: true,
            lastSeen: new Date()
        });

        // Update game status to 'setup' since both players are now present
        game.status = 'setup';

        await game.save();

        // Get opponent (player 1) name
        const opponent = game.getPlayer(1);

        console.log(`Player ${playerName} (${playerId}) joined game ${gameCode}`);

        // Return success response
        return res.status(200).json({
            success: true,
            gameId: game._id.toString(),
            gameCode: game.gameCode,
            playerId,
            playerNumber: 2,
            opponentName: opponent.playerName,
            message: `Successfully joined game ${gameCode}`
        });

    } catch (error) {
        console.error('Error joining game:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Internal server error while joining game'
        });
    }
});

/**
 * POST /api/game/place-ships
 * Place ships on the board during setup phase
 * 
 * Request body:
 * {
 *   gameId: string (required),
 *   playerId: string (required),
 *   ships: [
 *     {
 *       type: "carrier" | "battleship" | "cruiser" | "submarine" | "destroyer",
 *       position: { row: number, col: number },
 *       orientation: "horizontal" | "vertical"
 *     }
 *   ]
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   ready: true,
 *   bothPlayersReady: false,
 *   gameStatus: "setup" | "playing"
 * }
 */
router.post('/place-ships', async (req, res) => {
    try {
        const { gameId, playerId, ships } = req.body;

        // Validate input
        if (!gameId || !playerId) {
            return res.status(400).json({
                success: false,
                error: 'Game ID and Player ID are required'
            });
        }

        if (!ships || !Array.isArray(ships)) {
            return res.status(400).json({
                success: false,
                error: 'Ships array is required'
            });
        }

        // Find the game
        const game = await Game.findById(gameId);

        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found'
            });
        }

        // Verify player is in the game
        const player = game.getPlayer(null, playerId);
        if (!player) {
            return res.status(403).json({
                success: false,
                error: 'Player not found in this game'
            });
        }

        // Check if game is in setup phase
        if (game.status !== 'setup') {
            return res.status(400).json({
                success: false,
                error: `Cannot place ships. Game status is '${game.status}'`
            });
        }

        // Validate ships count (should be 5 ships)
        const expectedShips = ['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer'];
        if (ships.length !== 5) {
            return res.status(400).json({
                success: false,
                error: `Expected 5 ships, received ${ships.length}`
            });
        }

        // Validate each ship has required fields
        for (const ship of ships) {
            if (!ship.type || !ship.position || !ship.orientation) {
                return res.status(400).json({
                    success: false,
                    error: 'Each ship must have type, position, and orientation'
                });
            }

            if (!expectedShips.includes(ship.type)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid ship type: ${ship.type}`
                });
            }

            if (ship.orientation !== 'horizontal' && ship.orientation !== 'vertical') {
                return res.status(400).json({
                    success: false,
                    error: 'Orientation must be "horizontal" or "vertical"'
                });
            }

            if (typeof ship.position.row !== 'number' || typeof ship.position.col !== 'number') {
                return res.status(400).json({
                    success: false,
                    error: 'Position must have numeric row and col'
                });
            }

            if (ship.position.row < 0 || ship.position.row >= 10 || 
                ship.position.col < 0 || ship.position.col >= 10) {
                return res.status(400).json({
                    success: false,
                    error: 'Position must be within 10x10 board (0-9)'
                });
            }
        }

        // Check all ship types are present
        const shipTypes = ships.map(s => s.type).sort();
        const expectedTypes = [...expectedShips].sort();
        if (JSON.stringify(shipTypes) !== JSON.stringify(expectedTypes)) {
            return res.status(400).json({
                success: false,
                error: 'Must include exactly one of each ship type: carrier, battleship, cruiser, submarine, destroyer'
            });
        }

        // Save ships based on player number
        if (player.playerNumber === 1) {
            game.player1Ships = ships;
        } else {
            game.player2Ships = ships;
        }

        // Mark player as ready
        player.ready = true;

        // Check if both players are ready
        const bothPlayersReady = game.players.every(p => p.ready);

        // If both players are ready, start the game
        if (bothPlayersReady) {
            game.status = 'playing';
            game.currentTurn = 1; // Player 1 goes first
            game.turnCounter = 0;
        }

        await game.save();

        console.log(`Player ${player.playerNumber} placed ships in game ${game.gameCode}. Both ready: ${bothPlayersReady}`);

        return res.status(200).json({
            success: true,
            ready: true,
            bothPlayersReady,
            gameStatus: game.status,
            message: bothPlayersReady 
                ? 'Both players ready! Game is starting.' 
                : 'Ships placed successfully. Waiting for opponent.'
        });

    } catch (error) {
        console.error('Error placing ships:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Internal server error while placing ships'
        });
    }
});

/**
 * POST /api/game/attack
 * Make an attack on opponent's board
 * 
 * Request body:
 * {
 *   gameId: string (required),
 *   playerId: string (required),
 *   target: { row: number, col: number }
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   result: "hit" | "miss" | "sunk" | "already_hit",
 *   sunkShip: "carrier" | null,
 *   gameOver: false,
 *   winner: null | 1 | 2,
 *   nextTurn: 1 | 2
 * }
 */
router.post('/attack', async (req, res) => {
    try {
        const { gameId, playerId, target } = req.body;

        // Validate input
        if (!gameId || !playerId) {
            return res.status(400).json({
                success: false,
                error: 'Game ID and Player ID are required'
            });
        }

        if (!target || typeof target.row !== 'number' || typeof target.col !== 'number') {
            return res.status(400).json({
                success: false,
                error: 'Valid target coordinates (row, col) are required'
            });
        }

        // Validate target is within bounds
        if (target.row < 0 || target.row >= 10 || target.col < 0 || target.col >= 10) {
            return res.status(400).json({
                success: false,
                error: 'Target must be within 10x10 board (0-9)'
            });
        }

        // Find the game
        const game = await Game.findById(gameId);

        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found'
            });
        }

        // Verify player is in the game
        const player = game.getPlayer(null, playerId);
        if (!player) {
            return res.status(403).json({
                success: false,
                error: 'Player not found in this game'
            });
        }

        // Check if game is in playing state
        if (game.status !== 'playing') {
            return res.status(400).json({
                success: false,
                error: `Cannot attack. Game status is '${game.status}'`
            });
        }

        // Check if it's this player's turn
        if (game.currentTurn !== player.playerNumber) {
            return res.status(400).json({
                success: false,
                error: 'Not your turn'
            });
        }

        // Check if this cell was already attacked
        const alreadyAttacked = game.moves.some(
            move => move.row === target.row && move.col === target.col
        );

        if (alreadyAttacked) {
            return res.status(400).json({
                success: false,
                error: 'This cell has already been attacked',
                result: 'already_hit'
            });
        }

        // Get opponent's ships
        const opponentShips = player.playerNumber === 1 ? game.player2Ships : game.player1Ships;
        
        if (!opponentShips || opponentShips.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Opponent has not placed ships yet'
            });
        }

        // Define ship sizes
        const shipSizes = {
            carrier: 5,
            battleship: 4,
            cruiser: 3,
            submarine: 3,
            destroyer: 2
        };

        // Check if attack hits any ship
        let result = 'miss';
        let hitShip = null;
        let sunkShip = null;

        for (const ship of opponentShips) {
            const shipSize = shipSizes[ship.type];
            const shipCells = [];

            // Calculate all cells occupied by this ship
            for (let i = 0; i < shipSize; i++) {
                if (ship.orientation === 'horizontal') {
                    shipCells.push({
                        row: ship.position.row,
                        col: ship.position.col + i
                    });
                } else {
                    shipCells.push({
                        row: ship.position.row + i,
                        col: ship.position.col
                    });
                }
            }

            // Check if target hits this ship
            const isHit = shipCells.some(
                cell => cell.row === target.row && cell.col === target.col
            );

            if (isHit) {
                result = 'hit';
                hitShip = ship;

                // Check if ship is sunk (all cells of this ship have been hit)
                const shipHits = game.moves.filter(move => {
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

        // Record the move
        const move = {
            turnNumber: game.turnCounter + 1,
            playerNumber: player.playerNumber,
            row: target.row,
            col: target.col,
            result,
            sunkShip,
            timestamp: new Date()
        };

        game.moves.push(move);
        game.turnCounter += 1;

        // Check if game is over (all opponent ships sunk)
        let gameOver = false;
        let winner = null;

        if (result === 'sunk') {
            // Count how many opponent ships are sunk
            const sunkShips = new Set();
            
            for (const ship of opponentShips) {
                const shipSize = shipSizes[ship.type];
                const shipCells = [];

                for (let i = 0; i < shipSize; i++) {
                    if (ship.orientation === 'horizontal') {
                        shipCells.push({
                            row: ship.position.row,
                            col: ship.position.col + i
                        });
                    } else {
                        shipCells.push({
                            row: ship.position.row + i,
                            col: ship.position.col
                        });
                    }
                }

                const shipHits = game.moves.filter(move => {
                    return shipCells.some(cell => cell.row === move.row && cell.col === move.col);
                });

                if (shipHits.length === shipSize) {
                    sunkShips.add(ship.type);
                }
            }

            // If all 5 ships are sunk, game is over
            if (sunkShips.size === 5) {
                gameOver = true;
                winner = player.playerNumber;
                game.status = 'finished';
                game.winner = winner;
            }
        }

        // Switch turns (only if game is not over)
        if (!gameOver) {
            game.currentTurn = player.playerNumber === 1 ? 2 : 1;
        }

        await game.save();

        console.log(`Player ${player.playerNumber} attacked (${target.row},${target.col}) in game ${game.gameCode}: ${result}${sunkShip ? ` - sunk ${sunkShip}` : ''}`);

        return res.status(200).json({
            success: true,
            result,
            sunkShip,
            gameOver,
            winner,
            nextTurn: game.currentTurn,
            message: gameOver 
                ? `Game Over! Player ${winner} wins!` 
                : `Attack ${result}${sunkShip ? ` - ${sunkShip} sunk!` : ''}`
        });

    } catch (error) {
        console.error('Error processing attack:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Internal server error while processing attack'
        });
    }
});

/**
 * GET /api/game/state/:gameId/:playerId
 * Get current game state for polling
 * 
 * Response:
 * {
 *   success: true,
 *   gameStatus: "waiting" | "setup" | "playing" | "finished",
 *   playerNumber: 1 | 2,
 *   opponentJoined: true,
 *   opponentName: "Bob",
 *   opponentReady: false,
 *   currentTurn: 1 | 2,
 *   isYourTurn: false,
 *   moves: [...],
 *   opponentMoves: [...],
 *   yourShipsPlaced: true,
 *   winner: null | 1 | 2,
 *   gameOver: false
 * }
 */
router.get('/state/:gameId/:playerId', async (req, res) => {
    try {
        const { gameId, playerId } = req.params;

        // Validate input
        if (!gameId || !playerId) {
            return res.status(400).json({
                success: false,
                error: 'Game ID and Player ID are required'
            });
        }

        // Find the game
        const game = await Game.findById(gameId);

        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Game not found'
            });
        }

        // Verify player is in the game
        const player = game.getPlayer(null, playerId);
        if (!player) {
            return res.status(403).json({
                success: false,
                error: 'Player not found in this game'
            });
        }

        // Update player's last seen timestamp
        player.lastSeen = new Date();
        player.isConnected = true;
        await game.save();

        // Get opponent info
        const opponent = game.getOpponent(playerId);
        const opponentJoined = !!opponent;
        const opponentReady = opponent ? opponent.ready : false;
        const opponentName = opponent ? opponent.playerName : null;

        // Get moves
        const allMoves = game.moves || [];
        
        // Filter moves by player
        const yourMoves = allMoves.filter(move => move.playerNumber === player.playerNumber);
        const opponentMoves = allMoves.filter(move => move.playerNumber !== player.playerNumber);

        // Check if player has placed ships
        const yourShips = player.playerNumber === 1 ? game.player1Ships : game.player2Ships;
        const yourShipsPlaced = yourShips && yourShips.length === 5;

        // Check if opponent has placed ships
        const opponentShips = player.playerNumber === 1 ? game.player2Ships : game.player1Ships;
        const opponentShipsPlaced = opponentShips && opponentShips.length === 5;

        // Determine if it's your turn
        const isYourTurn = game.status === 'playing' && game.currentTurn === player.playerNumber;

        // Calculate game statistics
        const yourHits = yourMoves.filter(m => m.result === 'hit' || m.result === 'sunk').length;
        const yourMisses = yourMoves.filter(m => m.result === 'miss').length;
        const yourSunkShips = [...new Set(yourMoves.filter(m => m.sunkShip).map(m => m.sunkShip))];
        
        const opponentHits = opponentMoves.filter(m => m.result === 'hit' || m.result === 'sunk').length;
        const opponentMisses = opponentMoves.filter(m => m.result === 'miss').length;
        const opponentSunkShips = [...new Set(opponentMoves.filter(m => m.sunkShip).map(m => m.sunkShip))];

        // Prepare response
        const response = {
            success: true,
            gameCode: game.gameCode,
            gameStatus: game.status,
            playerNumber: player.playerNumber,
            playerName: player.playerName,
            
            // Opponent info
            opponentJoined,
            opponentName,
            opponentReady,
            opponentConnected: opponent ? opponent.isConnected : false,
            opponentShipsPlaced,
            
            // Turn info
            currentTurn: game.currentTurn,
            isYourTurn,
            turnCounter: game.turnCounter,
            
            // Ship placement status
            yourShipsPlaced,
            yourReady: player.ready,
            
            // Moves (only show positions for opponent moves, not which ships were hit for security)
            yourMoves: yourMoves.map(m => ({
                row: m.row,
                col: m.col,
                result: m.result,
                sunkShip: m.sunkShip,
                turnNumber: m.turnNumber
            })),
            opponentMoves: opponentMoves.map(m => ({
                row: m.row,
                col: m.col,
                result: m.result,
                sunkShip: m.sunkShip,
                turnNumber: m.turnNumber
            })),
            
            // Statistics
            statistics: {
                yourHits,
                yourMisses,
                yourSunkShips,
                yourTotalShots: yourMoves.length,
                opponentHits,
                opponentMisses,
                opponentSunkShips,
                opponentTotalShots: opponentMoves.length
            },
            
            // Game end info
            gameOver: game.status === 'finished',
            winner: game.winner || null,
            youWon: game.winner === player.playerNumber,
            
            // Timestamps
            gameCreatedAt: game.createdAt,
            lastMoveAt: allMoves.length > 0 ? allMoves[allMoves.length - 1].timestamp : null
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error('Error getting game state:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Internal server error while getting game state'
        });
    }
});

module.exports = router;
