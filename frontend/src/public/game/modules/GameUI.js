import { GameConstants } from './constants.js';

// =============================================
// GAME UI CLASS
// =============================================
export class GameUI {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.game = null;
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
            newGameBtn: document.getElementById('new-game-btn'),
            turnCounter: document.getElementById('turn-counter'),
            gameStatus: document.getElementById('game-status'),
            playerShipsRemaining: document.getElementById('player-ships-remaining'),
            playerHitsTaken: document.getElementById('player-hits-taken'),
            opponentShipsRemaining: document.getElementById('opponent-ships-remaining'),
            playerHitsGiven: document.getElementById('player-hits-given')
        };
    }

    bindEvents() {
        this.elements.surrenderBtn?.addEventListener('click', () => this.surrender());
        this.elements.newGameBtn?.addEventListener('click', () => this.newGame());
    }

    initializeGame() {
        this.game = this.gameManager.currentGame;
        this.updatePlayerInfo();
        this.updateGameState();
    }

    showGameScreen(game) {
        this.game = game;
        
        // Hide setup screen, show game screen
        document.getElementById('setup-screen').style.display = 'none';
        this.elements.gameScreen.style.display = 'block';
        
        this.updatePlayerInfo();
        this.renderBoards();
        this.updateGameState();
    }

    updatePlayerInfo() {
        if (!this.game) return;

        const localPlayer = this.game.players[0];
        const isPlayerTurn = this.game.getCurrentPlayer() === localPlayer;
        
        if (this.elements.playerName) {
            this.elements.playerName.textContent = localPlayer.name;
        }
        
        if (this.game.status === GameConstants.GAME_STATUS.PLAYING) {
            this.elements.playerStatus.textContent = isPlayerTurn ? 
                'Es tu turno' : 'Turno del oponente';
            this.elements.playerStatus.style.color = isPlayerTurn ? 
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
        
        this.updateBoardStats(player, opponent);
    }

    renderBoard(container, board, isClickable = false) {
        const isPlayerTurn = this.game && this.game.getCurrentPlayer() === this.game.players[0];
        
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

                if (isClickable && isPlayerTurn && this.game.status === GameConstants.GAME_STATUS.PLAYING) {
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

    handleCellClick(row, col) {
        // Check if multiplayer and if it's your turn
        if (this.gameManager.multiplayerManager) {
            this.handleMultiplayerAttack(row, col);
            return;
        }
        
        // Fallback to local game (shouldn't happen)
        const isPlayerTurn = this.game.getCurrentPlayer() === this.game.players[0];
        if (!isPlayerTurn || this.game.status !== GameConstants.GAME_STATUS.PLAYING) {
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
            this.showMessage(error.message, 'error');
        }
    }

    async handleMultiplayerAttack(row, col) {
        try {
            this.showMessage('Atacando...', 'info');
            
            const result = await this.gameManager.makeMove(row, col);
            
            this.renderBoards();
            
            // Show attack result
            let message = '';
            if (result.result === 'miss') {
                message = 'Agua...';
            } else if (result.result === 'hit') {
                message = '¡Impacto!';
            } else if (result.result === 'sunk') {
                message = `¡Hundiste el ${result.sunkShip}!`;
            }
            
            this.showMessage(message, result.result === 'miss' ? 'error' : 'success');

            if (result.gameOver) {
                this.showGameOver(result.winner === this.gameManager.multiplayerManager.playerNumber);
            } else {
                // Update turn status
                setTimeout(() => {
                    this.showMessage('Turno del oponente...', 'info');
                }, 1500);
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

    updateGameState() {
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

        this.updatePlayerInfo();
        
        if (this.game.status === GameConstants.GAME_STATUS.FINISHED) {
            if (this.elements.newGameBtn) this.elements.newGameBtn.style.display = 'block';
            if (this.elements.surrenderBtn) this.elements.surrenderBtn.style.display = 'none';
        } else {
            if (this.elements.newGameBtn) this.elements.newGameBtn.style.display = 'none';
            if (this.elements.surrenderBtn) this.elements.surrenderBtn.style.display = 'block';
        }
    }
    
    getStatusText(status) {
        const statusMap = {
            [GameConstants.GAME_STATUS.SETUP]: 'Preparando',
            [GameConstants.GAME_STATUS.PLAYING]: 'En juego',
            [GameConstants.GAME_STATUS.FINISHED]: 'Terminado'
        };
        return statusMap[status] || 'Desconocido';
    }

    showGameOver(youWon = null) {
        // Multiplayer mode
        if (youWon !== null) {
            const message = youWon ?
                '🎉 ¡Felicidades! ¡Has ganado la batalla!' :
                '💀 ¡Has perdido! Mejor suerte la próxima vez';
            
            this.showMessage(message, youWon ? 'success' : 'error');
            
            if (this.elements.gameStatus) {
                this.elements.gameStatus.textContent = youWon ? '¡Victoria!' : 'Derrota';
            }
        } 
        // Local game mode
        else if (this.game && this.game.winner) {
            const message = this.game.winner === this.game.players[0] ?
                '¡Felicidades! ¡Has ganado!' :
                '¡Has perdido! Mejor suerte la próxima vez';
            
            this.showMessage(message, this.game.winner === this.game.players[0] ? 'success' : 'error');
        }
        
        // Show/hide buttons
        if (this.elements.newGameBtn) this.elements.newGameBtn.style.display = 'block';
        if (this.elements.surrenderBtn) this.elements.surrenderBtn.style.display = 'none';
    }

    surrender() {
        if (confirm('¿Estás seguro de que quieres rendirte?')) {
            this.showMessage('Te has rendido', 'error');
            this.gameManager.restartGame();
            this.showSetupScreen();
        }
    }

    newGame() {
        this.gameManager.restartGame();
        this.showSetupScreen();
    }

    showSetupScreen() {
        this.elements.gameScreen.style.display = 'none';
        document.getElementById('setup-screen').style.display = 'block';
        if (window.setupUI) {
            window.setupUI.initializeShipSetup();
        }
    }
}
