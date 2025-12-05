import { GameConstants } from './constants.js';

// =============================================
// GAME CLASS
// =============================================
export class Game {
    constructor(player1, player2) {
        this.players = [player1, player2];
        this.currentPlayerIndex = 0;
        this.status = GameConstants.GAME_STATUS.SETUP;
        this.winner = null;
        this.moveHistory = [];
        this.turnCounter = 0;
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
}
