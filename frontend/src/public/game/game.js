const GameConstants = {
    BOARD_SIZE: 10,
    SHIPS: [
        { id: 'carrier', name: "Portaaviones", size: 5 },
        { id: 'battleship', name: "Acorazado", size: 4 },
        { id: 'cruiser', name: "Crucero", size: 3 },
        { id: 'submarine', name: "Submarino", size: 3 },
        { id: 'destroyer', name: "Destructor", size: 2 }
    ],
    GAME_MODES: {
        SINGLE: 'single',
        MULTI: 'multi',
        LOCAL: 'local'
    },
    GAME_STATUS: {
        SETUP: 'setup',
        PLAYING: 'playing',
        FINISHED: 'finished',
        WAITING: 'waiting'
    },
    ATTACK_RESULT: {
        HIT: 'hit',
        MISS: 'miss',
        SUNK: 'sunk',
        ALREADY_HIT: 'already_hit'
    },
    
    API_BASE_URL: 'http://localhost:3000/api', 
    POLL_INTERVAL: 2000, 
    PLAYER_TYPES: {
        HUMAN: 'human',
        COMPUTER: 'computer'
    }
};

// =============================================
// CLASE SHIP (Mantener igual)
// =============================================
class Ship {
    constructor(id, name, size) {
        this.id = id;
        this.name = name;
        this.size = size;
        this.hits = 0;
        this.sunk = false;
        this.positions = [];
        this.orientation = 'horizontal';
    }

    hit() {
        this.hits++;
        if (this.hits >= this.size) {
            this.sunk = true;
        }
        return this.sunk;
    }

    isAtPosition(row, col) {
        return this.positions.some(pos => pos.row === row && pos.col === col);
    }
}

// =============================================
// CLASE BOARD (Mantener igual)
// =============================================
class Board {
    constructor(size = GameConstants.BOARD_SIZE) {
        this.size = size;
        this.grid = Array(size).fill().map(() => Array(size).fill(null));
        this.ships = [];
        this.misses = [];
        this.hits = [];
    }

    placeShip(ship, startRow, startCol, orientation) {
        if (!this.canPlaceShip(ship, startRow, startCol, orientation)) {
            return false;
        }

        ship.positions = [];
        
        if (orientation === 'horizontal') {
            for (let i = 0; i < ship.size; i++) {
                const col = startCol + i;
                this.grid[startRow][col] = ship;
                ship.positions.push({ row: startRow, col });
            }
        } else {
            for (let i = 0; i < ship.size; i++) {
                const row = startRow + i;
                this.grid[row][startCol] = ship;
                ship.positions.push({ row, col: startCol });
            }
        }

        ship.orientation = orientation;
        this.ships.push(ship);
        return true;
    }

    canPlaceShip(ship, startRow, startCol, orientation) {
        if (startRow < 0 || startRow >= this.size || startCol < 0 || startCol >= this.size) {
            return false;
        }

        if (orientation === 'horizontal') {
            if (startCol + ship.size > this.size) return false;
            for (let i = 0; i < ship.size; i++) {
                if (this.grid[startRow][startCol + i] !== null) return false;
            }
        } else {
            if (startRow + ship.size > this.size) return false;
            for (let i = 0; i < ship.size; i++) {
                if (this.grid[startRow + i][startCol] !== null) return false;
            }
        }

        return true;
    }

    receiveAttack(row, col) {
        if (row < 0 || row >= this.size || col < 0 || col >= this.size) {
            return { result: GameConstants.ATTACK_RESULT.MISS };
        }

        const alreadyHit = this.hits.some(h => h.row === row && h.col === col);
        const alreadyMissed = this.misses.some(m => m.row === row && m.col === col);
        
        if (alreadyHit || alreadyMissed) {
            return { result: GameConstants.ATTACK_RESULT.ALREADY_HIT };
        }

        const cell = this.grid[row][col];
        
        if (cell instanceof Ship) {
            const hit = cell.hit();
            this.hits.push({ row, col });
            
            if (cell.sunk) {
                return {
                    result: GameConstants.ATTACK_RESULT.SUNK,
                    ship: cell
                };
            }
            
            return {
                result: GameConstants.ATTACK_RESULT.HIT,
                ship: cell
            };
        } else {
            this.misses.push({ row, col });
            return { result: GameConstants.ATTACK_RESULT.MISS };
        }
    }

    allShipsSunk() {
        return this.ships.every(ship => ship.sunk);
    }

    getRemainingShips() {
        return this.ships.filter(ship => !ship.sunk);
    }

    reset() {
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill(null));
        this.ships = [];
        this.misses = [];
        this.hits = [];
    }
}

// =============================================
// CLASE PLAYER (Mantener igual)
// =============================================
class Player {
    constructor(name, isComputer = false) {
        this.name = name;
        this.isComputer = isComputer;
        this.board = new Board();
        this.attackBoard = new Board();
        this.ready = false;
        this.score = 0;
    }

    placeShipsRandomly() {
        const ships = GameConstants.SHIPS.map(shipConfig => 
            new Ship(shipConfig.id, shipConfig.name, shipConfig.size)
        );

        for (const ship of ships) {
            let placed = false;
            let attempts = 0;

            while (!placed && attempts < 100) {
                const orientation = Math.random() > 0.5 ? 'horizontal' : 'vertical';
                const maxRow = orientation === 'vertical' ? 
                    GameConstants.BOARD_SIZE - ship.size : 
                    GameConstants.BOARD_SIZE - 1;
                const maxCol = orientation === 'horizontal' ? 
                    GameConstants.BOARD_SIZE - ship.size : 
                    GameConstants.BOARD_SIZE - 1;

                const startRow = Math.floor(Math.random() * (maxRow + 1));
                const startCol = Math.floor(Math.random() * (maxCol + 1));

                if (this.board.canPlaceShip(ship, startRow, startCol, orientation)) {
                    this.board.placeShip(ship, startRow, startCol, orientation);
                    placed = true;
                }
                attempts++;
            }
        }

        this.ready = true;
    }

    placeShips(shipPlacements) {
        for (const placement of shipPlacements) {
            const shipConfig = GameConstants.SHIPS.find(s => s.id === placement.shipId);
            if (shipConfig) {
                const ship = new Ship(shipConfig.id, shipConfig.name, shipConfig.size);
                this.board.placeShip(ship, placement.startRow, placement.startCol, placement.orientation);
            }
        }
        this.ready = true;
    }

    getShipPlacements() {
        return this.board.ships.map(ship => ({
            shipId: ship.id,
            startRow: ship.positions[0].row,
            startCol: ship.positions[0].col,
            orientation: ship.orientation
        }));
    }

    makeAttack(row, col, opponentBoard) {
        const result = opponentBoard.receiveAttack(row, col);
        
        if (result.result === GameConstants.ATTACK_RESULT.HIT || 
            result.result === GameConstants.ATTACK_RESULT.SUNK) {
            this.attackBoard.grid[row][col] = 'hit';
        } else if (result.result === GameConstants.ATTACK_RESULT.MISS) {
            this.attackBoard.grid[row][col] = 'miss';
        }

        return result;
    }
}

// =============================================
// CLASE GAME (Actualizada con métodos faltantes)
// =============================================
class Game {
    constructor(player1, player2, gameMode = GameConstants.GAME_MODES.LOCAL) {
        this.players = [player1, player2];
        this.currentPlayerIndex = 0;
        this.gameMode = gameMode;
        this.status = GameConstants.GAME_STATUS.SETUP;
        this.winner = null;
        this.moveHistory = [];
        this.turnCounter = 0;
        this.gameId = this.generateGameId();
        this.roomCode = this.generateRoomCode();
        this.createdAt = new Date().toISOString();
        this.lastUpdated = new Date().toISOString();
    }

    generateGameId() {
        return 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // MÉTODOS FALTANTES:
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    getOpponent() {
        return this.players[(this.currentPlayerIndex + 1) % 2];
    }

    switchTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 2;
        this.turnCounter++;
    }

    makeMove(row, col) {
        if (this.status !== GameConstants.GAME_STATUS.PLAYING) {
            throw new Error('El juego no está en progreso');
        }

        const currentPlayer = this.getCurrentPlayer();
        const opponent = this.getOpponent();

        const attackResult = currentPlayer.makeAttack(row, col, opponent.board);

        const move = {
            player: currentPlayer.name,
            row,
            col,
            result: attackResult.result,
            shipSunk: attackResult.ship ? attackResult.ship.name : null,
            timestamp: new Date().toISOString(),
            turn: this.turnCounter
        };

        this.moveHistory.push(move);

        if (opponent.board.allShipsSunk()) {
            this.status = GameConstants.GAME_STATUS.FINISHED;
            this.winner = currentPlayer;
            return { ...attackResult, gameOver: true };
        }

        if (attackResult.result === GameConstants.ATTACK_RESULT.MISS ||
            attackResult.result === GameConstants.ATTACK_RESULT.ALREADY_HIT) {
            this.switchTurn();
        }

        return { ...attackResult, gameOver: false };
    }

    startGame() {
        if (this.players.every(player => player.ready)) {
            this.status = GameConstants.GAME_STATUS.PLAYING;
            return true;
        }
        return false;
    }

    toJSON() {
        return {
            gameId: this.gameId,
            roomCode: this.roomCode,
            players: this.players.map(p => ({
                name: p.name,
                ready: p.ready,
                shipsRemaining: p.board.getRemainingShips().length,
                totalShips: p.board.ships.length,
                isComputer: p.isComputer
            })),
            currentPlayer: this.getCurrentPlayer().name,
            status: this.status,
            turnCounter: this.turnCounter,
            winner: this.winner ? this.winner.name : null,
            totalMoves: this.moveHistory.length,
            createdAt: this.createdAt,
            lastUpdated: this.lastUpdated
        };
    }
}

// =============================================
// CLASE MULTIPLAYER MANAGER (Completa)
// =============================================
class MultiplayerManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.pollingInterval = null;
        this.lastUpdateTime = 0;
        this.serverGameState = null;
        this.isPolling = false;
    }

    async createGame(playerName) {
        try {
            console.log('Creando juego en servidor...');
            const response = await fetch(`${GameConstants.API_BASE_URL}/game/create`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    playerName: playerName || 'Jugador 1'
                })
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.gameManager.playerId = data.playerId;
                this.gameManager.gameId = data.gameId;
                this.gameManager.gameCode = data.gameCode;
                
                // Crear jugador local
                const player = new Player(playerName);
                this.gameManager.currentGame = new Game(
                    player, 
                    new Player('Esperando oponente...'), 
                    GameConstants.GAME_MODES.MULTI
                );
                
                this.gameManager.currentGame.status = GameConstants.GAME_STATUS.WAITING;
                this.gameManager.gameMode = GameConstants.GAME_MODES.MULTI;
                
                this.startPolling();
                
                console.log('Juego creado exitosamente:', data);
                return {
                    success: true,
                    gameCode: data.gameCode,
                    gameId: data.gameId,
                    playerId: data.playerId
                };
            } else {
                throw new Error(data.error || 'Error al crear juego');
            }
        } catch (error) {
            console.error('Error creating game:', error);
            return { 
                success: false, 
                error: error.message || 'Error de conexión con el servidor'
            };
        }
    }

    async joinGame(gameCode, playerName) {
        try {
            console.log('Uniéndose al juego:', gameCode);
            const response = await fetch(`${GameConstants.API_BASE_URL}/game/join`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    gameId: gameCode.toLowerCase(), 
                    playerName: playerName || 'Jugador 2'
                })
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.gameManager.playerId = data.playerId;
                this.gameManager.gameId = data.gameId;
                this.gameManager.gameCode = gameCode;
                
                // Crear jugador local
                const player = new Player(playerName);
                this.gameManager.currentGame = new Game(
                    player, 
                    new Player('Oponente'), 
                    GameConstants.GAME_MODES.MULTI
                );
                
                this.gameManager.gameMode = GameConstants.GAME_MODES.MULTI;
                
                this.startPolling();
                
                console.log('Unido exitosamente al juego:', data);
                return { 
                    success: true, 
                    gameId: data.gameId,
                    playerId: data.playerId,
                    playerNumber: data.playerNumber || 2
                };
            } else {
                throw new Error(data.error || 'Error al unirse al juego');
            }
        } catch (error) {
            console.error('Error joining game:', error);
            return { 
                success: false, 
                error: error.message || 'Error de conexión con el servidor'
            };
        }
    }

    async placeShips(shipPlacements) {
        try {
            console.log('Enviando barcos al servidor...', shipPlacements);
            const response = await fetch(`${GameConstants.API_BASE_URL}/game/place-ships`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    gameId: this.gameManager.gameId,
                    playerId: this.gameManager.playerId,
                    shipPlacements: shipPlacements,
                    playerName: this.gameManager.playerName
                })
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Barcos colocados en servidor:', data);
            return data;
        } catch (error) {
            console.error('Error placing ships:', error);
            return { 
                success: false, 
                error: error.message || 'Error al enviar barcos al servidor'
            };
        }
    }

    async makeMove(row, col) {
        try {
            console.log('Enviando movimiento al servidor:', { row, col });
            const response = await fetch(`${GameConstants.API_BASE_URL}/game/attack`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    gameId: this.gameManager.gameId,
                    playerId: this.gameManager.playerId,
                    row: parseInt(row),
                    col: parseInt(col),
                    timestamp: new Date().toISOString()
                })
            });
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Respuesta del movimiento:', data);
            
            if (data.success) {
                await this.updateLocalGameState(data);
            }
            
            return data;
        } catch (error) {
            console.error('Error making move:', error);
            return { 
                success: false, 
                error: error.message || 'Error al enviar movimiento al servidor'
            };
        }
    }

    async pollGameState() {
        if (!this.gameManager.gameId || !this.gameManager.playerId) {
            console.warn('No hay gameId o playerId para polling');
            return null;
        }
        
        try {
            console.log('Polling estado del juego...');
            const response = await fetch(
                `${GameConstants.API_BASE_URL}/game/poll/${this.gameManager.gameId}/${this.gameManager.playerId}?_=${Date.now()}`,
                {
                    headers: { 'Accept': 'application/json' },
                    cache: 'no-cache'
                }
            );
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.error('Juego no encontrado en el servidor');
                    this.stopPolling();
                    return null;
                }
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && !data.error) {
                this.serverGameState = data;
                this.handleGameUpdate(data);
                return data;
            } else {
                console.warn('Error en respuesta del polling:', data?.error);
                return null;
            }
        } catch (error) {
            console.error('Error polling game state:', error);
            return null;
        }
    }

    handleGameUpdate(gameState) {
        const game = this.gameManager.currentGame;
        if (!game) {
            console.warn('No hay juego local para actualizar');
            return;
        }
        
        console.log('Actualizando juego desde servidor:', gameState);
        
        game.status = this.mapServerStatus(gameState.status);
        game.turnCounter = gameState.turn || 0;
        
        if (gameState.players && Array.isArray(gameState.players)) {
            gameState.players.forEach((serverPlayer, index) => {
                if (index < game.players.length) {
                    const localPlayer = game.players[index];
                    
                    if (serverPlayer.name && serverPlayer.name !== localPlayer.name) {
                        localPlayer.name = serverPlayer.name;
                    }
                    
                    if (serverPlayer.ready !== undefined) {
                        localPlayer.ready = serverPlayer.ready;
                    }
                }
            });
        }
        
        if (gameState.currentPlayer) {
            const playerIndex = game.players.findIndex(p => p.name === gameState.currentPlayer);
            if (playerIndex !== -1) {
                game.currentPlayerIndex = playerIndex;
            }
        }
        
        if (gameState.winner) {
            const winnerPlayer = game.players.find(p => p.name === gameState.winner);
            if (winnerPlayer) {
                game.winner = winnerPlayer;
                game.status = GameConstants.GAME_STATUS.FINISHED;
            }
        }
        
        if (gameState.moves && Array.isArray(gameState.moves)) {
            this.syncMoves(game, gameState.moves);
        }
        
        this.emitGameEvents(game, gameState);
        
        this.lastUpdateTime = Date.now();
    }
    
    mapServerStatus(serverStatus) {
        const statusMap = {
            'waiting': GameConstants.GAME_STATUS.WAITING,
            'setup': GameConstants.GAME_STATUS.SETUP,
            'playing': GameConstants.GAME_STATUS.PLAYING,
            'finished': GameConstants.GAME_STATUS.FINISHED
        };
        return statusMap[serverStatus] || GameConstants.GAME_STATUS.WAITING;
    }
    
    syncMoves(game, serverMoves) {
        serverMoves.forEach(serverMove => {
            const exists = game.moveHistory.some(move => 
                move.row === serverMove.row && 
                move.col === serverMove.col && 
                move.player === serverMove.playerId
            );
            
            if (!exists && serverMove.result) {
                const player = game.players.find(p => p.name === serverMove.playerId);
                const opponent = game.getOpponent();
                
                if (player && opponent) {
                    const result = opponent.board.receiveAttack(serverMove.row, serverMove.col);
                    
                    game.moveHistory.push({
                        player: player.name,
                        row: serverMove.row,
                        col: serverMove.col,
                        result: result.result,
                        timestamp: new Date().toISOString(),
                        turn: game.turnCounter
                    });
                    
                    if (result.result === GameConstants.ATTACK_RESULT.HIT || 
                        result.result === GameConstants.ATTACK_RESULT.SUNK) {
                        player.attackBoard.grid[serverMove.row][serverMove.col] = 'hit';
                    } else if (result.result === GameConstants.ATTACK_RESULT.MISS) {
                        player.attackBoard.grid[serverMove.row][serverMove.col] = 'miss';
                    }
                }
            }
        });
    }
    
    emitGameEvents(game, gameState) {
        this.gameManager.emit('gameStateChanged', game.toJSON());
        
        if (gameState.status === 'playing' && game.status !== GameConstants.GAME_STATUS.PLAYING) {
            this.gameManager.emit('gameStarted', game);
        }
        
        if (gameState.status === 'finished' || game.winner) {
            this.gameManager.emit('gameEnded', {
                winner: game.winner ? game.winner.name : null,
                moves: game.moveHistory.length,
                gameState: game.toJSON()
            });
        }
        
        if (gameState.playerJoined) {
            this.gameManager.emit('playerJoined', {
                playerName: gameState.playerJoined,
                game: game.toJSON()
            });
        }
        
        if (gameState.playerReady) {
            this.gameManager.emit('playerReady', {
                playerName: gameState.playerReady,
                game: game.toJSON()
            });
        }
    }
    
    async updateLocalGameState(moveResult) {
        if (!moveResult.success) return;
        
        const game = this.gameManager.currentGame;
        if (!game) return;
        
        if (moveResult.gameOver) {
            game.status = GameConstants.GAME_STATUS.FINISHED;
            const winner = game.players.find(p => p.name === moveResult.winner);
            if (winner) game.winner = winner;
        }
        
        setTimeout(() => this.pollGameState(), 500);
    }

    startPolling() {
        if (this.isPolling) {
            console.warn('El polling ya está activo');
            return;
        }
        
        console.log('Iniciando polling...');
        this.isPolling = true;
        
        this.pollGameState();
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        this.pollingInterval = setInterval(() => {
            this.pollGameState();
        }, GameConstants.POLL_INTERVAL);
        
        console.log(`Polling configurado cada ${GameConstants.POLL_INTERVAL}ms`);
    }

    stopPolling() {
        console.log('Deteniendo polling...');
        this.isPolling = false;
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        
        this.serverGameState = null;
    }
    
    getGameState() {
        return this.serverGameState;
    }
    
    cleanup() {
        this.stopPolling();
        this.gameManager = null;
        this.serverGameState = null;
    }
}

// =============================================
// CLASE GAME MANAGER (ÚNICA - Corregida)
// =============================================
class GameManager {
    constructor() {
        this.currentGame = null;
        this.playerName = 'Jugador';
        this.playerId = null;
        this.gameId = null;
        this.gameCode = null;
        this.gameMode = null;
        this.listeners = {};
        this.isConnected = false;
        this.multiplayerManager = new MultiplayerManager(this);
        this.playerNumber = 1;
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    // ========== SINGLE PLAYER ==========
    startSinglePlayer(playerName = 'Jugador') {
        this.playerName = playerName;
        const humanPlayer = new Player(playerName);
        const computerPlayer = new Player('CPU', true);
        
        this.currentGame = new Game(humanPlayer, computerPlayer, GameConstants.GAME_MODES.SINGLE);
        this.gameMode = GameConstants.GAME_MODES.SINGLE;
        this.playerNumber = 1;
        
        computerPlayer.placeShipsRandomly();
        
        this.emit('gameStateChanged', this.currentGame.toJSON());
        return this.currentGame;
    }

    // ========== MULTIPLAYER ==========
    async createMultiplayerGame(playerName) {
        this.playerName = playerName;
        this.playerNumber = 1;
        
        const result = await this.multiplayerManager.createGame(playerName);
        
        if (result.success) {
            this.setupMultiplayerListeners();
            return result;
        } else {
            throw new Error(result.error || 'Error al crear juego multijugador');
        }
    }

    async joinMultiplayerGame(gameCode, playerName) {
        this.playerName = playerName;
        this.playerNumber = 2;
        
        const result = await this.multiplayerManager.joinGame(gameCode, playerName);
        
        if (result.success) {
            this.setupMultiplayerListeners();
            return result;
        } else {
            throw new Error(result.error || 'Error al unirse al juego');
        }
    }

    setupMultiplayerListeners() {
        this.on('gameStarted', (game) => {
            console.log('¡Juego multijugador iniciado!');
        });
        
        this.on('playerJoined', (data) => {
            console.log(`Jugador unido: ${data.playerName}`);
        });
        
        this.on('playerReady', (data) => {
            console.log(`Jugador listo: ${data.playerName}`);
        });
    }

    async placeShipsMultiplayer(shipPlacements) {
        if (this.gameMode !== GameConstants.GAME_MODES.MULTI) {
            throw new Error('No estás en modo multijugador');
        }
        
        if (!this.currentGame) {
            throw new Error('No hay juego actual');
        }
        
        this.currentGame.players[0].placeShips(shipPlacements);
        
        const result = await this.multiplayerManager.placeShips(shipPlacements);
        
        if (result.success) {
            this.currentGame.players[0].ready = true;
            
            if (this.currentGame.players.every(p => p.ready)) {
                this.currentGame.status = GameConstants.GAME_STATUS.PLAYING;
            }
            
            this.emit('gameStateChanged', this.currentGame.toJSON());
            return result;
        } else {
            throw new Error(result.error || 'Error al colocar barcos en el servidor');
        }
    }

    async makeMoveMultiplayer(row, col) {
        if (this.gameMode !== GameConstants.GAME_MODES.MULTI) {
            throw new Error('No estás en modo multijugador');
        }
        
        if (!this.currentGame || this.currentGame.status !== GameConstants.GAME_STATUS.PLAYING) {
            throw new Error('El juego no está en progreso');
        }
        
        const isLocalPlayerTurn = this.currentGame.getCurrentPlayer() === this.currentGame.players[0];
        if (!isLocalPlayerTurn) {
            throw new Error('No es tu turno');
        }
        
        const result = await this.multiplayerManager.makeMove(row, col);
        
        if (result.success) {
            return result;
        } else {
            throw new Error(result.error || 'Error al enviar movimiento al servidor');
        }
    }

    // ========== MÉTODO UNIFICADO PARA AMBOS MODOS ==========
    async makeMove(row, col) {
        if (!this.currentGame || this.currentGame.status !== GameConstants.GAME_STATUS.PLAYING) {
            throw new Error('El juego no está en progreso');
        }
        
        if (this.gameMode === GameConstants.GAME_MODES.MULTI) {
            return await this.makeMoveMultiplayer(row, col);
        } else {
            return this.makeMoveSinglePlayer(row, col);
        }
    }

    makeMoveSinglePlayer(row, col) {
        const result = this.currentGame.makeMove(row, col);
        
        this.emit('gameStateChanged', this.currentGame.toJSON());
        
        if (result.gameOver) {
            this.emit('gameEnded', {
                winner: this.currentGame.winner.name,
                moves: this.currentGame.moveHistory.length
            });
        }
        
        if (!result.gameOver && this.currentGame.getCurrentPlayer().isComputer) {
            setTimeout(() => this.makeComputerMove(), 1000);
        }
        
        return result;
    }

    makeComputerMove() {
        if (!this.currentGame || this.currentGame.status !== GameConstants.GAME_STATUS.PLAYING) {
            return;
        }
        
        const currentPlayer = this.currentGame.getCurrentPlayer();
        if (!currentPlayer.isComputer) {
            return;
        }
        
        let row, col;
        let validMove = false;
        let attempts = 0;
        
        while (!validMove && attempts < 100) {
            row = Math.floor(Math.random() * GameConstants.BOARD_SIZE);
            col = Math.floor(Math.random() * GameConstants.BOARD_SIZE);
            
            const opponent = this.currentGame.getOpponent();
            const alreadyHit = opponent.board.hits.some(h => h.row === row && h.col === col);
            const alreadyMissed = opponent.board.misses.some(m => m.row === row && m.col === col);
            
            if (!alreadyHit && !alreadyMissed) {
                validMove = true;
            }
            
            attempts++;
        }
        
        if (validMove) {
            this.makeMoveSinglePlayer(row, col);
        }
    }

    // ========== MÉTODOS DE INICIO ==========
    startGame(playerShips) {
        if (!this.currentGame) {
            throw new Error('No hay juego actual');
        }
        
        if (this.currentGame.players[0]) {
            this.currentGame.players[0].placeShips(playerShips);
        }
        
        if (this.gameMode === GameConstants.GAME_MODES.SINGLE) {
            this.currentGame.startGame();
            this.emit('gameStarted', this.currentGame);
        }
        
        this.emit('gameStateChanged', this.currentGame.toJSON());
        return this.currentGame;
    }

    // ========== MÉTODOS DE UTILIDAD ==========
    getGameState() {
        return this.currentGame ? this.currentGame.toJSON() : null;
    }

    getPlayerNumber() {
        return this.playerNumber;
    }

    isMyTurn() {
        if (!this.currentGame) return false;
        return this.currentGame.getCurrentPlayer() === this.currentGame.players[0];
    }

    restartGame() {
        if (this.multiplayerManager) {
            this.multiplayerManager.stopPolling();
        }
        
        this.currentGame = null;
        this.gameMode = null;
        this.gameId = null;
        this.gameCode = null;
        this.playerId = null;
        this.playerNumber = 1;
        
        this.emit('gameStateChanged', { status: 'idle' });
    }

    cleanup() {
        this.restartGame();
        if (this.multiplayerManager) {
            this.multiplayerManager.cleanup();
        }
    }
}

// =============================================
// CLASE GAME UI (Actualizada para Multiplayer)
// =============================================
class GameUI {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.game = null;
        this.isPlayerTurn = false;
        this.isLocalPlayer = true;
        this.playerNumber = 1;
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.setupGameManagerListeners();
    }

    cacheElements() {
        this.elements = {
            gameScreen: document.getElementById('game-screen'),
            playerBoard: document.getElementById('player-board'),
            opponentBoard: document.getElementById('opponent-board'),
            playerName: document.getElementById('player-name'),
            playerStatus: document.getElementById('player-status'),
            attemptsCount: document.getElementById('attempts-count'),
            shipsSunk: document.getElementById('ships-sunk'),
            gameMessage: document.getElementById('game-message'),
            surrenderBtn: document.getElementById('surrender-btn'),
            rematchBtn: document.getElementById('rematch-btn'),
            roomCodeDisplay: document.getElementById('room-code-display'),
            roomCodeText: document.getElementById('room-code-text'),
            gameRoomCode: document.getElementById('game-room-code'),
            gameRoomCodeText: document.getElementById('game-room-code-text'),
            playerBadge: document.getElementById('player-badge'),
            turnIndicator: document.getElementById('turn-indicator'),
            turnCounter: document.getElementById('turn-counter'),
            gameStatus: document.getElementById('game-status'),
            playerShipsRemaining: document.getElementById('player-ships-remaining'),
            playerHitsTaken: document.getElementById('player-hits-taken'),
            opponentShipsRemaining: document.getElementById('opponent-ships-remaining'),
            playerHitsGiven: document.getElementById('player-hits-given'),
            exitGameBtn: document.getElementById('exit-game-btn'),
            newGameBtn: document.getElementById('new-game-btn')
        };
    }

    bindEvents() {
        this.elements.surrenderBtn?.addEventListener('click', () => this.surrender());
        this.elements.rematchBtn?.addEventListener('click', () => this.requestRematch());
        this.elements.exitGameBtn?.addEventListener('click', () => this.exitGame());
        this.elements.newGameBtn?.addEventListener('click', () => this.newGame());
    }

    setupGameManagerListeners() {
        this.gameManager.on('gameStateChanged', (gameState) => {
            this.updateGameState(gameState);
        });

        this.gameManager.on('gameStarted', (game) => {
            this.game = game;
            this.isPlayerTurn = game.getCurrentPlayer() === game.players[0];
            this.showGameScreen(game);
        });

        this.gameManager.on('gameEnded', (result) => {
            this.showGameOver(result);
        });

        this.gameManager.on('playerJoined', (data) => {
            this.showMessage(`${data.playerName} se ha unido a la partida!`, 'success');
        });

        this.gameManager.on('playerReady', (data) => {
            this.showMessage(`${data.playerName} está listo!`, 'info');
        });
    }

    showGameScreen(game) {
        this.game = game;
        
        document.querySelectorAll('.screen').forEach(screen => {
            screen.style.display = 'none';
        });
        
        this.elements.gameScreen.style.display = 'block';
        
        if (this.gameManager.gameMode === GameConstants.GAME_MODES.MULTI) {
            if (this.elements.gameRoomCode && this.elements.gameRoomCodeText) {
                this.elements.gameRoomCodeText.textContent = this.gameManager.gameCode || this.game.roomCode;
                this.elements.gameRoomCode.style.display = 'block';
            }
            
            if (this.elements.playerBadge) {
                this.elements.playerBadge.textContent = `Jugador ${this.gameManager.playerNumber}`;
                this.elements.playerBadge.className = `player-badge player-${this.gameManager.playerNumber}`;
            }
        }
        
        this.updatePlayerInfo();
        this.renderBoards();
        this.updateGameState();
    }

    updatePlayerInfo() {
        if (!this.game) return;

        const currentPlayer = this.game.getCurrentPlayer();
        const localPlayer = this.game.players[0];
        
        if (this.elements.playerName) {
            this.elements.playerName.textContent = `${localPlayer.name} ${this.gameManager.playerNumber > 1 ? `(Jugador ${this.gameManager.playerNumber})` : ''}`;
        }
        
        if (this.game.status === GameConstants.GAME_STATUS.PLAYING) {
            if (this.gameManager.gameMode === GameConstants.GAME_MODES.SINGLE) {
                this.elements.playerStatus.textContent = this.isPlayerTurn ? 
                    'Es tu turno' : 'Turno de la CPU';
            } else {
                this.elements.playerStatus.textContent = this.isPlayerTurn ? 
                    'Es tu turno' : 'Turno del oponente';
            }
            
            this.elements.playerStatus.style.color = this.isPlayerTurn ? 
                '#00A22B' : '#f44336';
            
            if (this.elements.turnIndicator) {
                this.elements.turnIndicator.className = `turn-indicator ${this.isPlayerTurn ? 'turn-yours' : 'turn-opponent'}`;
                this.elements.turnIndicator.style.display = 'block';
            }
        } else if (this.game.status === GameConstants.GAME_STATUS.FINISHED) {
            this.elements.playerStatus.textContent = this.game.winner ? 
                `¡${this.game.winner.name} gana!` : 'Juego terminado';
        } else if (this.game.status === GameConstants.GAME_STATUS.WAITING) {
            this.elements.playerStatus.textContent = 'Esperando oponente...';
            this.elements.playerStatus.style.color = '#FFA500';
        } else if (this.game.status === GameConstants.GAME_STATUS.SETUP) {
            this.elements.playerStatus.textContent = 'Colocando barcos...';
            this.elements.playerStatus.style.color = '#2196F3';
        }
    }

    renderBoards() {
        if (!this.game) return;

        this.elements.playerBoard.innerHTML = '';
        this.elements.opponentBoard.innerHTML = '';

        const player = this.game.players[0];
        const opponent = this.game.players[1];

        this.renderBoard(this.elements.playerBoard, player.board, false);
        this.renderBoard(this.elements.opponentBoard, player.attackBoard, true);
        
        this.updateBoardStats(player, opponent);
    }

    renderBoard(container, board, isClickable = false) {
        for (let row = 0; row < GameConstants.BOARD_SIZE; row++) {
            for (let col = 0; col < GameConstants.BOARD_SIZE; col++) {
                const cell = document.createElement('div');
                cell.className = 'board-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                const isHit = board.hits.some(h => h.row === row && h.col === col);
                const isMiss = board.misses.some(m => m.row === row && m.col === col);
                const hasShip = board.grid[row][col] !== null;

                if (isHit) {
                    cell.classList.add('hit');
                    cell.textContent = '✕';
                } else if (isMiss) {
                    cell.classList.add('miss');
                    cell.textContent = '•';
                } else if (hasShip && !isClickable) {
                    cell.classList.add('ship');
                }

                if (isClickable && this.isPlayerTurn && this.game.status === GameConstants.GAME_STATUS.PLAYING) {
                    cell.addEventListener('click', () => this.handleCellClick(row, col));
                    cell.style.cursor = 'pointer';
                } else {
                    cell.classList.add('disabled');
                    cell.style.cursor = 'not-allowed';
                }

                container.appendChild(cell);
            }
        }
    }
    
    updateBoardStats(player, opponent) {
        if (this.elements.playerShipsRemaining) {
            this.elements.playerShipsRemaining.textContent = player.board.getRemainingShips().length;
        }
        
        if (this.elements.playerHitsTaken) {
            this.elements.playerHitsTaken.textContent = player.board.hits.length;
        }
        
        if (this.elements.opponentShipsRemaining) {
            this.elements.opponentShipsRemaining.textContent = opponent.board.getRemainingShips().length;
        }
        
        if (this.elements.playerHitsGiven) {
            this.elements.playerHitsGiven.textContent = player.attackBoard.hits.length;
        }
    }

    async handleCellClick(row, col) {
        if (!this.isPlayerTurn || this.game.status !== GameConstants.GAME_STATUS.PLAYING) {
            return;
        }

        try {
            const result = await this.gameManager.makeMove(row, col);
            
            this.updateGameState();
            this.renderBoards();
            
            this.showMessage(this.getAttackMessage(result), 
                result.result === GameConstants.ATTACK_RESULT.MISS ? 'error' : 'success');

            if (result.gameOver) {
                this.showGameOver();
            }

        } catch (error) {
            console.error('Error al procesar el ataque:', error);
            this.showMessage(error.message, 'error');
        }
    }

    getAttackMessage(result) {
        switch (result.result) {
            case GameConstants.ATTACK_RESULT.HIT:
                return `¡Impacto en ${result.ship.name}!`;
            case GameConstants.ATTACK_RESULT.SUNK:
                return `¡Hundiste el ${result.ship.name}!`;
            case GameConstants.ATTACK_RESULT.MISS:
                return 'Agua...';
            case GameConstants.ATTACK_RESULT.ALREADY_HIT:
                return 'Ya atacaste esta posición';
            default:
                return 'Ataque realizado';
        }
    }

    showMessage(text, type = 'info') {
        const messageEl = this.elements.gameMessage;
        if (!messageEl) return;
        
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        
        if (type !== 'error') {
            setTimeout(() => {
                messageEl.textContent = '';
                messageEl.className = 'message';
            }, 3000);
        }
    }

    updateGameState(gameState = null) {
        if (!this.game && gameState) {
            // Podría venir del polling
        }
        
        if (!this.game) return;

        const player = this.game.players[0];
        const opponent = this.game.players[1];
        
        const shipsSunk = opponent.board.ships.filter(ship => ship.sunk).length;
        const totalShips = opponent.board.ships.length;
        
        if (this.elements.shipsSunk) {
            this.elements.shipsSunk.textContent = `${shipsSunk}/${totalShips}`;
        }
        
        if (this.elements.attemptsCount) {
            this.elements.attemptsCount.textContent = this.game.moveHistory.length;
        }
        
        if (this.elements.turnCounter) {
            this.elements.turnCounter.textContent = this.game.turnCounter;
        }
        
        if (this.elements.gameStatus) {
            this.elements.gameStatus.textContent = this.getStatusText(this.game.status);
        }

        this.isPlayerTurn = this.game.getCurrentPlayer() === player;
        this.updatePlayerInfo();
        
        if (this.game.status === GameConstants.GAME_STATUS.FINISHED) {
            if (this.elements.rematchBtn) this.elements.rematchBtn.style.display = 'block';
            if (this.elements.surrenderBtn) this.elements.surrenderBtn.style.display = 'none';
            if (this.elements.newGameBtn) this.elements.newGameBtn.style.display = 'block';
        } else {
            if (this.elements.rematchBtn) this.elements.rematchBtn.style.display = 'none';
            if (this.elements.surrenderBtn) this.elements.surrenderBtn.style.display = 'block';
            if (this.elements.newGameBtn) this.elements.newGameBtn.style.display = 'none';
        }
    }
    
    getStatusText(status) {
        const statusMap = {
            [GameConstants.GAME_STATUS.WAITING]: 'Esperando',
            [GameConstants.GAME_STATUS.SETUP]: 'Preparando',
            [GameConstants.GAME_STATUS.PLAYING]: 'En juego',
            [GameConstants.GAME_STATUS.FINISHED]: 'Terminado'
        };
        return statusMap[status] || 'Desconocido';
    }

    showGameOver(result = null) {
        if (this.game && this.game.winner) {
            const message = this.game.winner === this.game.players[0] ?
                '¡Felicidades! ¡Has ganado!' :
                '¡Has perdido! Mejor suerte la próxima vez';
            
            this.showMessage(message, this.game.winner === this.game.players[0] ? 'success' : 'error');
        } else if (result) {
            this.showMessage(`¡Juego terminado! Ganador: ${result.winner}`, 'success');
        }
    }

    surrender() {
        if (confirm('¿Estás seguro de que quieres rendirte?')) {
            this.showMessage('Te has rendido', 'error');
            this.gameManager.restartGame();
            showScreen('lobby');
        }
    }

    exitGame() {
        if (confirm('¿Estás seguro de que quieres salir del juego?')) {
            this.gameManager.restartGame();
            showScreen('lobby');
        }
    }

    newGame() {
        this.gameManager.restartGame();
        showScreen('lobby');
    }

    requestRematch() {
        this.showMessage('Solicitando revancha...', 'info');
    }

    setPlayerNumber(number) {
        this.playerNumber = number;
        this.isLocalPlayer = true;
    }
}

// =============================================
// CLASE SETUP UI (Actualizada para Multiplayer)
// =============================================
class SetupUI {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.orientation = 'horizontal';
        this.placedShips = [];
        this.draggingShip = null;
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
    }

    cacheElements() {
        this.elements = {
            setupScreen: document.getElementById('setup-screen'),
            shipsPool: document.getElementById('ships-pool'),
            setupBoard: document.getElementById('setup-board'),
            toggleOrientationBtn: document.getElementById('toggle-orientation-btn'),
            randomPlaceBtn: document.getElementById('random-place-btn'),
            clearShipsBtn: document.getElementById('clear-ships-btn'),
            startGameBtn: document.getElementById('start-game-btn'),
            orientationText: document.getElementById('orientation-text'),
            startGameText: document.getElementById('start-game-text'),
            setupProgress: document.getElementById('setup-progress'),
            shipsPlacedCount: document.getElementById('ships-placed-count'),
            roomCodeInfo: document.getElementById('room-code-info'),
            waitingMessage: document.getElementById('waiting-message'),
            opponentInfo: document.getElementById('opponent-info'),
            opponentName: document.getElementById('opponent-name'),
            opponentReadyStatus: document.getElementById('opponent-ready-status'),
            playerReadyStatus: document.getElementById('player-ready-status'),
            cancelSetupBtn: document.getElementById('cancel-setup-btn'),
            connectionStatusIndicator: document.getElementById('connection-status-indicator'),
            connectionStatusText: document.getElementById('connection-status-text'),
            roomCodeDisplay: document.getElementById('room-code-display'),
            roomCodeText: document.getElementById('room-code-text'),
            copyRoomCodeBtn: document.getElementById('copy-room-code-btn')
        };
    }

    bindEvents() {
        this.elements.toggleOrientationBtn?.addEventListener('click', () => this.toggleOrientation());
        this.elements.randomPlaceBtn?.addEventListener('click', () => this.placeShipsRandomly());
        this.elements.clearShipsBtn?.addEventListener('click', () => this.clearAllShips());
        this.elements.startGameBtn?.addEventListener('click', () => this.startGame());
        this.elements.cancelSetupBtn?.addEventListener('click', () => this.cancelSetup());
        this.elements.copyRoomCodeBtn?.addEventListener('click', () => this.copyRoomCode());
    }

    showSetupScreen(gameMode = 'single') {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.style.display = 'none';
        });
        
        this.elements.setupScreen.style.display = 'block';
        
        if (gameMode === 'multi') {
            const game = this.gameManager.currentGame;
            if (game) {
                if (this.elements.roomCodeText) {
                    this.elements.roomCodeText.textContent = this.gameManager.gameCode || game.roomCode;
                }
                
                if (this.elements.roomCodeDisplay) {
                    this.elements.roomCodeDisplay.style.display = 'block';
                }
                
                if (this.elements.opponentInfo) {
                    const opponent = game.players[1];
                    if (this.elements.opponentName) {
                        this.elements.opponentName.textContent = opponent.name;
                    }
                    this.elements.opponentInfo.style.display = 'block';
                }
                
                if (game.players[1].ready && this.elements.opponentReadyStatus) {
                    this.elements.opponentReadyStatus.style.display = 'block';
                }
            }
        } else {
            if (this.elements.roomCodeDisplay) this.elements.roomCodeDisplay.style.display = 'none';
            if (this.elements.opponentInfo) this.elements.opponentInfo.style.display = 'none';
            if (this.elements.waitingMessage) this.elements.waitingMessage.style.display = 'none';
        }
        
        this.initializeShipSetup();
    }

    initializeShipSetup() {
        if (!this.elements.shipsPool || !this.elements.setupBoard) return;
        
        this.elements.shipsPool.innerHTML = '';
        this.elements.setupBoard.innerHTML = '';
        this.placedShips = [];

        GameConstants.SHIPS.forEach(shipConfig => {
            const shipElement = document.createElement('div');
            shipElement.className = 'ship-to-place';
            shipElement.textContent = `${shipConfig.name} (${shipConfig.size})`;
            shipElement.dataset.id = shipConfig.id;
            shipElement.dataset.size = shipConfig.size;
            shipElement.dataset.name = shipConfig.name;
            shipElement.draggable = true;

            shipElement.addEventListener('dragstart', (e) => {
                this.draggingShip = {
                    id: shipConfig.id,
                    size: shipConfig.size,
                    name: shipConfig.name
                };
                shipElement.classList.add('dragging');
            });

            shipElement.addEventListener('dragend', () => {
                this.draggingShip = null;
                shipElement.classList.remove('dragging');
            });

            this.elements.shipsPool.appendChild(shipElement);
        });

        for (let row = 0; row < GameConstants.BOARD_SIZE; row++) {
            for (let col = 0; col < GameConstants.BOARD_SIZE; col++) {
                const cell = document.createElement('div');
                cell.className = 'setup-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                cell.addEventListener('dragover', (e) => this.handleDragOver(e, row, col));
                cell.addEventListener('dragleave', (e) => this.handleDragLeave(e));
                cell.addEventListener('drop', (e) => this.handleDrop(e, row, col));

                this.elements.setupBoard.appendChild(cell);
            }
        }

        this.updateStartButton();
    }

    toggleOrientation() {
        this.orientation = this.orientation === 'horizontal' ? 'vertical' : 'horizontal';
        if (this.elements.orientationText) {
            this.elements.orientationText.textContent = this.orientation === 'horizontal' ? 'Horizontal' : 'Vertical';
        }
    }

    handleDragOver(e, row, col) {
        e.preventDefault();
        if (!this.draggingShip) return;

        this.clearDropHighlights();

        if (this.canPlaceShipAt(row, col, this.draggingShip.size, this.orientation)) {
            this.highlightValidCells(row, col, this.draggingShip.size, this.orientation);
        } else {
            this.highlightInvalidCells(row, col, this.draggingShip.size, this.orientation);
        }
    }

    handleDragLeave(e) {
        e.target.classList.remove('valid-drop', 'invalid-drop');
    }

    handleDrop(e, row, col) {
        e.preventDefault();
        if (!this.draggingShip) return;

        if (this.canPlaceShipAt(row, col, this.draggingShip.size, this.orientation)) {
            this.placeShip(row, col, this.draggingShip, this.orientation);
        }

        this.clearDropHighlights();
        this.updateStartButton();
    }

    canPlaceShipAt(startRow, startCol, size, orientation) {
        if (orientation === 'horizontal') {
            if (startCol + size > GameConstants.BOARD_SIZE) return false;
            for (let i = 0; i < size; i++) {
                if (this.isCellOccupied(startRow, startCol + i)) return false;
            }
        } else {
            if (startRow + size > GameConstants.BOARD_SIZE) return false;
            for (let i = 0; i < size; i++) {
                if (this.isCellOccupied(startRow + i, startCol)) return false;
            }
        }
        return true;
    }

    isCellOccupied(row, col) {
        return this.placedShips.some(ship => 
            ship.positions.some(pos => pos.row === row && pos.col === col)
        );
    }

    highlightValidCells(startRow, startCol, size, orientation) {
        if (orientation === 'horizontal') {
            for (let i = 0; i < size; i++) {
                const cell = this.getCellElement(startRow, startCol + i);
                if (cell) cell.classList.add('valid-drop');
            }
        } else {
            for (let i = 0; i < size; i++) {
                const cell = this.getCellElement(startRow + i, startCol);
                if (cell) cell.classList.add('valid-drop');
            }
        }
    }

    highlightInvalidCells(startRow, startCol, size, orientation) {
        if (orientation === 'horizontal') {
            for (let i = 0; i < size; i++) {
                const cell = this.getCellElement(startRow, startCol + i);
                if (cell) cell.classList.add('invalid-drop');
            }
        } else {
            for (let i = 0; i < size; i++) {
                const cell = this.getCellElement(startRow + i, startCol);
                if (cell) cell.classList.add('invalid-drop');
            }
        }
    }

    clearDropHighlights() {
        document.querySelectorAll('.setup-cell').forEach(cell => {
            cell.classList.remove('valid-drop', 'invalid-drop');
        });
    }

    getCellElement(row, col) {
        return document.querySelector(`.setup-cell[data-row="${row}"][data-col="${col}"]`);
    }

    placeShip(startRow, startCol, shipData, orientation) {
        const positions = [];
        
        if (orientation === 'horizontal') {
            for (let i = 0; i < shipData.size; i++) {
                positions.push({ row: startRow, col: startCol + i });
            }
        } else {
            for (let i = 0; i < shipData.size; i++) {
                positions.push({ row: startRow + i, col: startCol });
            }
        }

        this.placedShips.push({
            id: shipData.id,
            size: shipData.size,
            name: shipData.name,
            positions: positions,
            orientation: orientation
        });

        positions.forEach(pos => {
            const cell = this.getCellElement(pos.row, pos.col);
            if (cell) {
                cell.classList.add('has-ship');
                cell.textContent = '⛵';
            }
        });

        const shipElement = document.querySelector(`.ship-to-place[data-id="${shipData.id}"]`);
        if (shipElement) {
            shipElement.classList.add('placed');
            shipElement.draggable = false;
        }
    }

    placeShipsRandomly() {
        this.clearAllShips();

        const board = new Board();
        const tempPlayer = new Player('Temp');
        tempPlayer.placeShipsRandomly();

        tempPlayer.board.ships.forEach(ship => {
            const shipConfig = GameConstants.SHIPS.find(s => s.name === ship.name);
            if (shipConfig) {
                const startPos = ship.positions[0];
                this.placeShip(startPos.row, startPos.col, shipConfig, ship.orientation);
            }
        });

        this.updateStartButton();
    }

    clearAllShips() {
        this.placedShips = [];
        
        document.querySelectorAll('.setup-cell').forEach(cell => {
            cell.classList.remove('has-ship');
            cell.textContent = '';
        });
        
        document.querySelectorAll('.ship-to-place').forEach(ship => {
            ship.classList.remove('placed');
            ship.draggable = true;
        });
        
        this.updateStartButton();
    }

    updateStartButton() {
        const allShipsPlaced = GameConstants.SHIPS.length === this.placedShips.length;
        if (this.elements.startGameBtn) {
            this.elements.startGameBtn.disabled = !allShipsPlaced;
        }
        
        if (this.elements.setupProgress) {
            this.elements.setupProgress.style.width = `${(this.placedShips.length / GameConstants.SHIPS.length) * 100}%`;
        }
        
        if (this.elements.shipsPlacedCount) {
            this.elements.shipsPlacedCount.textContent = `${this.placedShips.length}/${GameConstants.SHIPS.length} barcos colocados`;
        }
        
        if (window.currentGameMode === 'multi' && this.elements.startGameText) {
            this.elements.startGameText.textContent = 'Listo para Jugar';
        } else if (this.elements.startGameText) {
            this.elements.startGameText.textContent = 'Iniciar Batalla';
        }
    }

    getShipPlacements() {
        return this.placedShips.map(ship => ({
            shipId: ship.id,
            startRow: ship.positions[0].row,
            startCol: ship.positions[0].col,
            orientation: ship.orientation
        }));
    }

    showWaitingMessage(message) {
        if (this.elements.waitingMessage) {
            this.elements.waitingMessage.textContent = message;
            this.elements.waitingMessage.style.display = 'block';
        }
    }
    
    copyRoomCode() {
        const roomCode = this.elements.roomCodeText?.textContent;
        if (roomCode && roomCode !== 'Cargando...') {
            navigator.clipboard.writeText(roomCode).then(() => {
                if (window.showToast) {
                    window.showToast('Código copiado al portapapeles', 'success');
                }
            });
        }
    }

    async startGame() {
        const shipPlacements = this.getShipPlacements();
        
        if (window.currentGameMode === 'single') {
            const game = this.gameManager.startGame(shipPlacements);
            if (game && window.gameUI) {
                window.gameUI.showGameScreen(game);
            }
        } else if (window.currentGameMode === 'multi') {
            try {
                const result = await this.gameManager.placeShipsMultiplayer(shipPlacements);
                
                if (result.success) {
                    if (this.elements.playerReadyStatus) {
                        this.elements.playerReadyStatus.style.display = 'block';
                    }
                    
                    this.showWaitingMessage('Esperando a que el oponente coloque sus barcos...');
                    
                } else {
                    console.error('Error al iniciar juego multijugador:', result.error);
                    if (window.showToast) {
                        window.showToast(`Error: ${result.error}`, 'error');
                    }
                }
                
            } catch (error) {
                console.error('Error al iniciar juego multijugador:', error);
                if (window.showToast) {
                    window.showToast(`Error: ${error.message}`, 'error');
                }
            }
        }
    }
    
    cancelSetup() {
        if (window.currentGameMode === 'multi') {
            if (confirm('¿Estás seguro de que quieres salir? Esto cancelará la partida multijugador.')) {
                this.gameManager.restartGame();
                showScreen('lobby');
            }
        } else {
            this.gameManager.restartGame();
            showScreen('lobby');
        }
    }
}

// =============================================
// FUNCIONES GLOBALES
// =============================================
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    
    const screenElement = document.getElementById(`${screenName}-screen`);
    if (screenElement) {
        screenElement.style.display = 'block';
    }
}

// =============================================
// INICIALIZACIÓN DE LA APLICACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Battleship App cargada');
    
    // Inicializar GameManager
    const gameManager = new GameManager();
    const gameUI = new GameUI(gameManager);
    const setupUI = new SetupUI(gameManager);
    
    // Guardar referencias globales
    window.gameManager = gameManager;
    window.gameUI = gameUI;
    window.setupUI = setupUI;
    window.showScreen = showScreen;
    window.GameConstants = GameConstants;
    
    // Mostrar pantalla de lobby
    showScreen('lobby');
    
    // Configurar event listeners de navegación
    document.getElementById('create-game-btn')?.addEventListener('click', () => {
        const playerName = document.getElementById('player-name-input')?.value.trim() || 'Jugador';
        window.currentGameMode = 'multi';
        
        if (window.gameManager && window.setupUI) {
            gameManager.createMultiplayerGame(playerName).then(result => {
                if (result.success) {
                    setupUI.showSetupScreen('multi');
                    if (window.showToast) {
                        window.showToast(`¡Sala creada! Código: ${result.gameCode}`, 'success', 5000);
                    }
                } else {
                    console.error('Error al crear juego:', result.error);
                    if (window.showToast) {
                        window.showToast(`Error: ${result.error}`, 'error');
                    }
                }
            }).catch(error => {
                console.error('Error:', error);
                if (window.showToast) {
                    window.showToast(`Error: ${error.message}`, 'error');
                }
            });
        }
    });
    
    document.getElementById('join-game-btn')?.addEventListener('click', () => {
        const codeSection = document.getElementById('join-section');
        if (codeSection) {
            codeSection.style.display = codeSection.style.display === 'none' ? 'block' : 'none';
        }
    });
    
    document.getElementById('single-player-btn')?.addEventListener('click', () => {
        const playerName = document.getElementById('player-name-input')?.value.trim() || 'Jugador';
        window.currentGameMode = 'single';
        gameManager.startSinglePlayer(playerName);
        setupUI.showSetupScreen('single');
    });
    
    document.getElementById('join-with-code-btn')?.addEventListener('click', async () => {
        const playerName = document.getElementById('player-name-input')?.value.trim() || 'Jugador';
        const gameCode = document.getElementById('game-code-input')?.value.trim().toUpperCase();
        
        if (!gameCode) {
            if (window.showToast) {
                window.showToast('Por favor ingresa un código de partida', 'error');
            }
            return;
        }
        
        window.currentGameMode = 'multi';
        
        try {
            const result = await gameManager.joinMultiplayerGame(gameCode, playerName);
            
            if (result.success) {
                setupUI.showSetupScreen('multi');
                if (window.showToast) {
                    window.showToast(`¡Unido a la sala ${gameCode}!`, 'success');
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error al unirse:', error);
            if (window.showToast) {
                window.showToast(`Error: ${error.message}`, 'error');
            }
        }
    });
    
    document.getElementById('game-code-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('join-with-code-btn')?.click();
        }
    });
});

// Estilos adicionales
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    @keyframes pulse {
        0% { opacity: 0.5; }
        50% { opacity: 1; }
        100% { opacity: 0.5; }
    }
    
    .global-message {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    }
    
    .status-indicator {
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 8px;
    }
    
    .status-connecting { background: #FFA500; animation: pulse 1.5s infinite; }
    .status-waiting { background: #2196F3; animation: pulse 2s infinite; }
    .status-ready { background: #4CAF50; }
    .status-error { background: #F44336; }
    
    .player-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: bold;
        margin-left: 10px;
    }
    
    .player-badge.player-1 { background: #2196F3; color: white; }
    .player-badge.player-2 { background: #FF9800; color: white; }
    
    .turn-indicator {
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: bold;
        margin: 5px;
        display: inline-block;
    }
    
    .turn-yours {
        background: rgba(76, 175, 80, 0.3);
        color: #4CAF50;
        border: 2px solid #4CAF50;
    }
    
    .turn-opponent {
        background: rgba(244, 67, 54, 0.3);
        color: #F44336;
        border: 2px solid #F44336;
    }
    
    .room-code-display {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 53, 102, 0.9);
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        font-weight: bold;
        font-size: 1.2rem;
        letter-spacing: 2px;
        z-index: 1000;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .copy-code-btn {
        background: #2196F3;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 0.9rem;
        margin-left: 10px;
        transition: background 0.3s;
    }
    
    .copy-code-btn:hover { background: #0b7dda; }
    .copy-code-btn:active { transform: scale(0.98); }
    
    .progress-bar {
        width: 100%;
        height: 10px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 5px;
        margin: 10px 0;
        overflow: hidden;
    }
    
    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #4CAF50, #8BC34A);
        transition: width 0.3s ease;
    }
    
    @media (max-width: 768px) {
        .room-code-display {
            position: static;
            margin: 10px auto;
            width: fit-content;
            display: block;
        }
        
        .game-header {
            flex-direction: column;
            text-align: center;
            gap: 10px;
        }
    }
`;
document.head.appendChild(style);