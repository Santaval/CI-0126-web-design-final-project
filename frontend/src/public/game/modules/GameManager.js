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
        this.isMultiplayer = true; // Always multiplayer now
        this.multiplayerManager = null; // Will be set externally
    }

    startGame(playerName = 'Jugador', opponentName = 'Oponente') {
        this.playerName = playerName;
        const humanPlayer = new Player(playerName);
        const opponentPlayer = new Player(opponentName);
        
        this.currentGame = new Game(humanPlayer, opponentPlayer);
        
        return this.currentGame;
    }

    placePlayerShips(shipPlacements) {
        if (!this.currentGame) {
            throw new Error('No hay juego actual');
        }
        
        this.currentGame.players[0].placeShips(shipPlacements);
        this.currentGame.startGame();
    }

    async makeMove(row, col) {
        if (!this.currentGame || this.currentGame.status !== GameConstants.GAME_STATUS.PLAYING) {
            throw new Error('El juego no está en progreso');
        }
        
        // In multiplayer, make API call
        if (this.multiplayerManager) {
            try {
                const response = await this.multiplayerManager.attack(row, col);
                
                // Convert API response to game result format
                const result = {
                    row,
                    col,
                    result: response.result,
                    sunkShip: response.sunkShip,
                    gameOver: response.gameOver,
                    winner: response.winner
                };
                
                // Update local game state
                this.updateLocalGameState(result);
                
                return result;
            } catch (error) {
                console.error('Error making move:', error);
                throw error;
            }
        }
        
        // Fallback to local game (shouldn't happen)
        return this.currentGame.makeMove(row, col);
    }

    updateLocalGameState(attackResult) {
        if (!this.currentGame) return;

        const opponent = this.currentGame.getOpponent();
        
        // Record the attack
        if (attackResult.result === GameConstants.ATTACK_RESULT.HIT || 
            attackResult.result === 'hit' || attackResult.result === 'sunk') {
            opponent.board.hits.push({
                row: attackResult.row,
                col: attackResult.col
            });
        } else if (attackResult.result === GameConstants.ATTACK_RESULT.MISS || 
                   attackResult.result === 'miss') {
            opponent.board.misses.push({
                row: attackResult.row,
                col: attackResult.col
            });
        }

        // Handle game over
        if (attackResult.gameOver) {
            this.currentGame.status = GameConstants.GAME_STATUS.FINISHED;
            this.currentGame.winner = attackResult.winner === this.multiplayerManager.playerNumber 
                ? this.currentGame.players[0] 
                : this.currentGame.players[1];
        }
    }

    updateOpponentMoves(opponentMoves) {
        if (!this.currentGame) return;

        const playerBoard = this.currentGame.players[0].board;
        
        // Clear existing hits and misses
        playerBoard.hits = [];
        playerBoard.misses = [];

        // Add all opponent moves
        for (const move of opponentMoves) {
            if (move.result === 'hit' || move.result === 'sunk') {
                playerBoard.hits.push({
                    row: move.row,
                    col: move.col
                });
            } else if (move.result === 'miss') {
                playerBoard.misses.push({
                    row: move.row,
                    col: move.col
                });
            }
        }
    }

    updateYourMoves(yourMoves) {
        if (!this.currentGame) return;

        const attackBoard = this.currentGame.players[0].attackBoard;
        
        // Clear existing hits and misses
        attackBoard.hits = [];
        attackBoard.misses = [];
        
        // Add all your moves to the attack board
        for (const move of yourMoves) {
            if (move.result === 'hit' || move.result === 'sunk') {
                attackBoard.hits.push({
                    row: move.row,
                    col: move.col
                });
                attackBoard.grid[move.row][move.col] = 'hit';
            } else if (move.result === 'miss') {
                attackBoard.misses.push({
                    row: move.row,
                    col: move.col
                });
                attackBoard.grid[move.row][move.col] = 'miss';
            }
        }
    }

    restartGame() {
        this.currentGame = null;
    }
}
