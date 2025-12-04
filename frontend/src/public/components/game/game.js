
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
    }
};

// =============================================
// CLASE SHIP
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
    }

    generateGameId() {
        return 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

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
            players: this.players.map(p => ({
                name: p.name,
                ready: p.ready,
                shipsRemaining: p.board.getRemainingShips().length
            })),
            currentPlayer: this.getCurrentPlayer().name,
            status: this.status,
            turnCounter: this.turnCounter,
            winner: this.winner ? this.winner.name : null
        };
    }
}


class GameManager {
    constructor() {
        this.currentGame = null;
        this.playerName = 'Jugador';
        this.playerId = null;
        this.gameMode = null;
        this.listeners = {};
        this.isConnected = false;
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

    startSinglePlayer() {
        const humanPlayer = new Player(this.playerName);
        const computerPlayer = new Player('CPU', true);
        
        this.currentGame = new Game(humanPlayer, computerPlayer, GameConstants.GAME_MODES.SINGLE);
        this.gameMode = GameConstants.GAME_MODES.SINGLE;
        
        computerPlayer.placeShipsRandomly();
        
        this.emit('gameStateChanged', this.currentGame.toJSON());
        return this.currentGame;
    }

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
        
        return this.currentGame;
    }

    makeMove(row, col) {
        if (!this.currentGame || this.currentGame.status !== GameConstants.GAME_STATUS.PLAYING) {
            throw new Error('El juego no está en progreso');
        }
        
        const result = this.currentGame.makeMove(row, col);
        
        this.emit('gameStateChanged', this.currentGame.toJSON());
        
        if (result.gameOver) {
            this.emit('gameEnded', {
                winner: this.currentGame.winner.name,
                moves: this.currentGame.moveHistory.length
            });
        }
        
        return result;
    }

    restartGame() {
        this.currentGame = null;
        this.gameMode = null;
        this.emit('gameStateChanged', { status: 'idle' });
    }

    getGameState() {
        return this.currentGame ? this.currentGame.toJSON() : null;
    }
}


class GameUI {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.game = null;
        this.isPlayerTurn = false;
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
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
            rematchBtn: document.getElementById('rematch-btn')
        };
    }

    bindEvents() {
        this.elements.surrenderBtn.addEventListener('click', () => this.surrender());
        this.elements.rematchBtn.addEventListener('click', () => this.requestRematch());
    }

    showGameScreen(game) {
        this.game = game;
        
        // Ocultar otras pantallas
        document.querySelectorAll('.screen').forEach(screen => {
            screen.style.display = 'none';
        });
        
        this.elements.gameScreen.style.display = 'block';
        
        this.updatePlayerInfo();
        this.renderBoards();
        this.updateGameState();
    }

    updatePlayerInfo() {
        if (!this.game) return;

        const currentPlayer = this.game.getCurrentPlayer();
        this.elements.playerName.textContent = currentPlayer.name;
        
        if (this.game.status === GameConstants.GAME_STATUS.PLAYING) {
            this.elements.playerStatus.textContent = this.isPlayerTurn ? 
                'Es tu turno' : 'Turno del oponente';
            this.elements.playerStatus.style.color = this.isPlayerTurn ? 
                '#00A22B' : '#f44336';
        } else if (this.game.status === GameConstants.GAME_STATUS.FINISHED) {
            this.elements.playerStatus.textContent = this.game.winner ? 
                `¡${this.game.winner.name} gana!` : 'Juego terminado';
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
                } else {
                    cell.classList.add('disabled');
                }

                container.appendChild(cell);
            }
        }
    }

    async handleCellClick(row, col) {
        if (!this.isPlayerTurn || this.game.status !== GameConstants.GAME_STATUS.PLAYING) {
            return;
        }

        try {
            const result = this.gameManager.makeMove(row, col);
            
            this.updateGameState();
            this.renderBoards();
            
            this.showMessage(this.getAttackMessage(result), 
                result.result === GameConstants.ATTACK_RESULT.MISS ? 'error' : 'success');

            if (result.gameOver) {
                this.showGameOver();
            }

        } catch (error) {
            console.error('Error al procesar el ataque:', error);
            this.showMessage('Error al procesar el ataque', 'error');
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
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        
        if (type !== 'error') {
            setTimeout(() => {
                messageEl.textContent = '';
                messageEl.className = 'message';
            }, 3000);
        }
    }

    updateGameState() {
        if (!this.game) return;

        const player = this.game.players[0];
        const opponent = this.game.players[1];
        
        const shipsSunk = opponent.board.ships.filter(ship => ship.sunk).length;
        const totalShips = opponent.board.ships.length;
        
        this.elements.shipsSunk.textContent = `${shipsSunk}/${totalShips}`;
        this.elements.attemptsCount.textContent = this.game.moveHistory.length;

        this.isPlayerTurn = this.game.getCurrentPlayer() === player;
        this.updatePlayerInfo();
        
        if (this.game.status === GameConstants.GAME_STATUS.FINISHED) {
            this.elements.rematchBtn.style.display = 'block';
            this.elements.surrenderBtn.style.display = 'none';
        } else {
            this.elements.rematchBtn.style.display = 'none';
            this.elements.surrenderBtn.style.display = 'block';
        }
    }

    showGameOver() {
        if (this.game && this.game.winner) {
            const message = this.game.winner === this.game.players[0] ?
                '¡Felicidades! ¡Has ganado!' :
                '¡Has perdido! Mejor suerte la próxima vez';
            
            this.showMessage(message, this.game.winner === this.game.players[0] ? 'success' : 'error');
        }
    }

    surrender() {
        if (confirm('¿Estás seguro de que quieres rendirte?')) {
            this.showMessage('Te has rendido', 'error');
            showScreen('lobby');
        }
    }

    requestRematch() {
        this.showMessage('Solicitando revancha...', 'info');
    }
}


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
            startGameBtn: document.getElementById('start-game-btn')
        };
    }

    bindEvents() {
        this.elements.toggleOrientationBtn.addEventListener('click', () => this.toggleOrientation());
        this.elements.randomPlaceBtn.addEventListener('click', () => this.placeShipsRandomly());
        this.elements.clearShipsBtn.addEventListener('click', () => this.clearAllShips());
        this.elements.startGameBtn.addEventListener('click', () => this.startGame());
    }

    showSetupScreen() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.style.display = 'none';
        });
        this.elements.setupScreen.style.display = 'block';
        this.initializeShipSetup();
    }

    initializeShipSetup() {
        this.elements.shipsPool.innerHTML = '';
        this.elements.setupBoard.innerHTML = '';
        this.placedShips = [];

        //
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

        // Crear tablero 10x10
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
        this.elements.toggleOrientationBtn.textContent = 
            `Orientación: ${this.orientation === 'horizontal' ? 'Horizontal' : 'Vertical'}`;
    }

    handleDragOver(e, row, col) {
        e.preventDefault();
        if (!this.draggingShip) return;

        // Limpiar highlights previos
        this.clearDropHighlights();

        // Verificar si se puede colocar el barco
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

        // 
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

        //
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
        
        // LimpiaaMOOS visualmente
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
        this.elements.startGameBtn.disabled = !allShipsPlaced;
    }

    getShipPlacements() {
        return this.placedShips.map(ship => ({
            shipId: ship.id,
            startRow: ship.positions[0].row,
            startCol: ship.positions[0].col,
            orientation: ship.orientation
        }));
    }

    startGame() {
        const shipPlacements = this.getShipPlacements();
        
        if (window.currentGameMode === 'single') {
            const game = window.gameManager.startGame(shipPlacements);
            if (game && window.gameUI) {
                window.gameUI.showGameScreen(game);
            }
        }
        
    }
}


class LobbyUI {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    showLobbyScreen() {
        showScreen('lobby');
    }
}


function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    
    const screenElement = document.getElementById(`${screenName}-screen`);
    if (screenElement) {
        screenElement.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Battleship App cargada');
    
    // Inicializar GameManager
    const gameManager = new GameManager();
    const gameUI = new GameUI(gameManager);
    const setupUI = new SetupUI(gameManager);
    const lobbyUI = new LobbyUI(gameManager);
    
    // Guardar referencias globales
    window.gameManager = gameManager;
    window.gameUI = gameUI;
    window.setupUI = setupUI;
    window.lobbyUI = lobbyUI;
    window.showScreen = showScreen;
    
    // Mostrar pantalla de lobby
    showScreen('lobby');
    
    // Configurar event listeners de navegación
    document.getElementById('create-game-btn')?.addEventListener('click', () => {
        console.log('Crear partida multiplayer (no implementado aún)');
        window.currentGameMode = 'multi';
        setupUI.showSetupScreen();
    });
    
    document.getElementById('join-game-btn')?.addEventListener('click', () => {
        const codeSection = document.getElementById('game-code-section');
        if (codeSection) {
            codeSection.style.display = codeSection.style.display === 'none' ? 'block' : 'none';
        }
    });
    
    document.getElementById('single-player-btn')?.addEventListener('click', () => {
        console.log('Iniciar modo single player');
        window.currentGameMode = 'single';
        gameManager.startSinglePlayer();
        setupUI.showSetupScreen();
    });
    
    document.getElementById('join-with-code-btn')?.addEventListener('click', () => {
        const codeInput = document.getElementById('game-code-input');
        if (codeInput && codeInput.value.trim()) {
            console.log('Unirse con código:', codeInput.value);
            window.currentGameMode = 'multi';
            setupUI.showSetupScreen();
        }
    });
});

// los neuevos estilos en caso de cambios 

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
    .global-message {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    }
`;
document.head.appendChild(style);