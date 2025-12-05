import { GameConstants } from './constants.js';
import { Player } from './Player.js';
import { Game } from './Game.js';

// =============================================
// GAME MANAGER CLASS
// =============================================
export class GameManager {
    constructor() {
        this.currentGame = null;
        this.playerName = 'Jugador';
    }

    startGame(playerName = 'Jugador') {
        this.playerName = playerName;
        const humanPlayer = new Player(playerName);
        const computerPlayer = new Player('CPU', true);
        
        this.currentGame = new Game(humanPlayer, computerPlayer);
        
        // CPU places ships randomly
        computerPlayer.placeShipsRandomly();
        
        return this.currentGame;
    }

    placePlayerShips(shipPlacements) {
        if (!this.currentGame) {
            throw new Error('No hay juego actual');
        }
        
        this.currentGame.players[0].placeShips(shipPlacements);
        this.currentGame.startGame();
    }

    makeMove(row, col) {
        if (!this.currentGame || this.currentGame.status !== GameConstants.GAME_STATUS.PLAYING) {
            throw new Error('El juego no está en progreso');
        }
        
        const result = this.currentGame.makeMove(row, col);
        
        // If game isn't over and it's CPU's turn, make CPU move
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
        
        // Find a valid cell to attack
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
            const result = this.currentGame.makeMove(row, col);
            
            // Trigger UI update
            if (window.gameUI) {
                window.gameUI.updateGameState();
                window.gameUI.renderBoards();
                window.gameUI.showMessage(
                    window.gameUI.getAttackMessage(result),
                    result.result === GameConstants.ATTACK_RESULT.MISS ? 'info' : 'error'
                );
                
                if (result.gameOver) {
                    window.gameUI.showGameOver();
                }
            }
        }
    }

    restartGame() {
        this.currentGame = null;
    }
}
