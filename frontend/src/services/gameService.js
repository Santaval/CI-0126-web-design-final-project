const Game = require('../models/Game');

/**
 * Game Service - Business logic for game operations
 */
class GameService {
    /**
     * Create a new game room
     * @param {string} playerName - Name of the player creating the game
     * @returns {Object} Game creation result with gameCode, gameId, playerId
     */
    async createGame(playerId) {

        // Generate unique game code
        let gameCode;
        let codeExists = true;
        let attempts = 0;
        const maxAttempts = 10;

        while (codeExists && attempts < maxAttempts) {
            gameCode = Game.generateGameCode();
            const existingGame = await Game.findOne({ gameCode });
            codeExists = !!existingGame;
            attempts++;
        }

        if (codeExists) {
            throw new Error('Failed to generate unique game code. Please try again.');
        }

        // Create new game
        const newGame = new Game({
            gameCode,
            status: 'waiting',
            players: [{
                playerId,
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


        return {
            gameCode,
            gameId: newGame._id.toString(),
            playerId,
            playerNumber: 1,
            message: `Game room ${gameCode} created successfully`
        };
    }

    /**
     * Join an existing game room
     * @param {string} gameCode - Game code to join
     * @param {string} playerName - Name of the joining player
     * @returns {Object} Join result with gameId, playerId, opponentName
     */
    async joinGame(gameCode, playerId) {
        if (!gameCode || gameCode.trim() === '') {
            throw new Error('Game code is required');
        }

        // Find the game by code
        const game = await Game.findOne({ gameCode: gameCode.trim().toUpperCase() });

        if (!game) {
            throw new Error(`Game with code ${gameCode} not found`);
        }

        // Check if game is full
        if (game.isFull()) {
            throw new Error('Game is already full');
        }

        // Check if game has already started
        if (game.status !== 'waiting') {
            throw new Error(`Cannot join game. Game status is '${game.status}'`);
        }

        // Add player 2 to the game
        game.players.push({
            playerId,
            playerNumber: 2,
            ready: false,
            isConnected: true,
            lastSeen: new Date()
        });

        // Update game status to 'setup' since both players are now present
        game.status = 'setup';

        await game.save();

        // Get opponent (player 1) info
        const opponent = game.players.find(p => p.playerNumber === 1);

        console.log(`Player (${playerId}) joined game ${gameCode}`);

        return {
            gameId: game._id.toString(),
            gameCode: game.gameCode,
            playerId,
            playerNumber: 2,
            message: `Successfully joined game ${gameCode}`
        };
    }

    /**
     * Place ships on the board
     * @param {string} gameId - Game ID or Game Code
     * @param {string} playerId - Player ID
     * @param {Array} ships - Array of ship placements
     * @returns {Object} Placement result with ready status
     */
    async placeShips(gameId, playerId, ships) {
        if (!gameId || !playerId) {
            throw new Error('Game ID and Player ID are required');
        }

        if (!ships || !Array.isArray(ships)) {
            throw new Error('Ships array is required');
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

        // Check if game is in setup phase
        if (game.status !== 'setup') {
            throw new Error(`Cannot place ships. Game status is '${game.status}'`);
        }

        // Validate ships
        this.validateShips(ships);

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

        return {
            ready: true,
            bothPlayersReady,
            gameStatus: game.status,
            message: bothPlayersReady 
                ? 'Both players ready! Game is starting.' 
                : 'Ships placed successfully. Waiting for opponent.'
        };
    }

    /**
     * Validate ship placements
     * @param {Array} ships - Array of ship placements
     * @throws {Error} If validation fails
     */
    validateShips(ships) {
        const expectedShips = ['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer'];
        
        if (ships.length !== 5) {
            throw new Error(`Expected 5 ships, received ${ships.length}`);
        }

        // Validate each ship has required fields
        for (const ship of ships) {
            if (!ship.type || !ship.position || !ship.orientation) {
                throw new Error('Each ship must have type, position, and orientation');
            }

            if (!expectedShips.includes(ship.type)) {
                throw new Error(`Invalid ship type: ${ship.type}`);
            }

            if (ship.orientation !== 'horizontal' && ship.orientation !== 'vertical') {
                throw new Error('Orientation must be "horizontal" or "vertical"');
            }

            if (typeof ship.position.row !== 'number' || typeof ship.position.col !== 'number') {
                throw new Error('Position must have numeric row and col');
            }

            if (ship.position.row < 0 || ship.position.row >= 10 || 
                ship.position.col < 0 || ship.position.col >= 10) {
                throw new Error('Position must be within 10x10 board (0-9)');
            }
        }

        // Check all ship types are present
        const shipTypes = ships.map(s => s.type).sort();
        const expectedTypes = [...expectedShips].sort();
        if (JSON.stringify(shipTypes) !== JSON.stringify(expectedTypes)) {
            throw new Error('Must include exactly one of each ship type: carrier, battleship, cruiser, submarine, destroyer');
        }
    }

    /**
     * Get current game state
     * @param {string} gameId - Game ID or Game Code
     * @param {string} playerId - Player ID
     * @returns {Object} Current game state
     */
    async getGameState(gameId, playerId) {
        if (!gameId || !playerId) {
            throw new Error('Game ID and Player ID are required');
        }

        // Convert playerId to string if it's an ObjectId
        const playerIdStr = playerId.toString();

        // Find the game - try by gameCode first, then by _id
        let game;
        
        // Check if it's a valid ObjectId (24 hex characters)
        if (gameId.match(/^[0-9a-fA-F]{24}$/)) {
            game = await Game.findById(gameId);
        } else {
            // Assume it's a gameCode
            game = await Game.findOne({ gameCode: gameId.toUpperCase() });
        }

        if (!game) {
            throw new Error('Game not found');
        }

        // Verify player is in the game
        console.log('Fetching game state for game:', game.gameCode, 'playerId:', playerIdStr);
        const player = game.getPlayer(playerIdStr);
        if (!player) {
            console.log('Available players:', game.players.map(p => ({ id: p.playerId, num: p.playerNumber })));
            throw new Error('Player not found in this game');
        }

        // Update player's last seen timestamp
        player.lastSeen = new Date();
        player.isConnected = true;
        await game.save();

        // Get opponent info
        const opponent = game.getOpponent(playerIdStr);
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
        return {
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
            
            // Moves
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
    }
}

module.exports = new GameService();
